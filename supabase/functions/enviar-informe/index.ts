import ExcelJS from "npm:exceljs@4.4.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function fmtCLP(valor) {
  const n = Number(valor) || 0;
  return "$" + n.toLocaleString("es-CL");
}

function fmtFecha(valor) {
  if (!valor) return "Sin fecha";
  const partes = String(valor).split("-");
  if (partes.length !== 3) return String(valor);
  return partes[2] + "-" + partes[1] + "-" + partes[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verificamos quien esta pidiendo el informe con su propio token.
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUser = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: errorUser } = await supabaseUser.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );

    if (errorUser || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { proyectoId } = await req.json();
    if (!proyectoId) {
      return new Response(JSON.stringify({ error: "Falta el proyecto" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente con permisos de servicio para leer datos y fotos.
    const db = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 2. Traemos el perfil, el proyecto y sus gastos.
    const [{ data: perfil }, { data: proyecto }, { data: gastos }] = await Promise.all([
      db.from("perfiles").select("nombre, correo_administrador").eq("user_id", user.id).single(),
      db.from("proyectos").select("*").eq("id", proyectoId).eq("owner_id", user.id).single(),
      db.from("gastos").select("*").eq("proyecto_id", proyectoId).eq("owner_id", user.id).order("fecha", { ascending: true }),
    ]);

    if (!proyecto) {
      return new Response(JSON.stringify({ error: "Proyecto no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const correoAdmin = perfil?.correo_administrador;
    if (!correoAdmin) {
      return new Response(
        JSON.stringify({
          error: "falta_correo_admin",
          mensaje: "Debes agregar un correo de administrador en tu perfil antes de enviar informes.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const lista = gastos || [];
    const totalGastado = lista.reduce((s, g) => s + (Number(g.monto) || 0), 0);

    // 3. Armamos el Excel.
    const libro = new ExcelJS.Workbook();
    libro.creator = "RendiFacil";
    libro.created = new Date();
    const hoja = libro.addWorksheet("Rendicion");

    hoja.columns = [
      { header: "Comercio", key: "comercio", width: 32 },
      { header: "Fecha", key: "fecha", width: 14 },
      { header: "Monto", key: "monto", width: 16 },
      { header: "Tipo de documento", key: "tipo", width: 20 },
      { header: "Estado", key: "estado", width: 14 },
      { header: "Boleta", key: "foto", width: 42 },
    ];

    // Encabezado con los datos del proyecto.
    hoja.spliceRows(1, 0,
      ["Informe de rendicion - " + (proyecto.nombre || "")],
      ["Cliente: " + (proyecto.cliente || "-")],
      ["Presupuesto: " + fmtCLP(proyecto.presupuesto)],
      ["Total gastado: " + fmtCLP(totalGastado)],
      ["Saldo disponible: " + fmtCLP((Number(proyecto.presupuesto) || 0) - totalGastado)],
      ["Generado por: " + (perfil?.nombre || user.email)],
      [],
    );

    hoja.getRow(1).font = { bold: true, size: 14 };
    const filaEncabezado = 8;
    hoja.getRow(filaEncabezado).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1B2A4A" },
    };
    hoja.getRow(filaEncabezado).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // 4. Una fila por gasto, con la foto incrustada.
    for (let i = 0; i < lista.length; i++) {
      const g = lista[i];
      const fila = hoja.addRow({
        comercio: g.comercio || "Sin identificar",
        fecha: fmtFecha(g.fecha),
        monto: Number(g.monto) || 0,
        tipo: g.tipo_documento || "-",
        estado: g.estado === "confirmado" ? "Confirmado" : "Diferido",
        foto: "",
      });
      fila.getCell("monto").numFmt = '"$"#,##0';
      fila.alignment = { vertical: "middle" };

      if (!g.foto_url) {
        fila.getCell("foto").value = "Sin foto";
        continue;
      }

      try {
        const { data: archivo } = await db.storage.from("boletas").download(g.foto_url);
        if (!archivo) {
          fila.getCell("foto").value = "Sin foto";
          continue;
        }
        const buffer = await archivo.arrayBuffer();
        const idImagen = libro.addImage({
          buffer: buffer,
          extension: "jpeg",
        });

        // La celda mide ~300x400 px: dejamos la imagen algo mas chica para que quepa dentro.
        fila.height = 300;
        hoja.addImage(idImagen, {
          tl: { col: 5.05, row: fila.number - 1 + 0.01 },
          ext: { width: 270, height: 310 },
        });
      } catch (_e) {
        fila.getCell("foto").value = "Sin foto";
      }
    }

    const bufferExcel = await libro.xlsx.writeBuffer();

    // 5. Convertimos a base64 para adjuntarlo al correo.
    const bytes = new Uint8Array(bufferExcel);
    let binario = "";
    const bloque = 8192;
    for (let i = 0; i < bytes.length; i += bloque) {
      binario += String.fromCharCode.apply(null, bytes.subarray(i, i + bloque));
    }
    const base64 = btoa(binario);

    const nombreArchivo = "Informe - " + (proyecto.nombre || "proyecto") + ".xlsx";

    // 6. Enviamos el correo a los dos destinatarios.
    const destinatarios = [user.email, correoAdmin].filter(Boolean);

    const cuerpoCorreo = [
      "<h2>Informe de rendicion</h2>",
      "<p><b>Proyecto:</b> " + (proyecto.nombre || "-") + "</p>",
      "<p><b>Cliente:</b> " + (proyecto.cliente || "-") + "</p>",
      "<p><b>Presupuesto:</b> " + fmtCLP(proyecto.presupuesto) + "</p>",
      "<p><b>Total gastado:</b> " + fmtCLP(totalGastado) + "</p>",
      "<p><b>Saldo disponible:</b> " + fmtCLP((Number(proyecto.presupuesto) || 0) - totalGastado) + "</p>",
      "<p><b>Gastos registrados:</b> " + lista.length + "</p>",
      "<p>Adjuntamos el detalle completo con las fotos de cada boleta.</p>",
      "<p>Enviado automaticamente por RendiFacil.</p>",
    ].join("");

    const respuestaResend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RendiFacil <noreply@rendifacil.cl>",
        to: destinatarios,
        subject: "Informe de rendicion - " + (proyecto.nombre || ""),
        html: cuerpoCorreo,
        attachments: [
          {
            filename: nombreArchivo,
            content: base64,
          },
        ],
      }),
    });

    const datosResend = await respuestaResend.json();

    if (!respuestaResend.ok) {
      console.error("Error de Resend:", JSON.stringify(datosResend));
      return new Response(
        JSON.stringify({ error: "No se pudo enviar el correo" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 7. Marcamos el proyecto como informado.
    await db
      .from("proyectos")
      .update({ informe_enviado_en: new Date().toISOString() })
      .eq("id", proyectoId);

    console.info("Informe enviado a: " + destinatarios.join(", "));

    return new Response(
      JSON.stringify({
        ok: true,
        enviadoA: destinatarios,
        archivo: base64,
        nombreArchivo: nombreArchivo,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error en enviar-informe:", error);
    return new Response(
      JSON.stringify({ error: "No se pudo generar el informe" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
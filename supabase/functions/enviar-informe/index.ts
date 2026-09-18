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

// Fecha de hoy en formato DD-MM-YYYY, para el nombre del archivo.
function fechaHoy() {
  const d = new Date();
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return dia + "-" + mes + "-" + d.getFullYear();
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

    // 2. Traemos el perfil, el proyecto, los gastos de ESTA rendicion y el
    //    total acumulado del proyecto.
    //    El filtro owner_id es la comprobacion de propiedad: con la service_role
    //    key el RLS no se aplica, asi que sin ese filtro cualquiera podria pedir
    //    el informe de un proyecto ajeno mandando su id.
    //    `informado_en is null` deja solo lo que todavia no se ha rendido.
    const [{ data: perfil }, { data: proyecto }, { data: gastos }, { data: todos }] =
      await Promise.all([
        db.from("perfiles").select("nombre, correo_administrador").eq("user_id", user.id).single(),
        db.from("proyectos").select("*").eq("id", proyectoId).eq("owner_id", user.id).single(),
        db.from("gastos").select("*")
          .eq("proyecto_id", proyectoId)
          .eq("owner_id", user.id)
          .is("informado_en", null)
          .order("fecha", { ascending: true }),
        db.from("gastos").select("monto")
          .eq("proyecto_id", proyectoId)
          .eq("owner_id", user.id),
      ]);

    if (!proyecto) {
      return new Response(JSON.stringify({ error: "Proyecto no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const correoAdmin = perfil?.correo_administrador;
    if (!correoAdmin) {
      // Se responde con 200 a proposito: supabase.functions.invoke trata
      // cualquier codigo distinto de 200 como error de red y no le entrega el
      // cuerpo a la app, asi que el mensaje nunca llegaria a la pantalla.
      // Los errores reales (401, 404) si conservan su codigo.
      return new Response(
        JSON.stringify({
          ok: false,
          error: "falta_correo_admin",
          mensaje: "Debes agregar un correo de administrador en tu perfil antes de enviar informes.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const lista = gastos || [];

    // 3. Sin gastos nuevos no hay nada que rendir: avisamos en vez de mandar
    //    un Excel vacio al administrador.
    if (lista.length === 0) {
      // Mismo motivo que arriba: 200 para que la app pueda leer el mensaje.
      return new Response(
        JSON.stringify({
          ok: false,
          error: "sin_gastos_nuevos",
          mensaje: "No hay boletas nuevas por rendir. Registra al menos una antes de enviar el informe.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const totalRendicion = lista.reduce((s, g) => s + (Number(g.monto) || 0), 0);
    const totalAcumulado = (todos || []).reduce((s, g) => s + (Number(g.monto) || 0), 0);
    const presupuesto = Number(proyecto.presupuesto) || 0;
    const saldoDisponible = presupuesto - totalAcumulado;

    // 4. Armamos el Excel.
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

    // Encabezado con los datos del proyecto. Son 8 filas (7 de texto + 1 vacia),
    // asi que la fila de titulos de columna queda en la 9.
    hoja.spliceRows(1, 0,
      ["Informe de rendicion - " + (proyecto.nombre || "")],
      ["Cliente: " + (proyecto.cliente || "-")],
      ["Presupuesto: " + fmtCLP(presupuesto)],
      ["Total de esta rendicion: " + fmtCLP(totalRendicion) + "  (" + lista.length + " boletas)"],
      ["Total gastado acumulado: " + fmtCLP(totalAcumulado)],
      ["Saldo disponible: " + fmtCLP(saldoDisponible)],
      ["Generado por: " + (perfil?.nombre || user.email) + "  -  " + fechaHoy()],
      [],
    );

    hoja.getRow(1).font = { bold: true, size: 14 };
    hoja.getRow(4).font = { bold: true };
    const filaEncabezado = 9;
    hoja.getRow(filaEncabezado).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1B2A4A" },
    };
    hoja.getRow(filaEncabezado).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // 5. Una fila por gasto, con la foto incrustada.
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

    // 6. Convertimos a base64 para adjuntarlo al correo.
    const bytes = new Uint8Array(bufferExcel);
    let binario = "";
    const bloque = 8192;
    for (let i = 0; i < bytes.length; i += bloque) {
      binario += String.fromCharCode.apply(null, bytes.subarray(i, i + bloque));
    }
    const base64 = btoa(binario);

    // La fecha en el nombre evita que una rendicion pise a la anterior en el correo.
    const nombreArchivo = "Informe - " + (proyecto.nombre || "proyecto") + " - " + fechaHoy() + ".xlsx";

    // 7. Enviamos el correo a los dos destinatarios.
    const destinatarios = [user.email, correoAdmin].filter(Boolean);

    const cuerpoCorreo = [
      "<h2>Informe de rendicion</h2>",
      "<p><b>Proyecto:</b> " + (proyecto.nombre || "-") + "</p>",
      "<p><b>Cliente:</b> " + (proyecto.cliente || "-") + "</p>",
      "<p><b>Presupuesto:</b> " + fmtCLP(presupuesto) + "</p>",
      "<p><b>Total de esta rendicion:</b> " + fmtCLP(totalRendicion) + " (" + lista.length + " boletas)</p>",
      "<p><b>Total gastado acumulado:</b> " + fmtCLP(totalAcumulado) + "</p>",
      "<p><b>Saldo disponible:</b> " + fmtCLP(saldoDisponible) + "</p>",
      "<p>Adjuntamos el detalle de esta rendicion con las fotos de cada boleta.</p>",
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
        subject: "Informe de rendicion - " + (proyecto.nombre || "") + " - " + fechaHoy(),
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

    // 8. Recien ahora que el correo salio, marcamos como rendidos SOLO los gastos
    //    que fueron en este informe. Quedan congelados: no se pueden editar ni
    //    borrar. Los que se registren despues nacen libres otra vez.
    const ahora = new Date().toISOString();
    const idsRendidos = lista.map((g) => g.id);

    await db
      .from("gastos")
      .update({ informado_en: ahora })
      .in("id", idsRendidos);

    // Guardamos ademas la fecha del ultimo informe en el proyecto.
    // Repetimos el filtro de propiedad para que la consulta se defienda sola.
    await db
      .from("proyectos")
      .update({ informe_enviado_en: ahora })
      .eq("id", proyectoId)
      .eq("owner_id", user.id);

    console.info(
      "Informe enviado a: " + destinatarios.join(", ") +
        " — boletas rendidas: " + idsRendidos.length,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        enviadoA: destinatarios,
        archivo: base64,
        nombreArchivo: nombreArchivo,
        boletasRendidas: idsRendidos.length,
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

import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const MODELO = "gemini-3.6-flash";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  MODELO +
  ":generateContent?key=" +
  GEMINI_API_KEY;

const MAX_INTENTOS = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROMPT = [
  "Eres un asistente que lee boletas y facturas chilenas. Analiza la imagen y devuelve SOLO un JSON valido, sin texto adicional y sin markdown, con esta estructura exacta:",
  '{"monto": 0, "comercio": "", "fecha": "YYYY-MM-DD", "hora": "HH:MM:SS", "tipo_documento": "", "folio": "", "rut_emisor": ""}',
  "",
  "Donde:",
  "- monto: numero entero del total en pesos chilenos, sin puntos ni simbolos.",
  "- comercio: nombre del comercio o negocio.",
  "- fecha: formato YYYY-MM-DD.",
  "- hora: la hora impresa en la boleta, formato HH:MM:SS de 24 horas. Si solo aparecen hora y minutos, usa 00 en los segundos. Si no hay hora impresa, devuelve null.",
  "- tipo_documento: boleta o factura.",
  "- folio: el identificador unico del documento. SOLO devuelvelo si aparece junto a una de estas etiquetas: Folio, Recibo N, N de operacion, Comprobante, Nro, Numero. Copialo completo tal cual esta impreso, puede tener letras, numeros y guiones (por ejemplo MT7MZNNT-71156).",
  "- REGLA IMPORTANTE DEL FOLIO: si no encuentras ninguna de esas etiquetas, devuelve null. NO uses numeros sueltos, codigos de autorizacion, numeros de tarjeta, ni cualquier otro numero que veas en el papel. Es preferible devolver null antes que un numero equivocado.",
  "- rut_emisor: el RUT del comercio que emite el documento. Copia digito por digito con maxima atencion, incluyendo el digito verificador final. Un solo digito mal leido invalida el dato.",
  "",
  "Si no puedes leer algun dato con certeza, usa null en ese campo. No inventes datos, especialmente el folio y el RUT.",
].join("\n");

function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function limpiarMonto(valor) {
  if (typeof valor === "number" && isFinite(valor)) return Math.round(valor);
  if (typeof valor === "string") {
    const soloDigitos = valor.replace(/[^0-9]/g, "");
    if (soloDigitos.length > 0) return parseInt(soloDigitos, 10);
  }
  return null;
}

function limpiarTexto(valor) {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio.length > 0 ? limpio : null;
}

function limpiarFecha(valor) {
  if (typeof valor !== "string") return null;
  const partes = valor.trim().split("-");
  if (partes.length !== 3) return null;
  const mes = partes[1].padStart(2, "0");
  const dia = partes[2].padStart(2, "0");
  if (!/^\d{2}$/.test(mes) || !/^\d{2}$/.test(dia)) return null;
  if (parseInt(mes, 10) < 1 || parseInt(mes, 10) > 12) return null;
  if (parseInt(dia, 10) < 1 || parseInt(dia, 10) > 31) return null;
  return new Date().getFullYear() + "-" + mes + "-" + dia;
}

// Acepta la hora solo si viene en formato valido. Admite HH:MM y le agrega los segundos.
function limpiarHora(valor) {
  if (typeof valor !== "string") return null;
  const partes = valor.trim().split(":");
  if (partes.length < 2 || partes.length > 3) return null;
  const hh = partes[0].padStart(2, "0");
  const mm = partes[1].padStart(2, "0");
  const ss = (partes[2] || "00").padStart(2, "0");
  if (!/^\d{2}$/.test(hh) || !/^\d{2}$/.test(mm) || !/^\d{2}$/.test(ss)) return null;
  if (parseInt(hh, 10) > 23 || parseInt(mm, 10) > 59 || parseInt(ss, 10) > 59) return null;
  return hh + ":" + mm + ":" + ss;
}

function limpiarTipo(valor) {
  const texto = limpiarTexto(valor);
  if (!texto) return null;
  const min = texto.toLowerCase();
  if (min.includes("factura")) return "factura";
  if (min.includes("boleta")) return "boleta";
  return null;
}

// Calcula el digito verificador de un RUT chileno (modulo 11).
function digitoVerificador(cuerpo) {
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

// Solo acepta el RUT si el digito verificador calza. Asi descartamos lecturas erroneas del OCR.
function limpiarRut(valor) {
  if (valor === null || valor === undefined) return null;
  const bruto = String(valor).toUpperCase().replace(/[^0-9K]/g, "");
  if (bruto.length < 8 || bruto.length > 9) return null;

  const cuerpo = bruto.slice(0, -1);
  const dv = bruto.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return null;

  if (digitoVerificador(cuerpo) !== dv) {
    console.warn("RUT descartado por digito verificador invalido: " + bruto);
    return null;
  }
  return bruto;
}

function limpiarFolio(valor) {
  if (valor === null || valor === undefined) return null;
  const bruto = String(valor).toUpperCase().replace(/[^0-9A-Z]/g, "");
  const sinCeros = bruto.replace(/^0+/, "");
  if (sinCeros.length < 4) return null;
  return sinCeros;
}

async function llamarGemini(base64Limpio) {
  let ultimaData = null;

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    const respuesta = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Limpio,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    });

    const data = await respuesta.json();

    if (respuesta.ok) return { ok: true, data };

    ultimaData = data;
    const recuperable = respuesta.status === 429 || respuesta.status === 503;

    console.error(
      "Gemini fallo (intento " +
        intento +
        "/" +
        MAX_INTENTOS +
        ", status " +
        respuesta.status +
        "): " +
        JSON.stringify(data),
    );

    if (!recuperable || intento === MAX_INTENTOS) break;

    await esperar(intento * 1000);
  }

  return { ok: false, data: ultimaData };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Cada lectura consume cuota de Gemini, asi que solo la puede pedir un usuario
    // autenticado. Se valida el token ANTES de tocar la imagen o llamar a Gemini.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const db = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: { user }, error: errorUser } = await db.auth.getUser(token);

    if (errorUser || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imagenBase64 } = await req.json();

    if (!imagenBase64) {
      return new Response(JSON.stringify({ error: "Falta la imagen" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const base64Limpio = imagenBase64.includes(",")
      ? imagenBase64.split(",")[1]
      : imagenBase64;

    const pesoKb = Math.round((base64Limpio.length * 3) / 4 / 1024);
    const inicio = Date.now();

    const respuesta = await llamarGemini(base64Limpio);

    console.info(
      "Usuario: " + user.id + " — Imagen: " + pesoKb + " KB — Gemini tardo: " +
        (Date.now() - inicio) + " ms",
    );

    if (!respuesta.ok) {
      return new Response(
        JSON.stringify({
          error:
            "El lector no esta disponible en este momento. Ingresa los datos a mano o intenta de nuevo en unos segundos.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const textoRespuesta =
      respuesta.data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textoRespuesta) {
      console.error("Respuesta sin texto:", JSON.stringify(respuesta.data));
      return new Response(
        JSON.stringify({ error: "No se pudo leer la boleta. Ingresa los datos a mano." }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let crudo;
    try {
      crudo = JSON.parse(textoRespuesta);
    } catch (_e) {
      console.error("JSON invalido de Gemini: " + textoRespuesta);
      return new Response(
        JSON.stringify({ error: "No se pudo leer la boleta. Ingresa los datos a mano." }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const resultado = {
      monto: limpiarMonto(crudo.monto),
      comercio: limpiarTexto(crudo.comercio),
      fecha: limpiarFecha(crudo.fecha),
      hora: limpiarHora(crudo.hora),
      tipo_documento: limpiarTipo(crudo.tipo_documento),
      folio: limpiarFolio(crudo.folio),
      rut_emisor: limpiarRut(crudo.rut_emisor),
    };

    console.info("Resultado: " + JSON.stringify(resultado));

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error en la funcion:", error);
    return new Response(
      JSON.stringify({ error: "No se pudo procesar la boleta" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

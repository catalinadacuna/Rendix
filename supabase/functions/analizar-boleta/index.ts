import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Responde a la verificación previa del navegador (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imagenBase64 } = await req.json();

    if (!imagenBase64) {
      return new Response(JSON.stringify({ error: 'Falta la imagen' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Quitamos el prefijo "data:image/jpeg;base64," si viene incluido
    const base64Limpio = imagenBase64.includes(',') ? imagenBase64.split(',')[1] : imagenBase64;

    const prompt = `Eres un asistente que lee boletas y facturas chilenas. Analiza la imagen y devuelve SOLO un JSON válido (sin texto adicional, sin markdown) con esta estructura exacta:
{
  "monto": <número entero, el monto total en pesos chilenos, sin puntos ni símbolos>,
  "comercio": "<nombre del comercio o negocio>",
  "fecha": "<fecha en formato YYYY-MM-DD>",
  "tipo_documento": "<boleta o factura>"
}
Si no puedes leer algún dato con certeza, usa null en ese campo. No inventes datos.`;

    const geminiResponse = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Limpio } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
      }),
    });

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error('Error de Gemini:', data);
      return new Response(JSON.stringify({ error: 'Error al analizar la imagen' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const textoRespuesta = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const resultado = JSON.parse(textoRespuesta);

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en la función:', error);
    return new Response(JSON.stringify({ error: 'No se pudo procesar la boleta' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
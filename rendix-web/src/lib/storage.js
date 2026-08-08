import { supabase } from './supabaseClient';

// Convierte un data URL (base64) del navegador en un Blob que Supabase Storage acepta.
function dataUrlABlob(dataUrl) {
  const [meta, data] = dataUrl.split(',');
  const tipo = /data:(.*?);/.exec(meta)?.[1] || 'image/jpeg';
  const bytes = atob(data);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return new Blob([buffer], { type: tipo });
}

// Sube la foto de una boleta al bucket "boletas" y devuelve la ruta interna
// (no la URL — la URL se genera on-demand porque el bucket es privado).
export async function subirFotoBoleta(dataUrl) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const blob = dataUrlABlob(dataUrl);
  const extension = blob.type.split('/')[1] || 'jpg';
  const nombreArchivo = `${user.id}/gasto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error } = await supabase.storage.from('boletas').upload(nombreArchivo, blob, {
    contentType: blob.type,
  });
  if (error) return null;
  return nombreArchivo; // Guardamos la ruta, no la URL
}

// Sube la foto de perfil al bucket "avatares". Reemplaza la anterior si existía.
export async function subirAvatar(dataUrl) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const blob = dataUrlABlob(dataUrl);
  const extension = blob.type.split('/')[1] || 'jpg';
  const nombreArchivo = `${user.id}/avatar.${extension}`;

  const { error } = await supabase.storage.from('avatares').upload(nombreArchivo, blob, {
    contentType: blob.type,
    upsert: true, // Sobreescribe si ya existe
  });
  if (error) return null;
  return nombreArchivo;
}

// Genera una URL temporal para mostrar la foto (válida por 1 hora).
// Como los buckets son privados, no se puede acceder con una URL fija.
export async function urlTemporal(bucket, ruta) {
  if (!ruta) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(ruta, 60 * 60); // 1 hora
  if (error) return null;
  return data.signedUrl;
}

// Elimina todas las fotos de un proyecto (llamado cuando se borra definitivamente).
export async function eliminarFotosDeProyecto(rutas) {
  if (!rutas || rutas.length === 0) return;
  await supabase.storage.from('boletas').remove(rutas);
}
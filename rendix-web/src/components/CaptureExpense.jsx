import { useRef, useEffect, useState } from 'react';
import { X, Camera, FileText, Calendar, Clock, DollarSign, Building2, Sparkles, AlertTriangle } from 'lucide-react';
import { useRendix } from '../context/RendixContext';
import { inputStyle, primaryButtonStyle, fmtDate } from '../theme';
import { subirFotoBoleta } from '../lib/storage';
import { supabase } from '../lib/supabaseClient';

export const CaptureExpense = ({ onClose, proyecto }) => {
  const { t, addGasto, buscarGastoDuplicado, buscarGastoSimilar, proyectos } = useRendix();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [fotoDataUrl, setFotoDataUrl] = useState(null);
  const [monto, setMonto] = useState('');
  const [comercio, setComercio] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState('Boleta');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [ocrCompleto, setOcrCompleto] = useState(false);

  // Datos que identifican la boleta de forma única (para detectar repetidas).
  const [folio, setFolio] = useState(null);
  const [rutEmisor, setRutEmisor] = useState(null);
  const [hora, setHora] = useState(null);
  const [duplicado, setDuplicado] = useState(null); // bloquea: misma boleta confirmada
  const [similar, setSimilar] = useState(null);     // solo advierte: mismo monto/comercio/fecha/hora

  // Guardamos si el usuario ya tocó cada campo, para no pisar lo que escribió a mano.
  const camposTocados = useRef({ monto: false, comercio: false, fecha: false, tipo: false });

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => console.error('Error al acceder a la cámara: ', err));

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const analizarConIA = async (dataUrl) => {
    setAnalizando(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analizar-boleta', {
        body: { imagenBase64: dataUrl },
      });

      if (!fnError && data && !data.error) {
        // Solo rellenamos los campos que el usuario todavía no tocó a mano.
        if (data.monto && !camposTocados.current.monto) setMonto(String(data.monto));
        if (data.comercio && !camposTocados.current.comercio) setComercio(data.comercio);
        if (data.fecha && !camposTocados.current.fecha) setFecha(data.fecha);
        if (!camposTocados.current.tipo) {
          // Si el OCR no lo determina, dejamos "Boleta" que es lo mas comun.
          setTipo(data.tipo_documento === 'factura' ? 'Factura' : 'Boleta');
        }

        setFolio(data.folio || null);
        setRutEmisor(data.rut_emisor || null);
        setHora(data.hora || null);
        setOcrCompleto(true);

        if (data.folio && data.rut_emisor) {
          // Caso ideal: la boleta trae folio y RUT, podemos confirmar si es la misma.
          const repetida = await buscarGastoDuplicado(data.folio, data.rut_emisor);
          if (repetida) setDuplicado(repetida);
        } else if (data.monto && data.comercio && data.fecha) {
          // Boletas sin folio (terminales de pago): solo podemos advertir.
          const parecido = await buscarGastoSimilar(data.monto, data.comercio, data.fecha, data.hora);
          if (parecido) setSimilar(parecido);
        }
      }
    } catch (err) {
      console.error('No se pudo analizar la boleta automáticamente:', err);
      // Si falla, simplemente el usuario completa todo a mano — no bloqueamos nada.
    } finally {
      setAnalizando(false);
    }
  };

  const handleTakePhoto = () => {
    const video = videoRef.current;
    let capturada = null;
    if (video && video.videoWidth > 0) {
      // Reducimos la foto antes de enviarla: a resolucion completa pesa varios MB
      // y viaja dos veces (al servidor y a Google). A 1600px la boleta sigue legible.
      const escala = Math.min(1, 1600 / video.videoWidth);
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * escala);
      canvas.height = Math.round(video.videoHeight * escala);
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      capturada = canvas.toDataURL('image/jpeg', 0.7);
      setFotoDataUrl(capturada);
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    setPhotoTaken(true);

    if (capturada) analizarConIA(capturada);
  };

  const handleSave = async () => {
    if (duplicado) return;
    if (!monto || Number(monto) <= 0) {
      setError('Ingresa un monto válido antes de guardar');
      return;
    }
    setGuardando(true);
    const rutaFoto = fotoDataUrl ? await subirFotoBoleta(fotoDataUrl) : null;
    const resultado = await addGasto({
      proyectoId: proyecto.id,
      monto,
      comercio,
      fecha,
      tipo_documento: tipo.toLowerCase(),
      fotoUrl: rutaFoto,
      folio,
      rutEmisor,
      hora,
    });
    setGuardando(false);

    // Red de seguridad: si la base rechazó el gasto por repetido, avisamos igual.
    if (resultado && resultado.duplicado) {
      setDuplicado({ id: null });
      return;
    }
    onClose();
  };

  const nombreProyectoDe = (gasto) => {
    if (!gasto?.proyectoId) return null;
    return proyectos.find((p) => p.id === gasto.proyectoId)?.nombre || null;
  };

  const proyectoDuplicado = nombreProyectoDe(duplicado);
  const proyectoSimilar = nombreProyectoDe(similar);

  if (photoTaken) {
    return (
      <div
        className="absolute inset-0 z-50 flex items-center justify-center px-5"
        style={{ backgroundColor: t.bg }}
      >
        <div
          className="w-full rounded-3xl p-6 flex flex-col gap-3 overflow-y-auto"
          style={{ backgroundColor: t.surface, boxShadow: '0 10px 25px rgba(0,0,0,0.15)', maxHeight: '92%' }}
        >
          <h2 className="text-[15.5px] font-bold text-center mb-1" style={{ color: t.text }}>Detalles del gasto</h2>

          {duplicado && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mb-1" style={{ backgroundColor: t.redSoft }}>
              <AlertTriangle size={15} color={t.red} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div className="text-[12.5px] font-bold" style={{ color: t.red }}>Esta boleta ya fue registrada</div>
                <div className="text-[11.5px] mt-0.5" style={{ color: t.red }}>
                  {proyectoDuplicado
                    ? `Ya existe en el proyecto "${proyectoDuplicado}". No se puede subir dos veces.`
                    : 'No se puede subir la misma boleta dos veces.'}
                </div>
              </div>
            </div>
          )}

          {similar && !duplicado && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mb-1" style={{ backgroundColor: t.amberSoft }}>
              <AlertTriangle size={15} color={t.amber} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div className="text-[12.5px] font-bold" style={{ color: t.amber }}>Posible boleta repetida</div>
                <div className="text-[11.5px] mt-0.5" style={{ color: t.amber }}>
                  Ya registraste un gasto por el mismo monto en {similar.comercio || 'este comercio'}
                  {similar.fecha ? ` el ${fmtDate(similar.fecha)}` : ''}
                  {proyectoSimilar ? ` (proyecto "${proyectoSimilar}")` : ''}. Si es otra compra distinta, puedes guardarla igual.
                </div>
              </div>
            </div>
          )}

          {analizando && !duplicado && (
            <div className="flex items-center justify-center gap-2 rounded-xl py-2.5 mb-1" style={{ backgroundColor: t.tealSoft }}>
              <Sparkles size={14} color={t.teal} className="animate-pulse" />
              <span className="text-[12.5px] font-semibold" style={{ color: t.teal }}>Leyendo la boleta automáticamente...</span>
            </div>
          )}
          {ocrCompleto && !analizando && !duplicado && !similar && (
            <div className="flex items-center justify-center gap-2 rounded-xl py-2.5 mb-1" style={{ backgroundColor: t.tealSoft }}>
              <Sparkles size={14} color={t.teal} />
              <span className="text-[12.5px] font-semibold" style={{ color: t.teal }}>Datos completados. Revisa antes de guardar.</span>
            </div>
          )}

          <label className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: t.gray }}>
            <DollarSign size={13} /> Monto
          </label>
          <input
            style={inputStyle(t, error ? 'low' : 'default')}
            type="number"
            placeholder="0"
            value={monto}
            onChange={(e) => { setMonto(e.target.value); setError(''); camposTocados.current.monto = true; }}
          />

          <label className="text-[12px] font-semibold flex items-center gap-1.5 mt-1" style={{ color: t.gray }}>
            <Building2 size={13} /> Comercio
          </label>
          <input
            style={inputStyle(t)}
            type="text"
            placeholder="Nombre del comercio"
            value={comercio}
            onChange={(e) => { setComercio(e.target.value); camposTocados.current.comercio = true; }}
          />

          <label className="text-[12px] font-semibold flex items-center gap-1.5 mt-1" style={{ color: t.gray }}>
            <Calendar size={13} /> Fecha
          </label>
          <input
            style={inputStyle(t)}
            type="date"
            value={fecha}
            onChange={(e) => { setFecha(e.target.value); camposTocados.current.fecha = true; }}
          />

          <label className="text-[12px] font-semibold flex items-center gap-1.5 mt-1" style={{ color: t.gray }}>
            <Clock size={13} /> Hora
          </label>
          <input
            style={inputStyle(t)}
            type="time"
            step="1"
            value={hora || ''}
            onChange={(e) => setHora(e.target.value || null)}
          />

          <label className="text-[12px] font-semibold flex items-center gap-1.5 mt-1" style={{ color: t.gray }}>
            <FileText size={13} /> Tipo de documento
          </label>
          <select
            style={inputStyle(t)}
            value={tipo}
            onChange={(e) => { setTipo(e.target.value); camposTocados.current.tipo = true; }}
          >
            <option value="Boleta">Boleta</option>
            <option value="Factura">Factura</option>
          </select>

          <label className="text-[12px] font-semibold flex items-center gap-1.5 mt-1" style={{ color: t.gray }}>
            <FileText size={13} /> Folio / N° de documento
          </label>
          <input
            style={inputStyle(t)}
            type="text"
            placeholder="No detectado"
            value={folio || ''}
            onChange={(e) => setFolio(e.target.value.trim() || null)}
          />

          <label className="text-[12px] font-semibold flex items-center gap-1.5 mt-1" style={{ color: t.gray }}>
            <Building2 size={13} /> RUT del emisor
          </label>
          <input
            style={inputStyle(t)}
            type="text"
            placeholder="No detectado"
            value={rutEmisor || ''}
            onChange={(e) => setRutEmisor(e.target.value.replace(/[^0-9kK]/g, '').toUpperCase() || null)}
          />

          {error && <div className="text-[12.5px] font-medium" style={{ color: t.red }}>{error}</div>}

          {!duplicado && (
            <button
              onClick={handleSave}
              disabled={guardando || analizando}
              style={{ ...primaryButtonStyle(t, !guardando && !analizando), marginTop: 8 }}
            >
              {guardando ? 'Guardando...' : analizando ? 'Leyendo boleta...' : (similar ? 'Guardar de todas formas' : 'Guardar gasto')}
            </button>
          )}

          <button
            onClick={onClose}
            className="text-[13px] font-semibold text-center mt-1"
            style={{ color: duplicado ? t.teal : t.gray }}
          >
            {duplicado ? 'Entendido, cerrar' : 'Cancelar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ backgroundColor: '#000' }}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full"
        style={{ backgroundColor: '#ffffff33', color: '#fff' }}
        aria-label="Cerrar"
      >
        <X size={20} />
      </button>

      <div className="flex-1 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div className="p-6 flex justify-center" style={{ backgroundColor: '#000' }}>
        <button
          onClick={handleTakePhoto}
          className="flex items-center justify-center rounded-full"
          style={{
            width: 68,
            height: 68,
            backgroundColor: '#fff',
            border: '4px solid #ffffff55',
          }}
          aria-label="Tomar foto"
        >
          <Camera size={26} color={t.navy} />
        </button>
      </div>
    </div>
  );
};
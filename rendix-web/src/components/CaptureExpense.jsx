import { useRef, useEffect, useState } from 'react';
import { X, Camera, FileText, Calendar, DollarSign, Building2, Sparkles } from 'lucide-react';
import { useRendix } from '../context/RendixContext';
import { inputStyle, primaryButtonStyle } from '../theme';
import { subirFotoBoleta } from '../lib/storage';
import { supabase } from '../lib/supabaseClient';

export const CaptureExpense = ({ onClose, proyecto }) => {
  const { t, addGasto } = useRendix();
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
        if (data.tipo_documento && !camposTocados.current.tipo) {
          setTipo(data.tipo_documento === 'factura' ? 'Factura' : 'Boleta');
        }
        setOcrCompleto(true);
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
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      capturada = canvas.toDataURL('image/jpeg', 0.85);
      setFotoDataUrl(capturada);
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    setPhotoTaken(true);

    // Lanzamos el análisis en cuanto tenemos la foto, en paralelo a que el usuario mire la pantalla.
    if (capturada) analizarConIA(capturada);
  };

  const handleSave = async () => {
    if (!monto || Number(monto) <= 0) {
      setError('Ingresa un monto válido antes de guardar');
      return;
    }
    setGuardando(true);
    const rutaFoto = fotoDataUrl ? await subirFotoBoleta(fotoDataUrl) : null;
    await addGasto({
      proyectoId: proyecto.id,
      monto,
      comercio,
      fecha,
      tipo_documento: tipo.toLowerCase(),
      fotoUrl: rutaFoto,
    });
    setGuardando(false);
    onClose();
  };

  if (photoTaken) {
    return (
      <div
        className="absolute inset-0 z-50 flex items-center justify-center px-5"
        style={{ backgroundColor: t.bg }}
      >
        <div
          className="w-full rounded-3xl p-6 flex flex-col gap-3"
          style={{ backgroundColor: t.surface, boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}
        >
          <h2 className="text-[15.5px] font-bold text-center mb-1" style={{ color: t.text }}>Detalles del gasto</h2>

          {analizando && (
            <div className="flex items-center justify-center gap-2 rounded-xl py-2.5 mb-1" style={{ backgroundColor: t.tealSoft }}>
              <Sparkles size={14} color={t.teal} className="animate-pulse" />
              <span className="text-[12.5px] font-semibold" style={{ color: t.teal }}>Leyendo la boleta automáticamente...</span>
            </div>
          )}
          {ocrCompleto && !analizando && (
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

          {error && <div className="text-[12.5px] font-medium" style={{ color: t.red }}>{error}</div>}

          <button
            onClick={handleSave}
            disabled={guardando}
            style={{ ...primaryButtonStyle(t, !guardando), marginTop: 8 }}
          >
            {guardando ? 'Guardando...' : 'Guardar gasto'}
          </button>

          <button
            onClick={onClose}
            className="text-[13px] font-semibold text-center mt-1"
            style={{ color: t.gray }}
          >
            Cancelar
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
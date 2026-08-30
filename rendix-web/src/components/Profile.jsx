import { useRef, useState, useEffect } from 'react';
import { LogOut, Moon, Sun, Camera, Image as ImageIcon, Trash2, Mail, Check } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';
import { useRendix } from '../context/RendixContext';
import { BottomNav } from './shared';
import { inputStyle } from '../theme';
import { subirAvatar, urlTemporal } from '../lib/storage';
import { supabase } from '../lib/supabaseClient';

const Profile = ({ user, onLogout, project, projects, onBack, go }) => {
  const { t, dark, setDark, avatar, setAvatar, correoAdmin, guardarCorreoAdmin } = useRendix();
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [correoInput, setCorreoInput] = useState('');
  const [guardandoCorreo, setGuardandoCorreo] = useState(false);
  const [correoGuardado, setCorreoGuardado] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Cuando cambia el avatar (la ruta guardada), generamos una URL temporal para mostrarlo.
  useEffect(() => {
    if (!avatar) {
      setAvatarUrl(null);
      return;
    }
    // Si es una URL completa o un data URL viejo, usarla directamente.
    if (avatar.startsWith('http') || avatar.startsWith('data:')) {
      setAvatarUrl(avatar);
      return;
    }
    // Si es una ruta interna del bucket, pedirle a Supabase una URL firmada.
    urlTemporal('avatares', avatar).then(setAvatarUrl);
  }, [avatar]);

  // Cargamos el correo guardado en el campo editable.
  useEffect(() => {
    setCorreoInput(correoAdmin || '');
  }, [correoAdmin]);

  const handleGuardarCorreo = async () => {
    setGuardandoCorreo(true);
    const ok = await guardarCorreoAdmin(correoInput);
    setGuardandoCorreo(false);
    if (ok) {
      setCorreoGuardado(true);
      setTimeout(() => setCorreoGuardado(false), 2500);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAvatarOptions(false);
    setSubiendo(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const ruta = await subirAvatar(reader.result);
      if (ruta) setAvatar(ruta);
      setSubiendo(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleQuitarFoto = async () => {
    if (avatar && !avatar.startsWith('http') && !avatar.startsWith('data:')) {
      await supabase.storage.from('avatares').remove([avatar]);
    }
    setAvatar(null);
    setShowAvatarOptions(false);
  };

  const hayCambios = (correoInput || '').trim() !== (correoAdmin || '').trim();

  return (
    <PhoneFrame>
      <div className="flex-1 flex flex-col" style={{ backgroundColor: t.bg }}>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex items-center mb-6">
            <button onClick={onBack} className="p-1 -ml-1 rounded-full" style={{ color: t.text }} aria-label="Volver">
              &lt;
            </button>
            <h2 className="flex-1 text-center text-[15px] font-semibold" style={{ color: t.text }}>Perfil</h2>
            <div style={{ width: 24 }} />
          </div>

          {/* Info usuario */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setShowAvatarOptions(true)}
              disabled={subiendo}
              className="relative flex items-center justify-center rounded-full text-white font-bold text-[18px] shrink-0"
              style={{
                width: 52,
                height: 52,
                background: avatarUrl ? undefined : `linear-gradient(155deg, ${t.teal}, ${t.navy})`,
                overflow: 'hidden',
                opacity: subiendo ? 0.6 : 1,
              }}
              aria-label="Cambiar foto de perfil"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                (user?.name || 'U')[0].toUpperCase()
              )}
              <div
                className="absolute bottom-0 right-0 flex items-center justify-center rounded-full"
                style={{ width: 18, height: 18, backgroundColor: t.teal, border: `2px solid ${t.bg}` }}
              >
                <Camera size={9} color="#fff" />
              </div>
            </button>
            <div>
              <div className="text-[15px] font-semibold" style={{ color: t.text }}>
                Usuario: {user?.name || 'Sin nombre'}
              </div>
            </div>
          </div>

          {/* Correo del administrador */}
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Mail size={14} color={t.teal} />
              <span className="text-[13px] font-semibold" style={{ color: t.text }}>Correo del administrador</span>
            </div>
            <p className="text-[11.5px] mb-2.5" style={{ color: t.gray }}>
              Ahí llegan los informes que envías desde cada proyecto.
            </p>
            <input
              style={{ ...inputStyle(t), marginBottom: 10 }}
              type="email"
              placeholder="jefe@empresa.cl"
              value={correoInput}
              onChange={(e) => setCorreoInput(e.target.value)}
            />
            <button
              onClick={handleGuardarCorreo}
              disabled={guardandoCorreo || !hayCambios}
              className="w-full py-2.5 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-1.5"
              style={{
                backgroundColor: correoGuardado ? t.tealSoft : t.teal,
                color: correoGuardado ? t.teal : '#fff',
                opacity: !hayCambios && !correoGuardado ? 0.45 : 1,
              }}
            >
              {correoGuardado ? (
                <>
                  <Check size={14} /> Correo guardado
                </>
              ) : guardandoCorreo ? (
                'Guardando...'
              ) : (
                'Guardar correo'
              )}
            </button>
          </div>

          {/* Tarjeta de proyectos */}
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium" style={{ color: t.gray }}>Proyectos asignados</span>
              <span className="text-[13px] font-bold" style={{ color: t.text }}>{projects?.length ?? 0}</span>
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-[13px] font-medium" style={{ color: t.gray }}>Proyecto activo</span>
              <span className="text-[13px] font-bold truncate max-w-[60%]" style={{ color: t.text }}>{project?.nombre || '—'}</span>
            </div>
          </div>

          {/* Toggle modo oscuro */}
          <button
            onClick={() => setDark(!dark)}
            className="w-full flex items-center justify-between rounded-2xl p-4 mb-3"
            style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}
          >
            <div className="flex items-center gap-2.5">
              {dark ? <Sun size={17} color={t.amber} /> : <Moon size={17} color={t.navy} />}
              <span className="text-[13.5px] font-semibold" style={{ color: t.text }}>Modo oscuro</span>
            </div>
            <div className="rounded-full" style={{ width: 38, height: 22, backgroundColor: dark ? t.teal : t.border, position: 'relative' }}>
              <div className="rounded-full bg-white absolute top-0.5" style={{ width: 18, height: 18, left: dark ? 18 : 2, transition: 'left .15s' }} />
            </div>
          </button>

          {/* Cerrar sesión */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 rounded-2xl p-4"
            style={{ backgroundColor: t.redSoft }}
          >
            <LogOut size={17} color={t.red} />
            <span className="text-[13.5px] font-semibold" style={{ color: t.red }}>Cerrar sesión</span>
          </button>
        </div>

        <BottomNav t={t} current="perfil" go={go} />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />

        {showAvatarOptions && (
          <div className="absolute inset-0 z-50 flex items-end" style={{ backgroundColor: '#00000066' }}>
            <div className="w-full rounded-t-3xl p-6" style={{ backgroundColor: t.surface }}>
              <div className="text-[15px] font-bold text-center mb-4" style={{ color: t.text }}>Foto de perfil</div>

              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center gap-3 rounded-2xl p-4 mb-2.5"
                style={{ backgroundColor: t.bg }}
              >
                <div className="flex items-center justify-center rounded-full" style={{ width: 34, height: 34, backgroundColor: t.tealSoft }}>
                  <Camera size={16} color={t.teal} />
                </div>
                <span className="text-[13.5px] font-semibold" style={{ color: t.text }}>Tomar foto</span>
              </button>

              <button
                onClick={() => galleryInputRef.current?.click()}
                className="w-full flex items-center gap-3 rounded-2xl p-4 mb-2.5"
                style={{ backgroundColor: t.bg }}
              >
                <div className="flex items-center justify-center rounded-full" style={{ width: 34, height: 34, backgroundColor: t.tealSoft }}>
                  <ImageIcon size={16} color={t.teal} />
                </div>
                <span className="text-[13.5px] font-semibold" style={{ color: t.text }}>Elegir de mis fotos</span>
              </button>

              {avatar && (
                <button
                  onClick={handleQuitarFoto}
                  className="w-full flex items-center gap-3 rounded-2xl p-4 mb-2.5"
                  style={{ backgroundColor: t.redSoft }}
                >
                  <div className="flex items-center justify-center rounded-full" style={{ width: 34, height: 34, backgroundColor: t.surface }}>
                    <Trash2 size={16} color={t.red} />
                  </div>
                  <span className="text-[13.5px] font-semibold" style={{ color: t.red }}>Quitar foto</span>
                </button>
              )}

              <button
                onClick={() => setShowAvatarOptions(false)}
                className="w-full py-3.5 rounded-2xl font-semibold text-[14.5px] mt-1"
                style={{ backgroundColor: t.bg, color: t.text }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
};

export default Profile;
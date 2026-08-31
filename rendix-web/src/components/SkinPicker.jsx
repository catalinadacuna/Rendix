import { Check } from 'lucide-react';
import { useRendix } from '../context/RendixContext';
import { SKIN_LIST, swatchesDe } from '../theme';

// Hoja que sube desde abajo con los 5 skins disponibles.
// El cambio se aplica al instante, así el usuario ve la app repintarse
// por detrás mientras elige.
export const SkinPicker = ({ onClose }) => {
  const { t, skin, setSkin } = useRendix();

  return (
    <div
      className="absolute inset-0 z-50 flex items-end"
      style={{ backgroundColor: '#00000066' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl p-6"
        style={{ backgroundColor: t.surface, maxHeight: '88%', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[15px] font-bold text-center" style={{ color: t.text }}>
          Personaliza tu app
        </div>
        <p className="text-[11.5px] text-center mb-4 mt-1" style={{ color: t.gray }}>
          Elige un estilo. Se guarda en tu cuenta y te sigue en cualquier dispositivo.
        </p>

        {SKIN_LIST.map((s) => {
          const activo = s.id === skin;
          return (
            <button
              key={s.id}
              onClick={() => setSkin(s.id)}
              className="w-full flex items-center gap-3 rounded-2xl p-3.5 mb-2.5 text-left"
              style={{
                backgroundColor: activo ? t.tealSoft : t.bg,
                border: `1.5px solid ${activo ? t.teal : 'transparent'}`,
              }}
            >
              {/* Muestra de la paleta */}
              <div className="flex shrink-0" style={{ width: 46 }}>
                {swatchesDe(s).map((color, i) => (
                  <div
                    key={i}
                    style={{
                      width: 16,
                      height: 26,
                      backgroundColor: color,
                      marginLeft: i === 0 ? 0 : -6,
                      borderRadius: 5,
                      border: '1px solid rgba(0,0,0,.12)',
                    }}
                  />
                ))}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold" style={{ color: t.text }}>
                  {s.nombre}
                </div>
                <div className="text-[11px] leading-tight mt-0.5" style={{ color: t.gray }}>
                  {s.descripcion}
                </div>
              </div>

              <div
                className="flex items-center justify-center rounded-full shrink-0"
                style={{
                  width: 22,
                  height: 22,
                  backgroundColor: activo ? t.teal : 'transparent',
                  border: activo ? 'none' : `1.5px solid ${t.border}`,
                }}
              >
                {activo && <Check size={13} color={t.onAccent || '#fff'} />}
              </div>
            </button>
          );
        })}

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl font-semibold text-[14.5px] mt-2"
          style={{ backgroundColor: t.teal, color: t.onAccent || '#fff' }}
        >
          Listo
        </button>
      </div>
    </div>
  );
};

export default SkinPicker;
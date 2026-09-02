import { useState } from 'react';
import { FolderKanban, RotateCcw, Clock } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';
import { useRendix } from '../context/RendixContext';
import { ConfirmModal } from './shared';

// Calcula cuántos días le quedan al proyecto antes de que se borre para siempre.
const diasRestantes = (eliminadoEn) => {
  if (!eliminadoEn) return 0;
  const eliminado = new Date(eliminadoEn).getTime();
  const seBorraEn = eliminado + 5 * 24 * 60 * 60 * 1000; // 5 días
  const restanteMs = seBorraEn - Date.now();
  return Math.max(0, Math.ceil(restanteMs / (24 * 60 * 60 * 1000)));
};

export const Trash = ({ onBack }) => {
  const { t, proyectosEliminados, restaurarProyecto } = useRendix();
  const [proyectoARestaurar, setProyectoARestaurar] = useState(null);

  return (
    <PhoneFrame>
      <div className="flex-1 flex flex-col" style={{ backgroundColor: t.bg, minHeight: 0 }}>
        <div
          className="flex items-center px-3"
          style={{ height: 56, backgroundColor: t.surface, borderBottom: `1px solid ${t.border}` }}
        >
          <button onClick={onBack} className="p-2 -ml-1 rounded-full" style={{ color: t.text }} aria-label="Volver">
            &lt;
          </button>
          <span className="flex-1 text-center text-[15px] font-semibold" style={{ color: t.text }}>Proyectos eliminados</span>
          <div style={{ width: 32 }} />
        </div>

        <div className="px-5 pt-4 pb-2">
          <p className="text-[12px]" style={{ color: t.gray }}>
            Los proyectos permanecen aquí <b>5 días</b> antes de eliminarse para siempre. Toca "Restaurar" para recuperar uno.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ minHeight: 0 }}>
          {proyectosEliminados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock size={30} color={t.grayLight} />
              <div className="text-[13.5px] font-semibold mt-3" style={{ color: t.text }}>La papelera está vacía</div>
              <div className="text-[12px] mt-1" style={{ color: t.gray }}>Los proyectos que elimines aparecerán aquí</div>
            </div>
          ) : (
            proyectosEliminados.map((p) => {
              const dias = diasRestantes(p.eliminadoEn);
              return (
                <div
                  key={p.id}
                  className="w-full flex items-center gap-3 rounded-2xl p-4 mb-3"
                  style={{ backgroundColor: t.surface, border: `1.5px solid ${t.border}` }}
                >
                  <div
                    className="flex items-center justify-center rounded-xl shrink-0"
                    style={{ width: 42, height: 42, backgroundColor: t.grayLight + '33' }}
                  >
                    <FolderKanban size={19} color={t.gray} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold truncate" style={{ color: t.text }}>{p.nombre}</div>
                    <div className="text-[11.5px] mt-0.5" style={{ color: dias <= 1 ? t.red : t.gray }}>
                      Se elimina en {dias} {dias === 1 ? 'día' : 'días'}
                    </div>
                  </div>
                  <button
                    onClick={() => setProyectoARestaurar(p)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 shrink-0"
                    style={{ backgroundColor: t.tealSoft, color: t.teal }}
                  >
                    <RotateCcw size={13} />
                    <span className="text-[12px] font-semibold">Restaurar</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {proyectoARestaurar && (
          <ConfirmModal
            t={t}
            title={`¿Restaurar "${proyectoARestaurar.nombre}"?`}
            description="El proyecto y sus gastos volverán a tu lista de proyectos activos."
            confirmLabel="Restaurar"
            onCancel={() => setProyectoARestaurar(null)}
            onConfirm={() => {
              restaurarProyecto(proyectoARestaurar.id);
              setProyectoARestaurar(null);
            }}
          />
        )}
      </div>
    </PhoneFrame>
  );
};
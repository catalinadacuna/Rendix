import { useState } from 'react';
import { FolderKanban, Plus, Trash2, LogOut } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';
import { useRendix } from '../context/RendixContext';
import { ConfirmModal } from './shared';

export const ProjectSelection = ({ onSelectProject, onAddNew, onLogout, onGoToTrash }) => {
  const { t, proyectos, proyectosEliminados, deleteProyecto } = useRendix();
  const [proyectoAEliminar, setProyectoAEliminar] = useState(null);
  const [proyectoSinInforme, setProyectoSinInforme] = useState(null);
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  return (
    <PhoneFrame>
      <div className="flex-1 flex flex-col" style={{ backgroundColor: t.bg, minHeight: 0 }}>
        <div
          className="flex items-center px-3"
          style={{ height: 56, backgroundColor: t.surface, borderBottom: `1px solid ${t.border}` }}
        >
          {/* Esta es la primera pantalla tras el login: no hay "atrás", solo salir. */}
          <button
            onClick={() => setConfirmarSalida(true)}
            className="flex items-center gap-1.5 shrink-0"
            style={{ color: t.red, width: 72 }}
            aria-label="Cerrar sesión"
          >
            <LogOut size={16} />
            <span className="text-[13px] font-semibold">Salir</span>
          </button>
          <span className="flex-1 text-center text-[15px] font-semibold" style={{ color: t.text }}>Tus proyectos</span>
          <div className="shrink-0" style={{ width: 72 }} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>
          {proyectos.length === 0 ? (
            <p className="text-center text-[13px] mt-6" style={{ color: t.gray }}>
              Aún no tienes proyectos. Crea el primero para empezar a registrar gastos.
            </p>
          ) : (
            proyectos.map((p) => (
              <div
                key={p.id}
                className="w-full flex items-center gap-3 rounded-2xl p-4 mb-3"
                style={{ backgroundColor: t.surface, border: `1.5px solid ${t.border}` }}
              >
                <button onClick={() => onSelectProject(p)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                  <div
                    className="flex items-center justify-center rounded-xl shrink-0"
                    style={{ width: 42, height: 42, backgroundColor: t.tealSoft }}
                  >
                    <FolderKanban size={19} color={t.teal} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold truncate" style={{ color: t.text }}>{p.nombre}</div>
                    <div className="text-[12px] truncate" style={{ color: t.gray }}>{p.cliente}</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (!p.informeEnviadoEn) {
                      setProyectoSinInforme(p);
                    } else {
                      setProyectoAEliminar(p);
                    }
                  }}
                  className="p-2 rounded-full shrink-0"
                  style={{ color: t.grayLight }}
                  aria-label={`Eliminar proyecto ${p.nombre}`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))
          )}

          <button
            onClick={onAddNew}
            className="w-full rounded-2xl p-4 flex items-center justify-center gap-2 mt-1"
            style={{ backgroundColor: t.tealSoft, border: `1.5px dashed ${t.teal}`, color: t.teal }}
          >
            <Plus size={16} /> <span className="text-[13.5px] font-semibold">Nuevo proyecto</span>
          </button>

          <button
            onClick={onGoToTrash}
            className="w-full rounded-2xl p-4 flex items-center justify-center gap-2 mt-3"
            style={{ backgroundColor: t.surface, border: `1.5px solid ${t.border}`, color: t.gray }}
          >
            <Trash2 size={16} />
            <span className="text-[13.5px] font-semibold">
              Proyectos eliminados
              {proyectosEliminados.length > 0 && (
                <span
                  className="ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{ backgroundColor: t.amberSoft, color: t.amber }}
                >
                  {proyectosEliminados.length}
                </span>
              )}
            </span>
          </button>
        </div>

        {confirmarSalida && (
          <ConfirmModal
            t={t}
            title="¿Salir de la app?"
            description="Se cerrará tu sesión y tendrás que ingresar tu correo y contraseña para volver a entrar."
            confirmLabel="Salir"
            onCancel={() => setConfirmarSalida(false)}
            onConfirm={onLogout}
          />
        )}

        {proyectoSinInforme && (
          <ConfirmModal
            t={t}
            title="Envía el informe primero"
            description={`Antes de eliminar "${proyectoSinInforme.nombre}" tienes que enviar su informe. Entra al proyecto y toca "Enviar informe" en el Dashboard.`}
            confirmLabel="Entendido"
            onCancel={() => setProyectoSinInforme(null)}
            onConfirm={() => setProyectoSinInforme(null)}
          />
        )}

        {proyectoAEliminar && (
          <ConfirmModal
            t={t}
            title={`¿Eliminar "${proyectoAEliminar.nombre}"?`}
            description="El proyecto quedará en la papelera durante 5 días. Después se eliminará junto con sus gastos y fotos."
            confirmLabel="Eliminar proyecto"
            onCancel={() => setProyectoAEliminar(null)}
            onConfirm={() => {
              deleteProyecto(proyectoAEliminar.id);
              setProyectoAEliminar(null);
            }}
          />
        )}
      </div>
    </PhoneFrame>
  );
};
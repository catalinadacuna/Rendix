import { useState } from 'react';
import { Wallet, Pencil, Camera, ChevronRight, FolderKanban, AlertTriangle, FileDown, CheckCircle2 } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';
import { useRendix } from '../context/RendixContext';
import { EditBudgetModal } from './EditBudgetModal';
import { CaptureExpense } from './CaptureExpense';
import { BottomNav } from './shared';
import { fmtCLP } from '../theme';
import { descargarInformeCSV } from '../lib/exportarInforme';

export const Dashboard = ({ onBack, proyecto, go, onGastosClick, onPendientesClick }) => {
  const { t, gastosPorProyecto, totalGastadoPorProyecto, updateProyecto, marcarInformeEnviado, proyectos } = useRendix();
  const [showModal, setShowModal] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [enviandoInforme, setEnviandoInforme] = useState(false);
  const [informeRecienEnviado, setInformeRecienEnviado] = useState(false);

  const p = proyectos.find(item => item.id === proyecto.id) || proyecto;

  const presupuesto = Number(p.presupuesto) || 0;
  const gastosDelProyecto = gastosPorProyecto(p.id);
  const gastosValidos = totalGastadoPorProyecto(p.id);
  const saldoDisponible = presupuesto - gastosValidos;
  const pendientes = gastosDelProyecto.filter((g) => g.estado === 'diferido').length;

  const pct = presupuesto > 0 ? Math.min(100, Math.max(0, (gastosValidos / presupuesto) * 100)) : 0;
  const critico = presupuesto > 0 && saldoDisponible < presupuesto * 0.1;
  const yaInformado = Boolean(p.informeEnviadoEn);

  const handleUpdate = (nuevoPresupuesto) => {
    updateProyecto(p.id, { presupuesto: nuevoPresupuesto });
    setShowModal(false);
  };

  const handleEnviarInforme = async () => {
    if (gastosDelProyecto.length === 0) return;
    setEnviandoInforme(true);
    descargarInformeCSV(p, gastosDelProyecto);
    await marcarInformeEnviado(p.id);
    setEnviandoInforme(false);
    setInformeRecienEnviado(true);
    setTimeout(() => setInformeRecienEnviado(false), 3000);
  };

  return (
    <PhoneFrame>
      <div key={p.presupuesto} className="flex-1 flex flex-col overflow-y-auto pb-4" style={{ backgroundColor: t.bg }}>

        {/* Encabezado: proyecto activo */}
        <div className="px-5 pt-3 pb-2 flex items-center gap-1.5">
          <button onClick={onBack} className="p-1 -ml-1 rounded-full" style={{ color: t.text }} aria-label="Volver">
            &lt;
          </button>
          <FolderKanban size={15} color={t.teal} />
          <span className="text-[13px] font-semibold truncate" style={{ color: t.text }}>{p.nombre || 'Proyecto'}</span>
        </div>

        <div className="px-5">
          {/* Tarjeta de saldo disponible */}
          <div
            className="rounded-3xl p-5 mb-4"
            style={{ background: `linear-gradient(155deg, ${t.navy}, ${t.navySoft})` }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Wallet size={13} color="#C9D3E4" />
                <span className="text-[12px] font-medium" style={{ color: '#C9D3E4' }}>Saldo disponible</span>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1 rounded-full px-2 py-1"
                style={{ backgroundColor: '#ffffff1f' }}
              >
                <Pencil size={11} color="#fff" />
                <span className="text-[10.5px] font-semibold text-white">Editar</span>
              </button>
            </div>
            <div className="text-[34px] font-bold text-white leading-tight">{fmtCLP(saldoDisponible)}</div>
            {critico && (
              <div className="flex items-center gap-1 mt-1.5">
                <AlertTriangle size={12} color={t.amber} />
                <span className="text-[11px] font-medium" style={{ color: t.amber }}>Saldo bajo — queda menos del 10% del presupuesto</span>
              </div>
            )}

            <div className="mt-4 h-1.5 rounded-full w-full" style={{ backgroundColor: '#ffffff22' }}>
              <div className="h-1.5 rounded-full" style={{ width: pct + '%', backgroundColor: critico ? t.amber : t.teal }} />
            </div>
            <div className="flex justify-between mt-2 text-[11px]" style={{ color: '#C9D3E4' }}>
              <span>Gastado {fmtCLP(gastosValidos)}</span>
              <span>Presupuesto {fmtCLP(presupuesto)}</span>
            </div>
          </div>

          {/* Contadores */}
          <div className="flex gap-3 mb-5">
            <button
              onClick={onGastosClick}
              className="flex-1 rounded-2xl p-3.5 text-left"
              style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}
            >
              <div className="flex items-center justify-between">
                <div className="text-[20px] font-bold" style={{ color: t.text }}>{gastosDelProyecto.length}</div>
                <ChevronRight size={14} color={t.gray} />
              </div>
              <div className="text-[11.5px] font-medium" style={{ color: t.gray }}>Gastos registrados</div>
            </button>
            <button
              onClick={onPendientesClick}
              className="flex-1 rounded-2xl p-3.5 text-left"
              style={{
                backgroundColor: pendientes > 0 ? t.amberSoft : t.surface,
                border: `1px solid ${pendientes > 0 ? t.amber + '55' : t.border}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-[20px] font-bold" style={{ color: pendientes > 0 ? t.amber : t.text }}>{pendientes}</div>
                <ChevronRight size={14} color={pendientes > 0 ? t.amber : t.gray} />
              </div>
              <div className="text-[11.5px] font-medium" style={{ color: pendientes > 0 ? t.amber : t.gray }}>Pendientes por completar</div>
            </button>
          </div>
        </div>

        <div className="flex-1" />

        {/* Acción principal */}
        <div className="px-5 pb-3">
          <button
            onClick={() => setShowCapture(true)}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-[16px] mb-2.5"
            style={{ backgroundColor: t.teal, color: '#fff', boxShadow: `0 10px 24px -8px ${t.teal}99` }}
          >
            <Camera size={20} strokeWidth={2.2} />
            Registrar gasto
          </button>

          <button
            onClick={handleEnviarInforme}
            disabled={enviandoInforme || gastosDelProyecto.length === 0}
            className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold text-[14px]"
            style={{
              backgroundColor: t.surface,
              border: `1.5px solid ${yaInformado ? t.teal : t.border}`,
              color: yaInformado ? t.teal : t.text,
              opacity: gastosDelProyecto.length === 0 ? 0.5 : 1,
            }}
          >
            {informeRecienEnviado ? (
              <>
                <CheckCircle2 size={16} />
                Informe descargado
              </>
            ) : (
              <>
                <FileDown size={16} />
                {yaInformado ? 'Reenviar informe' : 'Enviar informe'}
              </>
            )}
          </button>
        </div>

        <BottomNav t={t} current="dashboard" go={go} />

        {showModal && (
          <EditBudgetModal
            proyecto={p}
            totalGastado={gastosValidos}
            onSave={handleUpdate}
            onCancel={() => setShowModal(false)}
          />
        )}

        {showCapture && (
          <CaptureExpense
            proyecto={p}
            onClose={() => setShowCapture(false)}
          />
        )}
      </div>
    </PhoneFrame>
  );
};
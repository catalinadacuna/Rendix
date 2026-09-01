import { useMemo, useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Receipt, Trash2, Lock } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';
import { useRendix } from '../context/RendixContext';
import { fmtCLP, fmtDate, inputStyle } from '../theme';
import { StatusBadge, ReceiptThumb, Chip, BottomNav, ConfirmModal } from './shared';
import { urlTemporal } from '../lib/storage';

// Componente que muestra la miniatura del gasto:
// si hay foto de boleta, la muestra; si no, muestra el ícono genérico.
function GastoThumb({ gasto, t }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!gasto.fotoUrl) return;
    urlTemporal('boletas', gasto.fotoUrl).then(setUrl);
  }, [gasto.fotoUrl]);

  if (gasto.fotoUrl && url) {
    return (
      <img
        src={url}
        alt="Boleta"
        className="rounded-xl object-cover shrink-0"
        style={{ width: 48, height: 48 }}
      />
    );
  }
  return <ReceiptThumb tipo={gasto.tipo_documento} size={48} t={t} />;
}

export const History = ({ proyecto, onBack, onOpen, go, initialEstado = 'todos' }) => {
  const { t, gastosPorProyecto, eliminarGasto, proyectos } = useRendix();

  const [q, setQ] = useState('');
  const [estado, setEstado] = useState(initialEstado);
  const [tipo, setTipo] = useState('todos');
  const [showFilters, setShowFilters] = useState(initialEstado !== 'todos');
  const [gastoAEliminar, setGastoAEliminar] = useState(null);
  const [avisoInformado, setAvisoInformado] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const gastos = gastosPorProyecto(proyecto.id);

  // Una vez enviado el informe, los gastos quedan congelados para no descuadrarlo.
  const p = proyectos.find((item) => item.id === proyecto.id) || proyecto;
  const yaInformado = Boolean(p.informeEnviadoEn);

  const filtered = useMemo(() => {
    return gastos
      .filter((g) => (estado === 'todos' ? true : g.estado === estado))
      .filter((g) => (tipo === 'todos' ? true : g.tipo_documento === tipo))
      .filter((g) => (q ? (g.comercio || '').toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a, b) => (b.creado || 0) - (a.creado || 0));
  }, [gastos, q, estado, tipo]);

  const handleEliminar = async () => {
    if (!gastoAEliminar) return;
    setEliminando(true);
    await eliminarGasto(gastoAEliminar.id);
    setEliminando(false);
    setGastoAEliminar(null);
  };

  return (
    <PhoneFrame>
      <div className="flex-1 flex flex-col" style={{ backgroundColor: t.bg, minHeight: 0 }}>
        <div
          className="flex items-center px-3 shrink-0"
          style={{ height: 56, backgroundColor: t.surface, borderBottom: `1px solid ${t.border}` }}
        >
          <button onClick={onBack} className="p-2 -ml-1 rounded-full" style={{ color: t.text }} aria-label="Volver">
            &lt;
          </button>
          <span className="flex-1 text-center text-[15px] font-semibold" style={{ color: t.text }}>Historial</span>
          <div style={{ width: 32 }} />
        </div>

        <div className="px-5 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 flex items-center gap-2 rounded-xl px-3" style={{ ...inputStyle(t), padding: '9px 12px' }}>
              <Search size={15} color={t.gray} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por comercio"
                className="flex-1 text-[13.5px] outline-none bg-transparent"
                style={{ color: t.text }}
              />
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="p-2.5 rounded-xl shrink-0"
              style={{
                backgroundColor: showFilters ? t.teal : t.surface,
                border: `1px solid ${showFilters ? t.teal : t.border}`,
              }}
              aria-label="Filtros"
            >
              <SlidersHorizontal size={16} color={showFilters ? '#fff' : t.text} />
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-col gap-2 mb-1">
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Chip t={t} active={estado === 'todos'} onClick={() => setEstado('todos')} label="Todos" />
                <Chip t={t} active={estado === 'confirmado'} onClick={() => setEstado('confirmado')} label="Confirmados" />
                <Chip t={t} active={estado === 'diferido'} onClick={() => setEstado('diferido')} label="Diferidos" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                <Chip t={t} active={tipo === 'todos'} onClick={() => setTipo('todos')} label="Todo tipo" />
                <Chip t={t} active={tipo === 'boleta'} onClick={() => setTipo('boleta')} label="Boletas" />
                <Chip t={t} active={tipo === 'factura'} onClick={() => setTipo('factura')} label="Facturas" />
              </div>
            </div>
          )}

          {yaInformado && (
            <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 mb-1" style={{ backgroundColor: t.tealSoft }}>
              <Lock size={12} color={t.teal} />
              <span className="text-[11px] font-medium" style={{ color: t.teal }}>
                Informe enviado: los gastos ya no se pueden eliminar
              </span>
            </div>
          )}
        </div>

        {/* minHeight: 0 es lo que activa el scroll: sin esto el contenedor crece
            con la lista completa en vez de encogerse y desplazarse. */}
        <div
          className="flex-1 overflow-y-auto px-5 pb-6"
          style={{ minHeight: 0, WebkitOverflowScrolling: 'touch' }}
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Receipt size={30} color={t.grayLight} />
              <div className="text-[13.5px] font-semibold mt-3" style={{ color: t.text }}>Sin resultados</div>
              <div className="text-[12px] mt-1" style={{ color: t.gray }}>Ajusta la búsqueda o los filtros aplicados</div>
            </div>
          ) : (
            filtered.map((g) => (
              <div
                key={g.id}
                className="w-full flex items-center gap-3 rounded-2xl p-3 mb-2.5"
                style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}
              >
                <button onClick={() => onOpen?.(g.id)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                  <GastoThumb gasto={g} t={t} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold truncate" style={{ color: t.text }}>
                      {g.comercio || 'Comercio sin identificar'}
                    </div>
                    <div className="text-[11.5px]" style={{ color: t.gray }}>
                      {g.fecha ? fmtDate(g.fecha) : 'Fecha pendiente'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[14px] font-bold" style={{ color: t.text }}>{fmtCLP(g.monto)}</span>
                    <StatusBadge estado={g.estado} t={t} />
                  </div>
                </button>
                <button
                  onClick={() => (yaInformado ? setAvisoInformado(true) : setGastoAEliminar(g))}
                  className="p-2 rounded-full shrink-0"
                  style={{ color: yaInformado ? t.grayLight : t.gray, opacity: yaInformado ? 0.5 : 1 }}
                  aria-label="Eliminar boleta"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <BottomNav t={t} current="historial" go={go} />

        {gastoAEliminar && (
          <ConfirmModal
            t={t}
            title="¿Eliminar esta boleta?"
            description={`Se eliminará el gasto de ${gastoAEliminar.comercio || 'este comercio'} por ${fmtCLP(gastoAEliminar.monto)} y su foto se borrará para siempre. Esta acción no se puede deshacer.`}
            confirmLabel={eliminando ? 'Eliminando...' : 'Sí, eliminar para siempre'}
            onCancel={() => setGastoAEliminar(null)}
            onConfirm={handleEliminar}
          />
        )}

        {avisoInformado && (
          <ConfirmModal
            t={t}
            title="No se puede eliminar"
            description="El informe de este proyecto ya fue enviado al administrador. Eliminar una boleta ahora dejaría el informe descuadrado."
            confirmLabel="Entendido"
            onCancel={() => setAvisoInformado(false)}
            onConfirm={() => setAvisoInformado(false)}
          />
        )}
      </div>
    </PhoneFrame>
  );
};
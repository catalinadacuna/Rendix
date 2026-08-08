import { useMemo, useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Receipt } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';
import { useRendix } from '../context/RendixContext';
import { fmtCLP, fmtDate, inputStyle } from '../theme';
import { StatusBadge, ReceiptThumb, Chip, BottomNav } from './shared';
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
  const { t, gastosPorProyecto } = useRendix();

  const [q, setQ] = useState('');
  const [estado, setEstado] = useState(initialEstado);
  const [tipo, setTipo] = useState('todos');
  const [showFilters, setShowFilters] = useState(initialEstado !== 'todos');

  const gastos = gastosPorProyecto(proyecto.id);

  const filtered = useMemo(() => {
    return gastos
      .filter((g) => (estado === 'todos' ? true : g.estado === estado))
      .filter((g) => (tipo === 'todos' ? true : g.tipo_documento === tipo))
      .filter((g) => (q ? (g.comercio || '').toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a, b) => (b.creado || 0) - (a.creado || 0));
  }, [gastos, q, estado, tipo]);

  return (
    <PhoneFrame>
      <div className="flex-1 flex flex-col" style={{ backgroundColor: t.bg }}>
        <div
          className="flex items-center px-3"
          style={{ height: 56, backgroundColor: t.surface, borderBottom: `1px solid ${t.border}` }}
        >
          <button onClick={onBack} className="p-2 -ml-1 rounded-full" style={{ color: t.text }} aria-label="Volver">
            &lt;
          </button>
          <span className="flex-1 text-center text-[15px] font-semibold" style={{ color: t.text }}>Historial</span>
          <div style={{ width: 32 }} />
        </div>

        <div className="px-5 pt-4 pb-2">
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
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Receipt size={30} color={t.grayLight} />
              <div className="text-[13.5px] font-semibold mt-3" style={{ color: t.text }}>Sin resultados</div>
              <div className="text-[12px] mt-1" style={{ color: t.gray }}>Ajusta la búsqueda o los filtros aplicados</div>
            </div>
          ) : (
            filtered.map((g) => (
              <button
                key={g.id}
                onClick={() => onOpen?.(g.id)}
                className="w-full text-left flex items-center gap-3 rounded-2xl p-3 mb-2.5"
                style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}
              >
                <GastoThumb gasto={g} t={t} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold truncate" style={{ color: t.text }}>
                    {g.comercio || 'Comercio sin identificar'}
                  </div>
                  <div className="text-[11.5px]" style={{ color: t.gray }}>
                    {g.fecha ? fmtDate(g.fecha) : 'Fecha pendiente'}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[14px] font-bold" style={{ color: t.text }}>{fmtCLP(g.monto)}</span>
                  <StatusBadge estado={g.estado} t={t} />
                </div>
              </button>
            ))
          )}
        </div>

        <BottomNav t={t} current="historial" go={go} />
      </div>
    </PhoneFrame>
  );
};
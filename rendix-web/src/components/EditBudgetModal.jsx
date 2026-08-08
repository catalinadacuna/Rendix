import { useState, useEffect } from 'react';
import { Wallet, DollarSign } from 'lucide-react';
import { useRendix } from '../context/RendixContext';
import { fmtCLP, inputStyle, primaryButtonStyle } from '../theme';

export const EditBudgetModal = ({ proyecto, totalGastado, onSave, onCancel }) => {
  const { t } = useRendix();

  const [nuevoSaldo, setNuevoSaldo] = useState(String(proyecto.presupuesto - totalGastado));

  useEffect(() => {
    setNuevoSaldo(String(proyecto.presupuesto - totalGastado));
  }, [proyecto, totalGastado]);

  const num = Number(nuevoSaldo);
  const valid = nuevoSaldo !== '' && !Number.isNaN(num);
  const nuevoPresupuestoTotal = valid ? num + Number(totalGastado) : null;

  const handleSave = () => {
    if (!valid) return;
    onSave(nuevoPresupuestoTotal);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ backgroundColor: '#00000066' }}>
      <div className="w-full rounded-t-3xl p-6" style={{ backgroundColor: t.surface }}>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="rounded-full flex items-center justify-center" style={{ width: 38, height: 38, backgroundColor: t.tealSoft }}>
            <Wallet size={17} color={t.teal} />
          </div>
          <div className="text-[15.5px] font-bold" style={{ color: t.text }}>Editar saldo disponible</div>
        </div>
        <p className="text-[12px] mt-1.5 mb-4" style={{ color: t.gray }}>
          Usa esto para reflejar un nuevo depósito, una corrección de presupuesto u otro ajuste. El presupuesto total del proyecto se recalcula automáticamente para que el saldo quede exactamente en el valor que ingreses.
        </p>

        <label className="text-[12px] font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: t.gray }}>
          <DollarSign size={13} /> Nuevo saldo disponible
        </label>
        <input
          style={{ ...inputStyle(t, valid ? 'high' : 'low'), marginBottom: 16 }}
          type="number"
          autoFocus
          value={nuevoSaldo}
          onChange={(e) => setNuevoSaldo(e.target.value)}
          placeholder="0"
        />

        <div className="rounded-xl px-3.5 py-3 mb-5" style={{ backgroundColor: t.bg }}>
          <div className="flex justify-between text-[12.5px] mb-1.5">
            <span style={{ color: t.gray }}>Gastos ya registrados</span>
            <span className="font-semibold" style={{ color: t.text }}>{fmtCLP(totalGastado)}</span>
          </div>
          <div className="flex justify-between text-[12.5px]">
            <span style={{ color: t.gray }}>Nuevo presupuesto total</span>
            <span className="font-semibold" style={{ color: t.text }}>{valid ? fmtCLP(nuevoPresupuestoTotal) : '—'}</span>
          </div>
        </div>

        <button disabled={!valid} onClick={handleSave} style={{ ...primaryButtonStyle(t, valid), marginBottom: 8 }}>
          Guardar nuevo saldo
        </button>
        <button
          onClick={onCancel}
          className="w-full py-3.5 rounded-2xl font-semibold text-[14.5px]"
          style={{ backgroundColor: t.bg, color: t.text }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};
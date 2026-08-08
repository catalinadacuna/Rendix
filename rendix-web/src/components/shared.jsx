import { Check, Clock, FileText, Receipt, Home, History as HistoryIcon, User, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { inputStyle } from '../theme';

export function PasswordField({ t, value, onChange, placeholder = '••••••••', style }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        style={{ ...inputStyle(t), paddingRight: 40, ...style }}
        placeholder={placeholder}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        className="w-full"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute top-1/2 -translate-y-1/2 right-3"
        style={{ color: t.gray }}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

export function ConfirmModal({ t, title, description, confirmLabel = 'Eliminar', onCancel, onConfirm }) {
  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ backgroundColor: '#00000066' }}>
      <div className="w-full rounded-t-3xl p-6" style={{ backgroundColor: t.surface }}>
        <div className="flex items-center justify-center mb-3">
          <div className="rounded-full flex items-center justify-center" style={{ width: 46, height: 46, backgroundColor: t.redSoft }}>
            <AlertTriangle size={20} color={t.red} />
          </div>
        </div>
        <div className="text-[15px] font-bold text-center" style={{ color: t.text }}>{title}</div>
        {description && (
          <p className="text-[12.5px] text-center mt-1.5 mb-5" style={{ color: t.gray }}>{description}</p>
        )}
        <button
          onClick={onConfirm}
          className="w-full py-3.5 rounded-2xl font-semibold text-[14.5px] mb-2"
          style={{ backgroundColor: t.red, color: '#fff' }}
        >
          {confirmLabel}
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
}

export function BottomNav({ t, current, go }) {
  const items = [
    { key: 'dashboard', label: 'Principal', icon: Home },
    { key: 'historial', label: 'Historial', icon: HistoryIcon },
    { key: 'perfil', label: 'Perfil', icon: User },
  ];
  return (
    <div
      className="flex items-stretch shrink-0"
      style={{ backgroundColor: t.surface, borderTop: `1px solid ${t.border}`, height: 60 }}
    >
      {items.map(({ key, label, icon: Icon }) => {
        const active = current === key;
        return (
          <button
            key={key}
            onClick={() => go(key)}
            className="flex-1 flex flex-col items-center justify-center gap-1"
          >
            <Icon size={20} color={active ? t.teal : t.gray} strokeWidth={active ? 2.4 : 1.9} />
            <span className="text-[11px] font-medium" style={{ color: active ? t.teal : t.gray }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function StatusBadge({ estado, t }) {
  const isConfirmado = estado === 'confirmado';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: isConfirmado ? t.tealSoft : t.amberSoft,
        color: isConfirmado ? t.teal : t.amber,
      }}
    >
      {isConfirmado ? <Check size={12} strokeWidth={3} /> : <Clock size={12} strokeWidth={3} />}
      {isConfirmado ? 'Confirmado' : 'Diferido'}
    </span>
  );
}

export function ReceiptThumb({ tipo, size = 48, t }) {
  const isFactura = tipo === 'factura';
  return (
    <div
      className="flex items-center justify-center shrink-0 rounded-xl"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(155deg, ${isFactura ? t.navySoft : t.teal} 0%, ${t.navy} 100%)`,
      }}
    >
      {isFactura ? (
        <FileText size={size * 0.42} color="#fff" strokeWidth={1.6} />
      ) : (
        <Receipt size={size * 0.42} color="#fff" strokeWidth={1.6} />
      )}
    </div>
  );
}

export function Chip({ t, active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12px] font-semibold shrink-0"
      style={{
        backgroundColor: active ? t.teal : t.bg,
        color: active ? '#fff' : t.text,
        border: `1px solid ${active ? t.teal : t.border}`,
      }}
    >
      {label}
    </button>
  );
}
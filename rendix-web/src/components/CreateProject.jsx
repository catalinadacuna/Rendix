import { useState } from 'react';
import { FolderKanban, Building2, DollarSign, Calendar } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';
import { useRendix } from '../context/RendixContext';
import { inputStyle, primaryButtonStyle, formatThousands } from '../theme';

function Field({ label, icon: Icon, t, children }) {
  return (
    <div className="mb-4">
      <label className="text-[12px] font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: t.gray }}>
        {Icon && <Icon size={13} />}
        {label}
      </label>
      {children}
    </div>
  );
}

export const CreateProject = ({ onBack }) => {
  const { t, addProyecto } = useRendix();

  const [formData, setFormData] = useState({
    nombre: '',
    cliente: '',
    presupuesto: '',
    fechaInicio: '',
    fechaTermino: '',
  });

  const isFormValid = Object.values(formData).every((field) => field !== '');

  const handleSubmit = () => {
    if (!isFormValid) return;
    // Guardamos el valor limpiando los puntos para mantener la lógica matemática
    const cleanBudget = formData.presupuesto.replace(/\./g, '');
    addProyecto({ ...formData, presupuesto: Number(cleanBudget), id: Date.now() });
    onBack();
  };

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
          <span className="flex-1 text-center text-[15px] font-semibold" style={{ color: t.text }}>Nuevo proyecto</span>
          <div style={{ width: 32 }} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>
          <Field label="Nombre del proyecto" icon={FolderKanban} t={t}>
            <input
              style={inputStyle(t)}
              placeholder="Ej: Gira Regional 2026"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
          </Field>

          <Field label="Cliente" icon={Building2} t={t}>
            <input
              style={inputStyle(t)}
              placeholder="Nombre del cliente"
              value={formData.cliente}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
            />
          </Field>

          <Field label="Presupuesto total" icon={DollarSign} t={t}>
            <input
              style={inputStyle(t)}
              placeholder="0"
              value={formData.presupuesto}
              onChange={(e) => setFormData({ ...formData, presupuesto: formatThousands(e.target.value) })}
            />
          </Field>

          <div className="flex gap-3">
            <div className="flex-1">
              <Field label="Fecha inicio" icon={Calendar} t={t}>
                <input
                  style={inputStyle(t)}
                  type="date"
                  value={formData.fechaInicio}
                  onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Fecha término" icon={Calendar} t={t}>
                <input
                  style={inputStyle(t)}
                  type="date"
                  value={formData.fechaTermino}
                  onChange={(e) => setFormData({ ...formData, fechaTermino: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="px-5 pb-6">
          <button disabled={!isFormValid} onClick={handleSubmit} style={primaryButtonStyle(t, isFormValid)}>
            Crear proyecto
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
};
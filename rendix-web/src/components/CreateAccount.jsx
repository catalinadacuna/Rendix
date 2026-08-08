import { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';
import { useRendix } from '../context/RendixContext';
import { inputStyle, primaryButtonStyle } from '../theme';
import { supabase } from '../lib/supabaseClient';
import { PasswordField } from './shared';
import logo from '../assets/logo-rendifacil.png';

export const CreateAccount = ({ onBack }) => {
  const { t } = useRendix();
  const [nombre, setNombre] = useState('');
  const [correoAdministrador, setCorreoAdministrador] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleCreate = async () => {
    setError('');
    if (!email || !password) {
      setError('Ingresa tu correo y una contraseña.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    });
    setLoading(false);
    if (signUpError) {
      setError(
        signUpError.message.includes('already registered')
          ? 'Ese correo ya tiene una cuenta.'
          : 'No se pudo crear la cuenta. Intenta de nuevo.'
      );
      return;
    }

    // Guarda el correo del administrador en el perfil recién creado (si se ingresó uno)
    if (data?.user && correoAdministrador) {
      await supabase
        .from('perfiles')
        .update({ correo_administrador: correoAdministrador })
        .eq('user_id', data.user.id);
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <PhoneFrame>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center" style={{ backgroundColor: t.bg }}>
          <CheckCircle2 size={40} color={t.teal} />
          <h2 className="text-[17px] font-bold mt-4" style={{ color: t.navy }}>Revisa tu correo</h2>
          <p className="text-[13px] mt-2" style={{ color: t.gray }}>
            Te enviamos un enlace de confirmación a <b>{email}</b>. Ábrelo para activar tu cuenta y luego inicia sesión.
          </p>
          <button onClick={onBack} style={{ ...primaryButtonStyle(t), marginTop: 24 }}>
            Volver al inicio de sesión
          </button>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div className="flex-1 flex flex-col px-7 py-6 overflow-y-auto" style={{ backgroundColor: t.bg }}>
        <button onClick={onBack} className="p-1 -ml-1 mb-4 rounded-full self-start" style={{ color: t.text }} aria-label="Volver">
          &lt;
        </button>

        <div className="mb-6 flex flex-col items-center">
          <img src={logo} alt="RendiFácil" className="mb-3" style={{ width: 52, height: 52, borderRadius: 16 }} />
          <h1 className="text-[19px] font-bold" style={{ color: t.navy }}>Crear cuenta</h1>
        </div>

        <label className="text-[12px] font-semibold mb-1.5" style={{ color: t.gray }}>Tu nombre</label>
        <input style={{ ...inputStyle(t), marginBottom: 14 }} placeholder="Juan Pérez" value={nombre} onChange={(e) => setNombre(e.target.value)} />

        <label className="text-[12px] font-semibold mb-1.5" style={{ color: t.gray }}>Tu correo</label>
        <input style={{ ...inputStyle(t), marginBottom: 14 }} placeholder="tucorreo@empresa.cl" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label className="text-[12px] font-semibold mb-1.5" style={{ color: t.gray }}>Contraseña</label>
        <PasswordField
          t={t}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          style={{ marginBottom: 14 }}
        />

        <label className="text-[12px] font-semibold mb-1.5" style={{ color: t.gray }}>
          Correo del administrador <span style={{ fontWeight: 400, color: t.grayLight }}>(opcional)</span>
        </label>
        <input
          style={{ ...inputStyle(t), marginBottom: 8 }}
          placeholder="jefe@empresa.cl"
          type="email"
          value={correoAdministrador}
          onChange={(e) => setCorreoAdministrador(e.target.value)}
        />
        <p className="text-[11.5px] mb-5" style={{ color: t.gray }}>
          Ahí llegarán los informes cuando envíes uno. Si trabajas solo, puedes dejarlo en blanco.
        </p>

        {error && (
          <div className="flex items-center gap-1.5 mb-4 px-3 py-2 rounded-xl" style={{ backgroundColor: t.redSoft }}>
            <AlertCircle size={14} color={t.red} />
            <span className="text-[12px] font-medium" style={{ color: t.red }}>{error}</span>
          </div>
        )}

        <button onClick={handleCreate} disabled={loading} style={primaryButtonStyle(t, !loading)}>
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </div>
    </PhoneFrame>
  );
};
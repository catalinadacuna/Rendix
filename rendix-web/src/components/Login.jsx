import { useState } from 'react';
import { Sun, Moon, AlertCircle } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';
import { useRendix } from '../context/RendixContext';
import { inputStyle, primaryButtonStyle } from '../theme';
import { supabase } from '../lib/supabaseClient';
import { PasswordField } from './shared';
import logo from '../assets/logo-rendifacil.png';

export const Login = ({ onLoginSuccess, onGoToCrearCuenta, onGoToRecuperar }) => {
  const { t, dark, setDark } = useRendix();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError('Correo o contraseña incorrectos.');
      return;
    }
    onLoginSuccess();
  };

  return (
    <PhoneFrame>
      <div
        className="relative flex-1 flex flex-col justify-center px-7"
        style={{ backgroundColor: t.bg }}
      >
        <button
          onClick={() => setDark(!dark)}
          className="absolute top-3 right-5 p-2 rounded-full"
          style={{ backgroundColor: t.surface }}
          aria-label="Cambiar modo oscuro"
        >
          {dark ? <Sun size={16} color={t.amber} /> : <Moon size={16} color={t.navy} />}
        </button>

        <div className="mb-9 flex flex-col items-center">
          <img
            src={logo}
            alt="RendiFácil"
            className="mb-4"
            style={{ width: 64, height: 64, borderRadius: 20 }}
          />
          <h1 className="text-[22px] font-bold" style={{ color: t.navy }}>RendiFácil</h1>
          <p className="text-[13px] mt-1 text-center" style={{ color: t.gray }}>
          </p>
        </div>

        <label className="text-[12px] font-semibold mb-1.5" style={{ color: t.gray }}>Correo</label>
        <input
          style={{ ...inputStyle(t), marginBottom: 16 }}
          placeholder="tucorreo@empresa.cl"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="text-[12px] font-semibold mb-1.5" style={{ color: t.gray }}>Contraseña</label>
        <PasswordField
          t={t}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 8 }}
        />

        <button
          onClick={onGoToRecuperar}
          className="text-[12.5px] font-semibold mb-6"
          style={{ color: t.teal, alignSelf: 'flex-end' }}
        >
          ¿Olvidaste tu contraseña?
        </button>

        {error && (
          <div className="flex items-center gap-1.5 mb-4 px-3 py-2 rounded-xl" style={{ backgroundColor: t.redSoft }}>
            <AlertCircle size={14} color={t.red} />
            <span className="text-[12px] font-medium" style={{ color: t.red }}>{error}</span>
          </div>
        )}

        <button onClick={handleLogin} disabled={loading} style={primaryButtonStyle(t, !loading)}>
          {loading ? 'Ingresando...' : 'Iniciar sesión'}
        </button>

        <button
          onClick={onGoToCrearCuenta}
          className="text-[12.5px] font-semibold text-center mt-5"
          style={{ color: t.gray }}
        >
          ¿No tienes cuenta? <span style={{ color: t.teal }}>Regístrate</span>
        </button>
      </div>
    </PhoneFrame>
  );
};
import { useState } from 'react';
import { AlertCircle, Mail, CheckCircle2 } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';
import { useRendix } from '../context/RendixContext';
import { inputStyle, primaryButtonStyle } from '../theme';
import { supabase } from '../lib/supabaseClient';
import { PasswordField } from './shared';

export const RecuperarPassword = ({ onBack, onRecovered }) => {
  const { t } = useRendix();
  const [paso, setPaso] = useState('correo'); // 'correo' | 'codigo' | 'nueva-clave'
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaClave, setNuevaClave] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reenviado, setReenviado] = useState(false);

  const enviarCodigo = async () => {
    setError('');
    if (!email) {
      setError('Ingresa tu correo.');
      return;
    }
    setLoading(true);
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (sendError) {
      setError('No pudimos enviar el código. Verifica el correo e intenta de nuevo.');
      return;
    }
    setPaso('codigo');
  };

  const reenviarCodigo = async () => {
    setReenviado(false);
    await supabase.auth.resetPasswordForEmail(email);
    setReenviado(true);
  };

  const verificarCodigo = async () => {
    setError('');
    if (codigo.length !== 6) {
      setError('El código tiene 6 dígitos.');
      return;
    }
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: codigo,
      type: 'recovery',
    });
    setLoading(false);
    if (verifyError) {
      setError('Código incorrecto o vencido. Solicita uno nuevo.');
      return;
    }
    setPaso('nueva-clave');
  };

  const guardarNuevaClave = async () => {
    setError('');
    if (nuevaClave.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: nuevaClave });
    setLoading(false);
    if (updateError) {
      setError('No se pudo guardar la contraseña. Intenta de nuevo.');
      return;
    }
    onRecovered();
  };

  return (
    <PhoneFrame>
      <div className="flex-1 flex flex-col px-7 py-6" style={{ backgroundColor: t.bg }}>
        <button onClick={onBack} className="p-1 -ml-1 mb-5 rounded-full self-start" style={{ color: t.text }} aria-label="Volver">
          &lt;
        </button>

        {paso === 'correo' && (
          <>
            <div className="flex flex-col items-center mb-6">
              <div className="flex items-center justify-center rounded-full mb-3" style={{ width: 52, height: 52, backgroundColor: t.tealSoft }}>
                <Mail size={22} color={t.teal} />
              </div>
              <h1 className="text-[18px] font-bold text-center" style={{ color: t.navy }}>Recuperar contraseña</h1>
              <p className="text-[13px] mt-1 text-center" style={{ color: t.gray }}>
                Ingresa tu correo y te enviaremos un código de 6 dígitos.
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

            {error && (
              <div className="flex items-center gap-1.5 mb-4 px-3 py-2 rounded-xl" style={{ backgroundColor: t.redSoft }}>
                <AlertCircle size={14} color={t.red} />
                <span className="text-[12px] font-medium" style={{ color: t.red }}>{error}</span>
              </div>
            )}

            <button onClick={enviarCodigo} disabled={loading} style={primaryButtonStyle(t, !loading)}>
              {loading ? 'Enviando...' : 'Enviar código'}
            </button>
          </>
        )}

        {paso === 'codigo' && (
          <>
            <div className="flex flex-col items-center mb-6">
              <div className="flex items-center justify-center rounded-full mb-3" style={{ width: 52, height: 52, backgroundColor: t.tealSoft }}>
                <Mail size={22} color={t.teal} />
              </div>
              <h1 className="text-[18px] font-bold text-center" style={{ color: t.navy }}>Ingresa el código</h1>
              <p className="text-[13px] mt-1 text-center" style={{ color: t.gray }}>
                Enviamos un código de 6 dígitos a <b>{email}</b>.
              </p>
              <p className="text-[11.5px] mt-1 text-center" style={{ color: t.grayLight }}>
                Si no lo ves, revisa también tu carpeta de spam o correo no deseado.
              </p>
            </div>

            <label className="text-[12px] font-semibold mb-1.5" style={{ color: t.gray }}>Código de 6 dígitos</label>
            <input
              style={{ ...inputStyle(t), marginBottom: 10, letterSpacing: 4, textAlign: 'center', fontSize: 18 }}
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />

            <button
              onClick={reenviarCodigo}
              className="text-[12.5px] font-semibold mb-5"
              style={{ color: t.teal, alignSelf: 'center' }}
            >
              Reenviar código
            </button>
            {reenviado && (
              <p className="text-[11.5px] text-center -mt-4 mb-4" style={{ color: t.teal }}>
                Código reenviado. Espera un momento y revisa tu correo.
              </p>
            )}

            {error && (
              <div className="flex items-center gap-1.5 mb-4 px-3 py-2 rounded-xl" style={{ backgroundColor: t.redSoft }}>
                <AlertCircle size={14} color={t.red} />
                <span className="text-[12px] font-medium" style={{ color: t.red }}>{error}</span>
              </div>
            )}

            <button onClick={verificarCodigo} disabled={loading} style={primaryButtonStyle(t, !loading)}>
              {loading ? 'Verificando...' : 'Verificar código'}
            </button>
          </>
        )}

        {paso === 'nueva-clave' && (
          <>
            <div className="flex flex-col items-center mb-6">
              <div className="flex items-center justify-center rounded-full mb-3" style={{ width: 52, height: 52, backgroundColor: t.tealSoft }}>
                <CheckCircle2 size={22} color={t.teal} />
              </div>
              <h1 className="text-[18px] font-bold text-center" style={{ color: t.navy }}>Código verificado</h1>
              <p className="text-[13px] mt-1 text-center" style={{ color: t.gray }}>
                Elige tu nueva contraseña.
              </p>
            </div>

            <label className="text-[12px] font-semibold mb-1.5" style={{ color: t.gray }}>Nueva contraseña</label>
            <PasswordField
              t={t}
              value={nuevaClave}
              onChange={(e) => setNuevaClave(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              style={{ marginBottom: 16 }}
            />

            {error && (
              <div className="flex items-center gap-1.5 mb-4 px-3 py-2 rounded-xl" style={{ backgroundColor: t.redSoft }}>
                <AlertCircle size={14} color={t.red} />
                <span className="text-[12px] font-medium" style={{ color: t.red }}>{error}</span>
              </div>
            )}

            <button onClick={guardarNuevaClave} disabled={loading} style={primaryButtonStyle(t, !loading)}>
              {loading ? 'Guardando...' : 'Guardar y entrar'}
            </button>
          </>
        )}
      </div>
    </PhoneFrame>
  );
};
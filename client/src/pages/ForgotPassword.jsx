import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import { Alert, Spinner } from '../components/Feedback';
import { AuthLayout, AuthSwitch } from '../components/AuthLayout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotFound(false);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Informe um e-mail válido.');
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setNotFound(err.response?.status === 404);
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout panelTitle="Acontece com todo mundo!" panelText="Mandamos um link para o seu e-mail e você cria uma senha nova em um minuto.">
      {sent ? (
        <div className="auth-form">
          <h1>Confira seu e-mail 📬</h1>
          <p>
            Enviamos para <strong>{email}</strong> um link para criar uma senha nova. Ele vale por 1 hora.
          </p>
          <p className="muted">Não chegou? Olhe a caixa de spam ou promoções, ou tente de novo em alguns minutos.</p>
          <Link to="/login" className="btn btn-primary btn-block btn-lg">Voltar para o login</Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h1>Esqueci a senha</h1>
          <p className="muted">Digite o e-mail da sua conta e enviamos um link para criar uma senha nova.</p>
          <Alert onClose={() => setError('')}>
            {error && (
              <>
                {error}
                {notFound && <> <Link to="/cadastro">Criar conta</Link></>}
              </>
            )}
          </Alert>
          <label className="field">
            <span>E-mail</span>
            <input className="input" type="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="btn btn-primary btn-block btn-lg" disabled={submitting}>
            {submitting ? <Spinner small /> : 'Enviar link'}
          </button>
          <AuthSwitch text="Lembrou a senha?" to="/login" label="Entrar" />
        </form>
      )}
    </AuthLayout>
  );
}

import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/axios';
import { Alert, Spinner } from '../components/Feedback';
import { AuthLayout, AuthSwitch, PasswordInput } from '../components/AuthLayout';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) return setError('Preencha e-mail e senha.');
    setSubmitting(true);
    try {
      const u = await login(form.email, form.password);
      navigate(location.state?.from || (u.role === 'admin' ? '/admin' : '/'), { replace: true });
    } catch (err) {
      setError(errorMessage(err)); // ex: "E-mail ou senha incorretos"
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      panelTitle="Que bom te ver de novo!"
      panelText="Entre para acompanhar seus pedidos e finalizar suas compras rapidinho."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <h1>Entrar</h1>
        <p className="muted">Use o e-mail e a senha da sua conta Tomanbin.</p>

        <Alert onClose={() => setError('')}>{error}</Alert>

        <label className="field">
          <span>E-mail</span>
          <input
            className="input"
            type="email"
            autoComplete="email"
            placeholder="voce@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <div className="field">
          <label htmlFor="login-pw"><span>Senha</span></label>
          <PasswordInput
            id="login-pw"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <button className="btn btn-primary btn-block btn-lg" disabled={submitting}>
          {submitting ? <Spinner small /> : 'Entrar'}
        </button>

        <AuthSwitch text="Ainda não tem conta?" to="/cadastro" label="Criar conta grátis" />
      </form>
    </AuthLayout>
  );
}

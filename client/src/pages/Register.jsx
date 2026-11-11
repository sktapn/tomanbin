import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/axios';
import { Alert, Spinner } from '../components/Feedback';
import { AuthLayout, AuthSwitch, PasswordInput, PasswordStrength } from '../components/AuthLayout';

function validate({ name, email, password, confirm }) {
  const errs = {};
  if (name.trim().length < 2) errs.name = 'Informe seu nome';
  if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'E-mail inválido';
  if (password.length < 6) errs.password = 'A senha deve ter pelo menos 6 caracteres';
  if (confirm !== password) errs.confirm = 'As senhas não coincidem';
  return errs;
}

export default function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = validate(form);
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err)); // ex: "Este e-mail já está cadastrado"
    } finally {
      setSubmitting(false);
    }
  };

  const err = (key) => fieldErrors[key] && <small className="field-error">{fieldErrors[key]}</small>;

  return (
    <AuthLayout
      panelTitle="Bem-vindo(a) à turma!"
      panelText="Crie sua conta em menos de um minuto."
      perks={['Pague com Pix na hora', 'Acompanhe seus pedidos ao vivo', 'Receba em casa ou retire sem frete']}
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <h1>Criar conta</h1>
        <p className="muted">É grátis e rapidinho.</p>
        <Alert onClose={() => setError('')}>{error}</Alert>

        <label className="field">
          <span>Nome</span>
          <input className={`input ${fieldErrors.name ? 'invalid' : ''}`} autoComplete="name" placeholder="Como podemos te chamar?" value={form.name} onChange={set('name')} />
          {err('name')}
        </label>
        <label className="field">
          <span>E-mail</span>
          <input className={`input ${fieldErrors.email ? 'invalid' : ''}`} type="email" autoComplete="email" placeholder="voce@email.com" value={form.email} onChange={set('email')} />
          {err('email')}
        </label>
        <div className="field">
          <label htmlFor="reg-pw"><span>Senha</span></label>
          <PasswordInput id="reg-pw" autoComplete="new-password" value={form.password} onChange={set('password')} invalid={fieldErrors.password} />
          <PasswordStrength password={form.password} />
          {err('password')}
        </div>
        <div className="field">
          <label htmlFor="reg-pw2"><span>Confirmar senha</span></label>
          <PasswordInput id="reg-pw2" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} invalid={fieldErrors.confirm} />
          {err('confirm')}
        </div>

        <button className="btn btn-primary btn-block btn-lg" disabled={submitting}>
          {submitting ? <Spinner small /> : 'Criar minha conta'}
        </button>

        <AuthSwitch text="Já tem conta?" to="/login" label="Entrar" />
      </form>
    </AuthLayout>
  );
}

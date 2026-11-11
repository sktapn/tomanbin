import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert, Spinner } from '../components/Feedback';
import { AuthLayout, PasswordInput } from '../components/AuthLayout';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { saveSession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');
    if (form.password !== form.confirm) return setError('As senhas não são iguais.');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, password: form.password });
      saveSession(data); // já entra na conta
      toast('Senha alterada! Você já está conectado.', 'success');
      navigate(data.user.role === 'admin' ? '/admin' : '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return (
      <AuthLayout panelTitle="Ops!" panelText="Este link não está completo.">
        <div className="auth-form">
          <h1>Link inválido</h1>
          <p>O link de redefinição está incompleto ou expirou. Peça um novo, ele chega em instantes.</p>
          <Link to="/esqueci-senha" className="btn btn-primary btn-block btn-lg">Pedir novo link</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout panelTitle="Senha nova, vida nova!" panelText="Escolha uma senha que você não usa em outros sites.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <h1>Criar nova senha</h1>
        <p className="muted">Depois de salvar, você entra direto na sua conta.</p>
        <Alert onClose={() => setError('')}>
          {error && (
            <>
              {error}
              {error.includes('expirado') && <> <Link to="/esqueci-senha">Pedir novo link</Link></>}
            </>
          )}
        </Alert>
        <div className="field">
          <label htmlFor="new-pw"><span>Nova senha</span></label>
          <PasswordInput id="new-pw" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <small className="muted">Mínimo de 6 caracteres.</small>
        </div>
        <div className="field">
          <label htmlFor="confirm-pw"><span>Repita a senha</span></label>
          <PasswordInput id="confirm-pw" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </div>
        <button className="btn btn-primary btn-block btn-lg" disabled={submitting}>
          {submitting ? <Spinner small /> : 'Salvar nova senha'}
        </button>
      </form>
    </AuthLayout>
  );
}

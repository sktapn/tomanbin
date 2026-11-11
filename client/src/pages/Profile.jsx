import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Alert, Spinner } from '../components/Feedback';
import { PasswordInput, PasswordStrength } from '../components/AuthLayout';
import { STATUS_LABELS, formatDate, formatPrice } from '../utils';

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

const maskCpf = (cpf) => (cpf ? `***.${cpf.slice(3, 6)}.***-${cpf.slice(9, 11)}` : null);

export default function Profile() {
  const { user, setUser, logout, isAdmin } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  const [orders, setOrders] = useState(null);

  // Dados pessoais
  const [name, setName] = useState(user.name);
  const [nameMsg, setNameMsg] = useState({});
  const [savingName, setSavingName] = useState(false);

  // Segurança
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    api
      .get('/orders/mine')
      .then(({ data }) => setOrders(data))
      .catch(() => setOrders([]));
  }, []);

  const stats = useMemo(() => {
    const list = orders || [];
    const valid = list.filter((o) => o.status !== 'cancelado');
    return {
      total: valid.length,
      spent: valid.filter((o) => o.status !== 'pendente').reduce((s, o) => s + o.total, 0),
      pending: list.filter((o) => o.status === 'pendente').length,
    };
  }, [orders]);

  const saveName = async (e) => {
    e.preventDefault();
    setNameMsg({});
    if (name.trim().length < 2) return setNameMsg({ type: 'error', text: 'Informe um nome com pelo menos 2 letras' });
    if (name.trim() === user.name) return setNameMsg({ type: 'info', text: 'Nada para alterar.' });
    setSavingName(true);
    try {
      const { data } = await api.put('/users/me', { name: name.trim() });
      setUser(data);
      setNameMsg({ type: 'success', text: 'Nome atualizado!' });
    } catch (err) {
      setNameMsg({ type: 'error', text: errorMessage(err) });
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwMsg({});
    if (!pw.current) return setPwMsg({ type: 'error', text: 'Informe sua senha atual' });
    if (pw.next.length < 6) return setPwMsg({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres' });
    if (pw.next !== pw.confirm) return setPwMsg({ type: 'error', text: 'As senhas novas não coincidem' });
    setSavingPw(true);
    try {
      await api.put('/users/me', { password: pw.next, currentPassword: pw.current });
      setPw({ current: '', next: '', confirm: '' });
      setPwMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
    } catch (err) {
      setPwMsg({ type: 'error', text: errorMessage(err) });
    } finally {
      setSavingPw(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const recent = (orders || []).slice(0, 3);

  return (
    <div className="profile">
      {/* Cabeçalho */}
      <section className="profile-hero">
        <div className="avatar" aria-hidden="true">{initials(user.name)}</div>
        <div className="profile-id">
          <h1>{user.name}</h1>
          <p>{user.email}</p>
          <div className="profile-tags">
            <span className={`chip ${isAdmin ? 'badge-edicao-limitada' : 'chip-cat'}`}>{isAdmin ? '⭐ Administrador' : '💛 Cliente'}</span>
            {user.createdAt && <span className="chip chip-light">Desde {new Date(user.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>}
          </div>
        </div>
        <div className="profile-stats">
          <div><strong>{orders ? stats.total : '–'}</strong><span>pedidos</span></div>
          <div><strong>{orders ? formatPrice(stats.spent) : '–'}</strong><span>em compras</span></div>
          <div><strong>{orders ? stats.pending : '–'}</strong><span>aguardando pagamento</span></div>
        </div>
      </section>

      <div className="profile-grid">
        <div className="profile-col">
          {/* Dados pessoais */}
          <form className="card profile-card" onSubmit={saveName} noValidate>
            <h2>👤 Dados pessoais</h2>
            <Alert type={nameMsg.type} onClose={() => setNameMsg({})}>{nameMsg.text}</Alert>
            <label className="field">
              <span>Nome</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input className="input" value={user.email} disabled />
              <small className="muted">O e-mail é usado para entrar e não pode ser alterado.</small>
            </label>
            <div className="field">
              <span>CPF (para o Pix)</span>
              <div className="readonly-box">{maskCpf(user.cpf) || 'Ainda não informado. Ele é pedido na primeira compra.'}</div>
            </div>
            <button className="btn btn-primary" disabled={savingName}>{savingName ? <Spinner small /> : 'Salvar nome'}</button>
          </form>

          {/* Segurança */}
          <form className="card profile-card" onSubmit={savePassword} noValidate>
            <h2>🔒 Trocar senha</h2>
            <Alert type={pwMsg.type} onClose={() => setPwMsg({})}>{pwMsg.text}</Alert>
            <div className="field">
              <label htmlFor="pw-current"><span>Senha atual</span></label>
              <PasswordInput id="pw-current" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            </div>
            <div className="row-2 row-even">
              <div className="field">
                <label htmlFor="pw-next"><span>Nova senha</span></label>
                <PasswordInput id="pw-next" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="pw-confirm"><span>Confirmar nova senha</span></label>
                <PasswordInput id="pw-confirm" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} invalid={pw.confirm && pw.confirm !== pw.next} />
              </div>
            </div>
            <PasswordStrength password={pw.next} />
            <button className="btn btn-ghost" disabled={savingPw}>{savingPw ? <Spinner small /> : 'Alterar senha'}</button>
          </form>
        </div>

        <div className="profile-col">
          {/* Pedidos recentes */}
          <section className="card profile-card">
            <div className="card-head">
              <h2>📦 Pedidos recentes</h2>
              {recent.length > 0 && <Link to="/meus-pedidos" className="link-strong">Ver todos →</Link>}
            </div>
            {orders === null ? (
              <Spinner small />
            ) : recent.length === 0 ? (
              <div className="empty-mini">
                <p>Você ainda não fez nenhum pedido.</p>
                <Link to="/loja" className="btn btn-primary btn-sm">Ir às compras</Link>
              </div>
            ) : (
              <ul className="recent-orders">
                {recent.map((o) => (
                  <li key={o._id}>
                    <div>
                      <strong>#{o._id.slice(-6).toUpperCase()}</strong>
                      <small className="muted">{formatDate(o.createdAt)} · {o.items.reduce((s, i) => s + i.quantity, 0)} item(ns)</small>
                    </div>
                    <div className="recent-right">
                      <span className={`status status-${o.status}`}>{STATUS_LABELS[o.status]}</span>
                      <strong>{formatPrice(o.total)}</strong>
                      {o.status === 'pendente' && <Link to={`/pagamento/${o._id}`} className="btn btn-primary btn-sm">Pagar</Link>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Atalhos */}
          <section className="card profile-card">
            <h2>⚡ Atalhos</h2>
            <div className="shortcuts">
              <Link to="/meus-pedidos" className="shortcut yellow"><span>📦</span>Meus pedidos</Link>
              <Link to="/carrinho" className="shortcut wine"><span>🛒</span>Carrinho {count > 0 && `(${count})`}</Link>
              <Link to="/loja" className="shortcut teal"><span>🧸</span>Ver a loja</Link>
              {isAdmin ? (
                <Link to="/admin" className="shortcut purple"><span>📊</span>Painel admin</Link>
              ) : (
                <Link to="/faq" className="shortcut purple"><span>❓</span>Ajuda (FAQ)</Link>
              )}
            </div>
            <button className="btn btn-danger btn-block logout-btn" onClick={handleLogout}>Sair da conta</button>
          </section>
        </div>
      </div>
    </div>
  );
}

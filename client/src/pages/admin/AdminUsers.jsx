import { useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Alert, Spinner } from '../../components/Feedback';
import { formatDate } from '../../utils';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const { user: me } = useAuth();
  const toast = useToast();

  useEffect(() => {
    api
      .get('/users')
      .then(({ data }) => setUsers(data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const changeRole = async (u, role) => {
    setBusy(u._id);
    try {
      const { data } = await api.put(`/users/${u._id}`, { role });
      setUsers((us) => us.map((x) => (x._id === u._id ? data : x)));
      toast(`${data.name} agora é ${role === 'admin' ? 'administrador' : 'cliente'}`, 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Excluir o usuário ${u.name}?`)) return;
    setBusy(u._id);
    try {
      await api.delete(`/users/${u._id}`);
      setUsers((us) => us.filter((x) => x._id !== u._id));
      toast('Usuário excluído', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <h1>Usuários</h1>
      <Alert>{error}</Alert>
      <div className="table-wrap card">
        <table className="table">
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Desde</th><th>Perfil</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isMe = u._id === me._id;
              return (
                <tr key={u._id}>
                  <td data-label="Nome">{u.name} {isMe && <span className="role-tag">você</span>}</td>
                  <td data-label="E-mail">{u.email}</td>
                  <td data-label="Desde">{formatDate(u.createdAt)}</td>
                  <td data-label="Perfil">
                    <select
                      className="input auto"
                      value={u.role}
                      disabled={isMe || busy === u._id}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      <option value="user">Cliente</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="actions">
                    <button className="btn btn-danger btn-sm" disabled={isMe || busy === u._id} onClick={() => remove(u)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

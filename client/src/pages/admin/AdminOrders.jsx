import { useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Alert, Empty, Spinner } from '../../components/Feedback';
import { STATUS_LABELS, formatDate, formatPrice } from '../../utils';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const { socket } = useAuth();
  const toast = useToast();

  const load = () => {
    setLoading(true);
    api
      .get('/orders', { params: { status: filter || undefined } })
      .then(({ data }) => setOrders(data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [filter]);

  useEffect(() => {
    if (!socket) return;
    socket.on('order:new', load);
    return () => socket.off('order:new', load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, filter]);

  const changeStatus = async (o, status) => {
    if (status === 'cancelado' && !window.confirm('Cancelar o pedido? O estoque será devolvido.')) return;
    setBusy(o._id);
    try {
      const { data } = await api.patch(`/orders/${o._id}/status`, { status });
      setOrders((os) => os.map((x) => (x._id === o._id ? data : x)));
      toast('Status atualizado', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (o) => {
    if (!window.confirm('Excluir este pedido definitivamente?')) return;
    setBusy(o._id);
    try {
      await api.delete(`/orders/${o._id}`);
      setOrders((os) => os.filter((x) => x._id !== o._id));
      toast('Pedido excluído', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Pedidos</h1>
        <select className="input auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar status">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <Alert>{error}</Alert>
      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <Empty emoji="📭" title="Nenhum pedido" />
      ) : (
        <div className="orders">
          {orders.map((o) => (
            <article key={o._id} className="card order">
              <header className="order-head">
                <div>
                  <strong>#{o._id.slice(-6).toUpperCase()}</strong>
                  <span className="muted"> · {o.user?.name || 'Usuário removido'} · {formatDate(o.createdAt)}</span>
                  <span className="muted"> · {o.deliveryMethod === 'retirada' ? '🏪 Retirada' : '🚚 Entrega'}</span>
                </div>
                <span className={`status status-${o.status}`}>{STATUS_LABELS[o.status]}</span>
              </header>
              <ul className="order-items">
                {o.items.map((it) => <li key={it.product}>{it.quantity}× {it.name}</li>)}
              </ul>
              {o.payment?.paidAfterCancel && (
                <div className="alert alert-error">
                  Este pedido foi cancelado, mas o Pix foi pago depois. Combine o envio com o cliente ou faça o estorno no
                  painel do gateway.
                </div>
              )}
              <footer className="order-foot">
                <strong>{formatPrice(o.total)}</strong>
                <div className="order-actions">
                  {busy === o._id && <Spinner small />}
                  <select
                    className="input auto"
                    value={o.status}
                    disabled={o.status === 'cancelado' || busy === o._id}
                    onChange={(e) => changeStatus(o, e.target.value)}
                    aria-label="Alterar status"
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button className="btn btn-danger btn-sm" disabled={busy === o._id} onClick={() => remove(o)}>Excluir</button>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

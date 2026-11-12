import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert, Empty, Spinner } from '../components/Feedback';
import { STATUS_LABELS, statusLabel, formatDate, formatPrice } from '../utils';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const { socket } = useAuth();
  const toast = useToast();

  useEffect(() => {
    api
      .get('/orders/mine')
      .then(({ data }) => setOrders(data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onStatus = ({ id, status }) => setOrders((os) => os.map((o) => (o._id === id ? { ...o, status } : o)));
    socket.on('order:status', onStatus);
    return () => socket.off('order:status', onStatus);
  }, [socket]);

  const cancel = async (id) => {
    if (!window.confirm('Cancelar este pedido?')) return;
    setBusyId(id);
    try {
      const { data } = await api.patch(`/orders/${id}/cancel`);
      setOrders((os) => os.map((o) => (o._id === id ? data : o)));
      toast('Pedido cancelado', 'info');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Spinner label="Carregando pedidos..." />;

  return (
    <>
      <h1>Meus pedidos</h1>
      <Alert>{error}</Alert>
      {orders.length === 0 && !error ? (
        <Empty emoji="📦" title="Você ainda não fez pedidos">
          <Link to="/loja" className="btn btn-primary">Ir às compras</Link>
        </Empty>
      ) : (
        <div className="orders">
          {orders.map((o) => (
            <article key={o._id} className="card order">
              <header className="order-head">
                <div>
                  <strong>Pedido #{o._id.slice(-6).toUpperCase()}</strong>
                  <span className="muted"> · {formatDate(o.createdAt)}</span>
                </div>
                <span className={`status status-${o.status}`}>{statusLabel(o)}</span>
              </header>
              <ul className="order-items">
                {o.items.map((it, idx) => (
                  <li key={it.product || `c${idx}`}>
                    {it.quantity}× {it.name} <span className="muted">{formatPrice(it.price * it.quantity)}</span>
                    {it.custom?.notes && <span className="muted"> · 📝 {it.custom.notes}</span>}
                  </li>
                ))}
              </ul>
              <footer className="order-foot">
                <span className="muted">
                  {o.deliveryMethod === 'retirada' ? (
                    '🏪 Retirada na loja (sem frete)'
                  ) : (
                    <>
                      🛵 {o.shippingAddress?.street}
                      {o.shippingAddress?.number ? `, ${o.shippingAddress.number}` : ''}
                      {o.shippingAddress?.complement ? ` - ${o.shippingAddress.complement}` : ''}
                      {o.shippingAddress?.neighborhood ? ` - ${o.shippingAddress.neighborhood}` : ''}, {o.shippingAddress?.city}/
                      {o.shippingAddress?.state}
                      {o.shippingFee ? ` · entrega ${formatPrice(o.shippingFee)}` : ''}
                    </>
                  )}
                  {o.discount > 0 && ` · 🏷️ cupom ${o.couponCode} (− ${formatPrice(o.discount)})`}
                </span>
                <div className="order-actions">
                  <strong>{formatPrice(o.total)}</strong>
                  {o.status === 'pendente' && (
                    <Link to={`/pagamento/${o._id}`} className="btn btn-primary btn-sm">Pagar com Pix</Link>
                  )}
                  {o.status === 'pendente' && (
                    <button className="btn btn-ghost btn-sm" disabled={busyId === o._id} onClick={() => cancel(o._id)}>
                      {busyId === o._id ? <Spinner small /> : 'Cancelar'}
                    </button>
                  )}
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

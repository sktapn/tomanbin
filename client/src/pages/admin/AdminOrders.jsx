import { useEffect, useMemo, useState } from 'react';
import api, { errorMessage } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Alert, Empty, Spinner } from '../../components/Feedback';
import { STATUS_LABELS, formatDate, formatPrice, maskPhone, whatsappLink } from '../../utils';

const PAYMENT_LABELS = { PENDING: 'Aguardando Pix', PAID: 'Pix pago', EXPIRED: 'Pix expirado', CANCELLED: 'Pix cancelado', REFUNDED: 'Estornado' };
const PROVIDER_LABELS = { mercadopago: 'Mercado Pago', asaas: 'Asaas', demo: 'Demonstração' };

function addressLines(a = {}) {
  return [
    [a.street, a.number].filter(Boolean).join(', ') + (a.complement ? ` - ${a.complement}` : ''),
    [a.neighborhood, `${a.city || ''}/${a.state || ''}`].filter(Boolean).join(' - '),
    a.zip ? `CEP ${a.zip}` : '',
  ].filter(Boolean);
}

function OrderCard({ o, busy, onStatus, onTracking, onRemove }) {
  const [tracking, setTracking] = useState(o.trackingCode || '');
  const shortId = o._id.slice(-6).toUpperCase();
  const isPickup = o.deliveryMethod === 'retirada';
  const name = o.user?.name || 'Cliente removido';
  const firstName = name.split(' ')[0];

  const copyAddress = async () => {
    const text = [name, ...addressLines(o.shippingAddress), o.contactPhone ? `Tel: ${maskPhone(o.contactPhone)}` : ''].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      onTracking.toast('Endereço copiado', 'success');
    } catch {
      onTracking.toast('Não foi possível copiar', 'error');
    }
  };

  return (
    <article className="card order admin-order">
      <header className="order-head">
        <div>
          <strong>Pedido #{shortId}</strong>
          <span className="muted"> · {formatDate(o.createdAt)}</span>
        </div>
        <div className="order-badges">
          <span className={`chip ${isPickup ? 'chip-light' : 'chip-cat'}`}>{isPickup ? '🏪 Retirada' : '🚚 Entrega'}</span>
          <span className={`status status-${o.status}`}>{STATUS_LABELS[o.status]}</span>
        </div>
      </header>

      {o.payment?.paidAfterCancel && (
        <div className="alert alert-error">
          Este pedido foi cancelado, mas o Pix foi pago depois. Combine o envio com o cliente ou faça o estorno no painel do gateway.
        </div>
      )}

      <div className="admin-order-grid">
        <section>
          <h3>👤 Cliente</h3>
          <p><strong>{name}</strong></p>
          {o.user?.email && <p className="muted">{o.user.email}</p>}
          {o.contactPhone ? (
            <p>
              {maskPhone(o.contactPhone)}{' '}
              <a
                className="btn btn-sm btn-whats"
                href={whatsappLink(o.contactPhone, `Olá, ${firstName}! Aqui é da Tomanbin, sobre o seu pedido #${shortId}.`)}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            </p>
          ) : (
            <p className="muted">Sem telefone (pedido antigo)</p>
          )}
        </section>

        <section>
          <h3>{isPickup ? '🏪 Retirada' : '🚚 Endereço de entrega'}</h3>
          {isPickup ? (
            <p className="muted">O cliente vai retirar o pedido. Combine pelo WhatsApp.</p>
          ) : (
            <>
              {addressLines(o.shippingAddress).map((l) => <p key={l}>{l}</p>)}
              <button className="btn btn-ghost btn-sm" onClick={copyAddress}>📋 Copiar endereço</button>
            </>
          )}
        </section>

        <section>
          <h3>💸 Pagamento</h3>
          {o.payment?.pixId ? (
            <>
              <p><span className={`pay-badge pay-${o.payment.status}`}>{PAYMENT_LABELS[o.payment.status] || o.payment.status}</span></p>
              <p className="muted">
                {PROVIDER_LABELS[o.payment.provider] || o.payment.provider}
                {o.payment.paidAt ? ` · pago em ${formatDate(o.payment.paidAt)}` : ''}
              </p>
            </>
          ) : (
            <p className="muted">O cliente ainda não gerou o Pix.</p>
          )}
        </section>
      </div>

      <table className="order-table">
        <tbody>
          {o.items.map((it) => (
            <tr key={it.product}>
              <td>{it.quantity}×</td>
              <td>{it.name}</td>
              <td className="num">{formatPrice(it.price * it.quantity)}</td>
            </tr>
          ))}
          <tr className="sub"><td /><td>Produtos</td><td className="num">{formatPrice(o.subtotal ?? o.total)}</td></tr>
          <tr className="sub"><td /><td>Frete</td><td className="num">{o.shippingFee ? formatPrice(o.shippingFee) : 'Grátis'}</td></tr>
          {o.discount > 0 && (
            <tr className="sub discount-line"><td /><td>Cupom {o.couponCode}</td><td className="num">− {formatPrice(o.discount)}</td></tr>
          )}
          <tr className="total"><td /><td>Total</td><td className="num">{formatPrice(o.total)}</td></tr>
        </tbody>
      </table>

      <footer className="order-foot admin-order-foot">
        {!isPickup && o.status !== 'cancelado' && (
          <form
            className="tracking-form"
            onSubmit={(e) => {
              e.preventDefault();
              onTracking.save(o, tracking.trim());
            }}
          >
            <input
              className="input"
              placeholder="Código de rastreio (ex: AA123456789BR)"
              value={tracking}
              onChange={(e) => setTracking(e.target.value.toUpperCase())}
              maxLength={40}
            />
            <button className="btn btn-ghost btn-sm" disabled={busy || tracking === (o.trackingCode || '')}>Salvar</button>
          </form>
        )}
        <div className="order-actions">
          {busy && <Spinner small />}
          <select
            className="input auto"
            value={o.status}
            disabled={o.status === 'cancelado' || busy}
            onChange={(e) => onStatus(o, e.target.value)}
            aria-label="Alterar status"
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => onRemove(o)}>Excluir</button>
        </div>
      </footer>
    </article>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
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
    socket.on('order:paid', load);
    return () => {
      socket.off('order:new', load);
      socket.off('order:paid', load);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, filter]);

  // Busca por número do pedido, nome, e-mail ou telefone
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    const digits = q.replace(/\D/g, '');
    return orders.filter(
      (o) =>
        o._id.slice(-6).toLowerCase().includes(q.replace('#', '')) ||
        o.user?.name?.toLowerCase().includes(q) ||
        o.user?.email?.toLowerCase().includes(q) ||
        (digits.length >= 4 && o.contactPhone?.includes(digits))
    );
  }, [orders, search]);

  const update = async (o, body, okMsg) => {
    setBusy(o._id);
    try {
      const { data } = await api.patch(`/orders/${o._id}/status`, body);
      setOrders((os) => os.map((x) => (x._id === o._id ? data : x)));
      toast(okMsg, 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const changeStatus = (o, status) => {
    if (status === 'cancelado' && !window.confirm('Cancelar o pedido? O estoque será devolvido.')) return;
    update(o, { status }, 'Status atualizado');
  };

  const saveTracking = (o, trackingCode) => {
    // Ao informar o rastreio, o pedido passa para "Enviado" automaticamente
    const status = trackingCode && ['pendente', 'pago'].includes(o.status) ? 'enviado' : o.status;
    update(o, { status, trackingCode }, trackingCode ? 'Rastreio salvo. O cliente já pode acompanhar.' : 'Rastreio removido');
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
        <div className="page-head-tools">
          <input
            className="input"
            type="search"
            placeholder="Buscar nº, nome, e-mail ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar pedido"
          />
          <select className="input auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar status">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <Alert>{error}</Alert>
      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <Empty emoji="📭" title={search ? 'Nenhum pedido encontrado' : 'Nenhum pedido'} />
      ) : (
        <div className="orders">
          {visible.map((o) => (
            <OrderCard
              key={o._id}
              o={o}
              busy={busy === o._id}
              onStatus={changeStatus}
              onTracking={{ save: saveTracking, toast }}
              onRemove={remove}
            />
          ))}
        </div>
      )}
    </>
  );
}

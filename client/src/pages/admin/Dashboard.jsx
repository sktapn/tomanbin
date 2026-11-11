import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Alert, Spinner } from '../../components/Feedback';
import { STATUS_LABELS, formatPrice } from '../../utils';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const { socket } = useAuth();

  const load = useCallback(() => {
    api
      .get('/orders/stats')
      .then(({ data }) => setStats(data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  useEffect(load, [load]);

  // Atualiza o dashboard ao vivo quando chega pedido novo
  useEffect(() => {
    if (!socket) return;
    socket.on('order:new', load);
    return () => socket.off('order:new', load);
  }, [socket, load]);

  if (error) return <Alert>{error}</Alert>;
  if (!stats) return <Spinner label="Carregando dashboard..." />;

  const max = Math.max(1, ...stats.last7Days.map((d) => d.total));

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats">
        <div className="card stat"><span>💰 Total de vendas</span><strong>{formatPrice(stats.totalSales)}</strong></div>
        <div className="card stat"><span>📦 Pedidos válidos</span><strong>{stats.totalOrders}</strong></div>
        <div className="card stat"><span>🧸 Produtos</span><strong>{stats.totalProducts}</strong></div>
        <div className="card stat"><span>👥 Usuários</span><strong>{stats.totalUsers}</strong></div>
      </div>

      <div className="dash-grid">
        <section className="card">
          <h2>Vendas — últimos 7 dias</h2>
          <div className="bars" role="img" aria-label="Gráfico de vendas dos últimos 7 dias">
            {stats.last7Days.map((d) => (
              <div key={d.date} className="bar-col" title={`${d.date}: ${formatPrice(d.total)}`}>
                <span className="bar-value">{d.total ? formatPrice(d.total).replace('R$', '').trim() : ''}</span>
                <div className="bar" style={{ height: `${(d.total / max) * 100}%` }} />
                <span className="bar-label">{d.date.slice(8, 10)}/{d.date.slice(5, 7)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Mais vendidos</h2>
          {stats.topProducts.length === 0 ? (
            <p className="muted">Nenhuma venda ainda.</p>
          ) : (
            <ol className="rank">
              {stats.topProducts.map((p) => (
                <li key={p._id}>
                  <span>{p.name}</span>
                  <span className="muted">{p.qty} un · {formatPrice(p.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card">
          <h2>Pedidos por status</h2>
          <ul className="status-list">
            {Object.entries(STATUS_LABELS).map(([k, label]) => (
              <li key={k}>
                <span className={`status status-${k}`}>{label}</span>
                <strong>{stats.ordersByStatus[k] || 0}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>⚠️ Estoque baixo</h2>
          {stats.lowStock.length === 0 ? (
            <p className="muted">Tudo certo com o estoque.</p>
          ) : (
            <ul className="rank">
              {stats.lowStock.map((p) => (
                <li key={p._id}>
                  <Link to={`/admin/produtos/${p._id}/editar`}>{p.name}</Link>
                  <span className={p.stock === 0 ? 'stock out' : 'stock low'}>{p.stock} un</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import Sidebar from '../components/Sidebar';
import { Alert, Empty, SkeletonCard } from '../components/Feedback';
import { CATEGORY_LABELS } from '../utils';
import { PROMO_MESSAGE } from '../config';


function Marquee({ text }) {
  // Repete o texto várias vezes; a lista é duplicada para o loop não ter "pulo"
  const items = Array.from({ length: 10 }, () => text);
  return (
    <div className="marquee" role="marquee" aria-label={text}>
      <div className="marquee-track" aria-hidden="true">
        {[...items, ...items].map((t, i) => (
          <span key={i}>{t} <b>✦</b></span>
        ))}
      </div>
    </div>
  );
}

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const category = params.get('categoria') || '';
  const sort = params.get('ordem') || 'recent';
  const page = Number(params.get('pagina') || 1);
  const [search, setSearch] = useState(params.get('busca') || '');

  const [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { socket } = useAuth();

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('pagina' in changes)) next.delete('pagina');
    setParams(next);
  };

  // Busca com "debounce" de 400ms
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('busca') || '') !== search) update({ busca: search });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api
      .get('/products', {
        params: {
          category: category || undefined,
          search: params.get('busca') || undefined,
          sort,
          page,
          limit: 12,
        },
        signal: controller.signal,
      })
      .then(({ data }) => setData(data))
      .catch((err) => {
        if (err.name !== 'CanceledError') setError(errorMessage(err));
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [category, sort, page, params]);


  // Estoque ao vivo
  useEffect(() => {
    if (!socket) return;
    const onStock = ({ productId, stock }) =>
      setData((d) => ({ ...d, items: d.items.map((p) => (p._id === productId ? { ...p, stock } : p)) }));
    socket.on('stock:update', onStock);
    return () => socket.off('stock:update', onStock);
  }, [socket]);

  const title = category ? CATEGORY_LABELS[category] : 'Todos os produtos';

  return (
    <div className="shop">
        <Sidebar category={category} onChange={update} />

        <section className="shop-main">
          <div className="shop-banner">
            <h1>{title}</h1>
          </div>

          {PROMO_MESSAGE && <Marquee text={PROMO_MESSAGE} />}

          <div className="shop-tools">
            <input
              className="input"
              type="search"
              placeholder="🔎 Buscar na loja..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar produto"
            />
            <select className="input" value={sort} onChange={(e) => update({ ordem: e.target.value })} aria-label="Ordenar">
              <option value="recent">Mais recentes</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
              <option value="name">Nome (A-Z)</option>
            </select>
            <span className="muted count">{loading ? '...' : `${data.total} produto(s)`}</span>
          </div>

          <Alert>{error}</Alert>

          {loading ? (
            <div className="grid">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : data.items.length === 0 && !error ? (
            <Empty emoji="🔍" title="Nenhum produto por aqui">
              <p>Tente outra categoria ou busca.</p>
              <button className="btn btn-primary" onClick={() => { setSearch(''); setParams({}); }}>Ver tudo</button>
            </Empty>
          ) : (
            <>
              <div className="grid">
                {data.items.map((p) => <ProductCard key={p._id} product={p} />)}
                {data.items.length % 4 !== 0 && page === data.pages && (
                  <div className="promo-tile" aria-hidden="true">
                    <span>TOMANBIN</span>
                    <span>TOMANBIN</span>
                    <span>TOMANBIN</span>
                    <em>desde 2026 ✦</em>
                  </div>
                )}
              </div>
              {data.pages > 1 && (
                <div className="pagination">
                  <button className="btn btn-ghost" disabled={page <= 1} onClick={() => update({ pagina: String(page - 1) })}>← Anterior</button>
                  <span>Página {page} de {data.pages}</span>
                  <button className="btn btn-ghost" disabled={page >= data.pages} onClick={() => update({ pagina: String(page + 1) })}>Próxima →</button>
                </div>
              )}
            </>
          )}
        </section>
    </div>
  );
}

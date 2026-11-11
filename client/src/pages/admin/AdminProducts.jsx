import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { Alert, Empty, Spinner } from '../../components/Feedback';
import { CATEGORY_LABELS, PLACEHOLDER_IMG, formatPrice } from '../../utils';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api
      .get('/products', { params: { all: true, limit: 50 } })
      .then(({ data }) => setProducts(data.items))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (p) => {
    if (!window.confirm(`Excluir "${p.name}"? Essa ação não pode ser desfeita.`)) return;
    setDeleting(p._id);
    try {
      await api.delete(`/products/${p._id}`);
      setProducts((ps) => ps.filter((x) => x._id !== p._id));
      toast('Produto excluído', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Produtos</h1>
        <Link to="/admin/produtos/novo" className="btn btn-primary">+ Novo produto</Link>
      </div>
      <Alert>{error}</Alert>
      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <Empty emoji="🧸" title="Nenhum produto cadastrado" />
      ) : (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr><th></th><th>Nome</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td><img className="table-thumb" src={p.images[0] || PLACEHOLDER_IMG} alt="" onError={(e) => (e.currentTarget.src = PLACEHOLDER_IMG)} /></td>
                  <td data-label="Nome"><Link to={`/produto/${p._id}`}>{p.name}</Link></td>
                  <td data-label="Categoria">{CATEGORY_LABELS[p.category]}</td>
                  <td data-label="Preço">{formatPrice(p.price)}</td>
                  <td data-label="Estoque"><span className={p.stock === 0 ? 'stock out' : p.stock <= 3 ? 'stock low' : ''}>{p.stock}</span></td>
                  <td data-label="Status">{p.active ? '🟢 Ativo' : '⚪ Oculto'}</td>
                  <td className="actions">
                    <Link to={`/admin/produtos/${p._id}/editar`} className="btn btn-ghost btn-sm">Editar</Link>
                    <button className="btn btn-danger btn-sm" disabled={deleting === p._id} onClick={() => remove(p)}>
                      {deleting === p._id ? <Spinner small /> : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

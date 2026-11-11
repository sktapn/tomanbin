import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { Alert, Spinner } from '../../components/Feedback';
import { CATEGORY_LABELS, PLACEHOLDER_IMG, TAG_LABELS } from '../../utils';

const EMPTY = { name: '', description: '', price: '', category: 'buttons', stock: 0, tag: '', active: true, images: [''] };

export default function ProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) return;
    api
      .get(`/products/${id}`)
      .then(({ data }) => setForm({ ...data, images: data.images.length ? data.images : [''] }))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, editing]);

  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const setImage = (i, v) => setForm({ ...form, images: form.images.map((x, j) => (j === i ? v : x)) });
  const addImage = () => form.images.length < 6 && setForm({ ...form, images: [...form.images, ''] });
  const removeImage = (i) => setForm({ ...form, images: form.images.filter((_, j) => j !== i) });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Informe o nome do produto');
    if (form.price === '' || Number(form.price) < 0) return setError('Informe um preço válido');

    const body = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      category: form.category,
      tag: form.tag || '',
      stock: Number(form.stock),
      active: form.active,
      images: form.images.map((s) => s.trim()).filter(Boolean),
    };

    setSaving(true);
    try {
      if (editing) await api.put(`/products/${id}`, body);
      else await api.post('/products', body);
      toast(editing ? 'Produto atualizado' : 'Produto criado', 'success');
      navigate('/admin/produtos');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <form className="card form-card" onSubmit={submit} noValidate>
      <h1>{editing ? 'Editar produto' : 'Novo produto'}</h1>
      <Alert onClose={() => setError('')}>{error}</Alert>

      <label className="field"><span>Nome *</span><input className="input" value={form.name} onChange={set('name')} /></label>
      <label className="field"><span>Descrição</span><textarea className="input" rows={4} value={form.description} onChange={set('description')} /></label>

      <div className="row-3">
        <label className="field"><span>Preço (R$) *</span><input className="input" type="number" step="0.01" min="0" value={form.price} onChange={set('price')} /></label>
        <label className="field"><span>Estoque</span><input className="input" type="number" min="0" step="1" value={form.stock} onChange={set('stock')} /></label>
        <label className="field">
          <span>Categoria *</span>
          <select className="input" value={form.category} onChange={set('category')}>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Selo no card</span>
        <select className="input" value={form.tag || ''} onChange={set('tag')}>
          <option value="">Sem selo</option>
          {Object.entries(TAG_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>

      <fieldset className="field">
        <span>Imagens (URLs, até 6)</span>
        {form.images.map((src, i) => (
          <div key={i} className="image-row">
            <img src={src || PLACEHOLDER_IMG} alt="" onError={(e) => (e.currentTarget.src = PLACEHOLDER_IMG)} />
            <input className="input" placeholder="https://..." value={src} onChange={(e) => setImage(i, e.target.value)} />
            <button type="button" className="btn btn-icon" onClick={() => removeImage(i)} aria-label="Remover imagem">✕</button>
          </div>
        ))}
        {form.images.length < 6 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={addImage}>+ Adicionar imagem</button>
        )}
      </fieldset>

      <label className="check">
        <input type="checkbox" checked={form.active} onChange={set('active')} /> Visível na loja
      </label>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin/produtos')}>Cancelar</button>
        <button className="btn btn-primary" disabled={saving}>{saving ? <Spinner small /> : 'Salvar'}</button>
      </div>
    </form>
  );
}

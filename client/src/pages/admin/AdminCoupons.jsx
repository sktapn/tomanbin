import { useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { Alert, Spinner } from '../../components/Feedback';
import { formatPrice } from '../../utils';

const EMPTY = { code: '', type: 'percentual', value: '', minSubtotal: '', maxUses: '', onePerCustomer: false, expiresAt: '', active: true, showInBanner: false, bannerText: '' };

const describe = (c) =>
  c.type === 'frete' ? 'Frete grátis' : c.type === 'percentual' ? `${c.value}% nos produtos` : `${formatPrice(c.value)} nos produtos`;

const statusOf = (c) => {
  if (!c.active) return ['Desativado', 'coupon-off'];
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return ['Expirado', 'coupon-off'];
  if (c.maxUses && c.uses >= c.maxUses) return ['Esgotado', 'coupon-off'];
  return ['Ativo', 'status-entregue'];
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // id do cupom em edição
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/coupons')
      .then(({ data }) => setCoupons(data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const edit = (c) => {
    setEditing(c._id);
    setForm({
      code: c.code, type: c.type, value: c.type === 'frete' ? '' : c.value,
      minSubtotal: c.minSubtotal || '', maxUses: c.maxUses || '', onePerCustomer: c.onePerCustomer,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '', active: c.active,
      showInBanner: !!c.showInBanner, bannerText: c.bannerText || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => { setEditing(null); setForm(EMPTY); setError(''); };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const body = {
      ...form,
      value: form.type === 'frete' ? undefined : Number(form.value),
      minSubtotal: Number(form.minSubtotal || 0),
      maxUses: Number(form.maxUses || 0),
      // validade até o fim do dia escolhido
      expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
    };
    try {
      if (editing) {
        const { data } = await api.put(`/coupons/${editing}`, body);
        setCoupons((cs) => cs.map((c) => (c._id === editing ? data : c)));
        toast(`Cupom ${data.code} atualizado`, 'success');
      } else {
        const { data } = await api.post('/coupons', body);
        setCoupons((cs) => [data, ...cs]);
        toast(`Cupom ${data.code} criado`, 'success');
      }
      // recarrega: marcar um cupom na faixa tira o destaque dos outros
      api.get('/coupons').then(({ data }) => setCoupons(data)).catch(() => {});
      reset();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c) => {
    try {
      const { data } = await api.put(`/coupons/${c._id}`, { active: !c.active });
      setCoupons((cs) => cs.map((x) => (x._id === c._id ? data : x)));
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Excluir o cupom ${c.code}? Pedidos antigos continuam mostrando o desconto.`)) return;
    try {
      await api.delete(`/coupons/${c._id}`);
      setCoupons((cs) => cs.filter((x) => x._id !== c._id));
      if (editing === c._id) reset();
      toast('Cupom excluído', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <h1>Cupons</h1>
      <form className="card coupon-form" onSubmit={save} noValidate>
        <h2>{editing ? `Editar ${form.code}` : 'Novo cupom'}</h2>
        <Alert>{error}</Alert>
        <div className="form-row">
          <label className="field">
            <span>Código</span>
            <input className="input" value={form.code} maxLength={20} placeholder="BEMVINDO10"
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} />
          </label>
          <label className="field">
            <span>Tipo</span>
            <select className="input" value={form.type} onChange={set('type')}>
              <option value="percentual">% de desconto</option>
              <option value="valor">R$ de desconto</option>
              <option value="frete">Frete grátis</option>
            </select>
          </label>
          {form.type !== 'frete' && (
            <label className="field">
              <span>{form.type === 'percentual' ? 'Desconto (%)' : 'Desconto (R$)'}</span>
              <input className="input" type="number" min="0" step={form.type === 'percentual' ? 1 : 0.01}
                value={form.value} onChange={set('value')} placeholder={form.type === 'percentual' ? '10' : '5,00'} />
            </label>
          )}
          <label className="field">
            <span>Compra mínima (R$)</span>
            <input className="input" type="number" min="0" step="0.01" value={form.minSubtotal} onChange={set('minSubtotal')} placeholder="sem mínimo" />
          </label>
          <label className="field">
            <span>Limite de usos</span>
            <input className="input" type="number" min="0" step="1" value={form.maxUses} onChange={set('maxUses')} placeholder="ilimitado" />
          </label>
          <label className="field">
            <span>Válido até</span>
            <input className="input" type="date" value={form.expiresAt} onChange={set('expiresAt')} />
          </label>
        </div>
        <label className="check"><input type="checkbox" checked={form.onePerCustomer} onChange={set('onePerCustomer')} /> Só 1 uso por cliente</label>
        <label className="check"><input type="checkbox" checked={form.active} onChange={set('active')} /> Ativo</label>
        <label className="check">
          <input type="checkbox" checked={form.showInBanner} onChange={set('showInBanner')} /> Mostrar na faixa da loja
        </label>
        {form.showInBanner && (
          <label className="field">
            <span>Mensagem da faixa (opcional)</span>
            <input className="input" maxLength={120} value={form.bannerText} onChange={set('bannerText')}
              placeholder={`Ex: Primeira compra? Use o cupom ${form.code || 'BEMVINDO10'} e ganhe 10% de desconto`} />
            <small className="muted">
              Deixe vazio para uma mensagem automática. Só um cupom fica na faixa por vez, e ela some sozinha quando o
              cupom expira, esgota ou é desativado.
            </small>
          </label>
        )}
        <div className="row-actions">
          <button className="btn btn-primary" disabled={saving}>{saving ? <Spinner small /> : editing ? 'Salvar' : 'Criar cupom'}</button>
          {editing && <button type="button" className="btn btn-ghost" onClick={reset}>Cancelar</button>}
        </div>
      </form>

      {coupons.length === 0 ? (
        <p className="muted">Nenhum cupom ainda. Crie o primeiro acima.</p>
      ) : (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr><th>Código</th><th>Desconto</th><th>Regras</th><th>Usos</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const [label, cls] = statusOf(c);
                const rules = [
                  c.minSubtotal ? `mín. ${formatPrice(c.minSubtotal)}` : null,
                  c.onePerCustomer ? '1 por cliente' : null,
                  c.expiresAt ? `até ${new Date(c.expiresAt).toLocaleDateString('pt-BR')}` : null,
                ].filter(Boolean).join(' · ') || '—';
                return (
                  <tr key={c._id}>
                    <td data-label="Código">
                      <strong className="coupon-code">{c.code}</strong>
                      {c.showInBanner && <span className="role-tag" title="Aparece na faixa da loja">na faixa</span>}
                    </td>
                    <td data-label="Desconto">{describe(c)}</td>
                    <td data-label="Regras">{rules}</td>
                    <td data-label="Usos">{c.uses}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                    <td data-label="Status"><span className={`status ${cls}`}>{label}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-sm" onClick={() => edit(c)}>Editar</button>
                        <button className="btn btn-sm" onClick={() => toggle(c)}>{c.active ? 'Desativar' : 'Ativar'}</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => remove(c)} aria-label={`Excluir ${c.code}`}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

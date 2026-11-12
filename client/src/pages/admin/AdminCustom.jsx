import { useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { Alert, Spinner } from '../../components/Feedback';

/** Admin → Personalizados: preços, medidas, prazo de produção e liga/desliga */
export default function AdminCustom() {
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/custom/admin').then(({ data }) => setCfg(data)).catch((err) => setError(errorMessage(err)));
  }, []);

  const setOpt = (id, key, value) =>
    setCfg((c) => ({ ...c, options: c.options.map((o) => (o.id === id ? { ...o, [key]: value } : o)) }));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        enabled: cfg.enabled,
        productionDays: Number(cfg.productionDays),
        options: cfg.options.map(({ id, label, detail, price, active }) => ({ id, label, detail, price: Number(price), active })),
      };
      const { data } = await api.put('/custom', body);
      setCfg(data);
      toast('Personalizados atualizados', 'success');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!cfg) return error ? <Alert>{error}</Alert> : <Spinner />;

  return (
    <>
      <h1>Personalizados</h1>
      <p className="muted">
        O que aparece na página <a href="/personalizado" target="_blank" rel="noreferrer">Faça o seu</a>. Os preços valem para
        os próximos pedidos. Pedidos já feitos mantêm o preço da compra.
      </p>
      <form className="card coupon-form" onSubmit={save} noValidate>
        <Alert>{error}</Alert>
        <label className="check">
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />
          Página "Faça o seu" ativa
        </label>
        <label className="field" style={{ maxWidth: 260 }}>
          <span>Prazo de produção (dias úteis)</span>
          <input className="input" type="number" min="0" max="60" value={cfg.productionDays}
            onChange={(e) => setCfg({ ...cfg, productionDays: e.target.value })} />
        </label>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Ativo</th><th>Nome</th><th>Medida</th><th>Preço (R$)</th></tr>
            </thead>
            <tbody>
              {cfg.options.map((o) => (
                <tr key={o.id}>
                  <td data-label="Ativo">
                    <input type="checkbox" checked={o.active} onChange={(e) => setOpt(o.id, 'active', e.target.checked)} aria-label={`${o.label} ativo`} />
                  </td>
                  <td data-label="Nome"><input className="input" value={o.label} maxLength={40} onChange={(e) => setOpt(o.id, 'label', e.target.value)} /></td>
                  <td data-label="Medida"><input className="input" value={o.detail} maxLength={40} onChange={(e) => setOpt(o.id, 'detail', e.target.value)} /></td>
                  <td data-label="Preço"><input className="input" type="number" min="0.5" step="0.01" value={o.price} onChange={(e) => setOpt(o.id, 'price', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row-actions" style={{ marginTop: '1rem' }}>
          <button className="btn btn-primary" disabled={saving}>{saving ? <Spinner small /> : 'Salvar'}</button>
        </div>
      </form>
    </>
  );
}

import { useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { Alert } from '../../components/Feedback';

/** Liga/desliga o modo manutenção (clientes veem "Voltamos já"; o admin continua usando tudo) */
export default function MaintenanceCard() {
  const [state, setState] = useState(null); // { enabled, message }
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/store').then(({ data }) => {
      setState(data.maintenance);
      setMessage(data.maintenance?.message || '');
    }).catch((err) => setError(errorMessage(err)));
  }, []);

  const save = async (enabled) => {
    setError('');
    setSaving(true);
    try {
      const { data } = await api.put('/store/maintenance', { enabled, message: message.trim() });
      setState(data.maintenance);
      setMessage(data.maintenance.message);
      // avisa o resto do site (faixa do admin) sem precisar recarregar
      window.dispatchEvent(new CustomEvent('tomanbin:store-changed', { detail: { maintenance: data.maintenance } }));
      toast(enabled ? 'Loja em manutenção: os clientes veem "Voltamos já"' : 'Loja aberta de novo!', 'success');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!state) return error ? <Alert>{error}</Alert> : null;

  return (
    <section className={`card maintenance-admin ${state.enabled ? 'on' : ''}`}>
      <div className="maintenance-admin-head">
        <div>
          <h2>🛠️ Modo manutenção</h2>
          <p className="muted">
            {state.enabled
              ? 'LIGADO: os clientes veem a página "Voltamos já" e não conseguem comprar nem se cadastrar. Você continua usando o site normalmente.'
              : 'Desligado: a loja está aberta. Ligue quando quiser arrumar as coisas sem ninguém comprando.'}
          </p>
        </div>
        <button
          type="button"
          className={`btn ${state.enabled ? 'btn-yellow' : 'btn-primary'}`}
          disabled={saving}
          onClick={() => save(!state.enabled)}
        >
          {saving ? 'Salvando...' : state.enabled ? 'Abrir a loja' : 'Ligar manutenção'}
        </button>
      </div>
      <Alert>{error}</Alert>
      <label className="field">
        <span>Mensagem para os clientes</span>
        <input
          className="input"
          value={message}
          maxLength={200}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Estamos fazendo uns ajustes na loja. Daqui a pouquinho ela volta!"
        />
        <small className="muted">
          {state.enabled ? 'Mudou o texto? Clique em "Salvar mensagem".' : 'Vale quando a manutenção for ligada.'}
        </small>
      </label>
      {state.enabled && (
        <button type="button" className="btn btn-ghost btn-sm" disabled={saving} onClick={() => save(true)}>
          Salvar mensagem
        </button>
      )}
    </section>
  );
}

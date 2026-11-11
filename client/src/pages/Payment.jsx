import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert, Spinner } from '../components/Feedback';
import { formatPrice } from '../utils';

const POLL_MS = 4000;

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target) return null;
  const ms = Math.max(0, new Date(target).getTime() - now);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return { ms, text: h ? `${h}h${pad(m)}min` : `${m}:${pad(s)}` };
}

const qrSrc = (b64) => (b64?.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`);

export default function Payment() {
  const { id } = useParams();
  const { socket } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [needCpf, setNeedCpf] = useState(false);
  const [cpf, setCpf] = useState('');
  const [cpfError, setCpfError] = useState('');

  const pix = data?.pix;
  const paid = data?.orderStatus === 'pago' || pix?.status === 'PAID' || ['enviado', 'entregue'].includes(data?.orderStatus);
  const countdown = useCountdown(pix?.expiresAt);
  const expired = pix && !paid && (pix.status === 'EXPIRED' || countdown?.ms === 0);

  // Gera (ou reaproveita) o Pix do pedido
  const generate = useCallback(async (cpfValue) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/orders/${id}/pay`, cpfValue ? { cpf: cpfValue } : {});
      setData(res.data);
      setNeedCpf(false);
    } catch (err) {
      // O Asaas exige CPF: pede para o cliente informar
      if (err.response?.data?.details?.code === 'CPF_REQUIRED') {
        setNeedCpf(true);
        setCpfError(cpfValue ? errorMessage(err) : '');
        setLoading(false);
        return;
      }
      // Pedido já pago: só mostra o status
      try {
        const res = await api.get(`/orders/${id}/payment`);
        setData(res.data);
      } catch {
        setError(errorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Gera o Pix uma única vez ao abrir a página
  // (em desenvolvimento o React roda os efeitos 2x; o ref impede a cobrança duplicada)
  const started = useRef(null);
  useEffect(() => {
    if (started.current === id) return;
    started.current = id;
    generate();
  }, [generate, id]);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get(`/orders/${id}/payment`);
      setData(res.data);
    } catch {
      /* tenta de novo no próximo ciclo */
    }
  }, [id]);

  // Confere o pagamento a cada 4 segundos enquanto estiver pendente
  useEffect(() => {
    if (!pix || paid || expired) return;
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [pix, paid, expired, refresh]);

  // Aviso em tempo real (Socket.io)
  useEffect(() => {
    if (!socket) return;
    const onStatus = (o) => String(o.id) === id && refresh();
    socket.on('order:status', onStatus);
    return () => socket.off('order:status', onStatus);
  }, [socket, id, refresh]);

  useEffect(() => {
    if (paid) toast('Pagamento confirmado! 🎉', 'success');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pix.brCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast('Não deu para copiar. Selecione o código e copie manualmente.', 'error');
    }
  };

  const simulate = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/orders/${id}/payment/simulate`);
      setData(res.data);
      if (res.data.pix?.provider === 'mercadopago' && res.data.pix?.status === 'PENDING') {
        toast('Ainda não confirmou. Aguarde alguns segundos e tente de novo.', 'info');
      }
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const maskCpf = (v) =>
    v
      .replace(/\D/g, '')
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

  if (loading) return <Spinner label="Gerando seu Pix..." />;

  if (needCpf) {
    return (
      <div className="pay-page">
        <form
          className="card auth-card pay-cpf"
          onSubmit={(e) => {
            e.preventDefault();
            if (cpf.replace(/\D/g, '').length !== 11) return setCpfError('Digite os 11 números do CPF');
            generate(cpf);
          }}
          noValidate
        >
          <h1>Quase lá! 💸</h1>
          <p className="muted">Para gerar o Pix, precisamos do CPF de quem vai pagar. Você só informa uma vez.</p>
          <Alert onClose={() => setCpfError('')}>{cpfError}</Alert>
          <label className="field">
            <span>CPF</span>
            <input
              className={`input ${cpfError ? 'invalid' : ''}`}
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
              autoFocus
            />
          </label>
          <button className="btn btn-primary btn-block">Gerar Pix</button>
        </form>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pay-page">
        <Alert>{error}</Alert>
        <div className="pay-actions">
          <button className="btn btn-primary" onClick={() => generate()}>Tentar de novo</button>
          <Link to="/meus-pedidos" className="btn btn-ghost">Meus pedidos</Link>
        </div>
      </div>
    );
  }

  const shortId = String(id).slice(-6).toUpperCase();

  if (paid) {
    return (
      <div className="pay-page">
        <div className="card pay-done">
          <div className="pay-done-emoji">🎉</div>
          <h1>Pagamento confirmado!</h1>
          <p>
            Recebemos o pagamento do pedido <strong>#{shortId}</strong> ({formatPrice(data.total)}). Agora é com a
            gente: vamos separar seus produtos com carinho.
          </p>
          <div className="pay-actions">
            <Link to="/meus-pedidos" className="btn btn-primary">Ver meus pedidos</Link>
            <Link to="/loja" className="btn btn-ghost">Continuar comprando</Link>
          </div>
        </div>
      </div>
    );
  }

  if (data?.orderStatus === 'cancelado') {
    return (
      <div className="pay-page">
        <Alert>Este pedido foi cancelado.</Alert>
        <Link to="/loja" className="btn btn-primary">Voltar para a loja</Link>
      </div>
    );
  }

  return (
    <div className="pay-page">
      <div className="shop-banner teal">
        <h1>Pagar com Pix</h1>
      </div>

      <div className="card pay-card">
        <div className="pay-qr">
          {expired ? (
            <div className="pay-expired">
              <p>⏰ Este Pix expirou.</p>
              <button className="btn btn-primary" onClick={() => generate()}>Gerar novo Pix</button>
            </div>
          ) : (
            <img src={qrSrc(pix.brCodeBase64)} alt="QR Code Pix para pagamento" />
          )}
        </div>

        <div className="pay-info">
          <span className="muted">Pedido #{shortId}</span>
          <p className="price big">{formatPrice(data.total)}</p>

          <ol className="pay-steps">
            <li>Abra o app do seu banco e escolha <strong>Pix</strong>.</li>
            <li>Escaneie o QR Code ou use o <strong>Pix copia e cola</strong>.</li>
            <li>Confirme o pagamento. Esta página atualiza sozinha!</li>
          </ol>

          {!expired && (
            <>
              <label className="field">
                <span>Pix copia e cola</span>
                <textarea className="input pay-code" readOnly rows={3} value={pix.brCode} onFocus={(e) => e.target.select()} />
              </label>
              <button className="btn btn-yellow btn-block" onClick={copy}>
                {copied ? '✅ Código copiado!' : '📋 Copiar código Pix'}
              </button>

              <div className="pay-status">
                <Spinner small /> Aguardando pagamento… expira em <strong>{countdown?.text}</strong>
              </div>
            </>
          )}

          {pix.devMode && !expired && (
            <div className="pay-dev">
              <strong>
                {pix.provider === 'demo'
                  ? '🧪 Modo demonstração'
                  : pix.provider === 'mercadopago'
                    ? '🧪 Modo de teste (Mercado Pago)'
                    : '🧪 Modo de teste (Sandbox do Asaas)'}
              </strong>
              <p>
                {pix.provider === 'demo'
                  ? 'Este Pix é só de exemplo: nenhum banco consegue pagar e nada é cobrado. Clique abaixo para simular o pagamento.'
                  : pix.provider === 'mercadopago'
                    ? 'Nenhum dinheiro de verdade é cobrado. No teste, o Mercado Pago aprova este Pix sozinho em alguns segundos.'
                    : 'Nenhum dinheiro de verdade é cobrado. Use o botão abaixo para simular o pagamento.'}
              </p>
              <button className="btn btn-primary btn-block" disabled={busy} onClick={simulate}>
                {busy ? <Spinner small /> : pix.provider === 'mercadopago' ? 'Verificar pagamento agora' : 'Simular pagamento'}
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="muted center">
        {pix?.provider === 'demo' ? (
          <>Modo demonstração: nenhum valor é cobrado. </>
        ) : (
          <>Pagamento processado com segurança pelo <strong>{pix?.provider === 'mercadopago' ? 'Mercado Pago' : 'Asaas'}</strong>. </>
        )}
        <Link to="/meus-pedidos">Pagar depois</Link>
      </p>
    </div>
  );
}

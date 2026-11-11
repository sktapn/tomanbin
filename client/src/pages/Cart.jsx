import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { Alert, Empty, Spinner } from '../components/Feedback';
import { PLACEHOLDER_IMG, formatPrice, maskPhone } from '../utils';
import { lookupCep, maskCep } from '../services/cep';

export default function Cart() {
  const { items, setQuantity, remove, clear, total } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const EMPTY_ADDRESS = { zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [cepStatus, setCepStatus] = useState({ loading: false, error: '', found: false });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const numberRef = useRef(null);
  const [delivery, setDelivery] = useState('entrega'); // 'entrega' | 'retirada'
  const [phone, setPhone] = useState(() => maskPhone(user?.phone || ''));
  const [shipping, setShipping] = useState({ fee: 15, pickupInfo: '' });

  // Valor do frete vem do servidor (é ele quem calcula o total de verdade)
  useEffect(() => {
    api.get('/orders/shipping').then(({ data }) => setShipping(data)).catch(() => {});
  }, []);

  // se o login terminar de carregar depois, preenche o telefone salvo
  useEffect(() => {
    if (user?.phone) setPhone((p) => p || maskPhone(user.phone));
  }, [user?.phone]);

  const shippingFee = delivery === 'entrega' ? shipping.fee : 0;
  const grandTotal = total + shippingFee;

  if (items.length === 0) {
    return (
      <Empty emoji="🛒" title="Seu carrinho está vazio">
        <Link to="/loja" className="btn btn-primary">Ver produtos</Link>
      </Empty>
    );
  }

  const set = (k) => (e) => setAddress({ ...address, [k]: e.target.value });

  // Digitou o CEP completo -> busca e preenche o endereço
  const onCepChange = async (e) => {
    const zip = maskCep(e.target.value);
    setAddress((a) => ({ ...a, zip }));
    if (zip.replace(/\D/g, '').length !== 8) {
      setCepStatus({ loading: false, error: '', found: false });
      return;
    }
    setCepStatus({ loading: true, error: '', found: false });
    try {
      const found = await lookupCep(zip);
      setAddress((a) => ({ ...a, ...found, zip }));
      setCepStatus({ loading: false, error: '', found: true });
      setTimeout(() => numberRef.current?.focus(), 50); // só falta o número!
    } catch (err) {
      setCepStatus({ loading: false, error: `${err.message}. Preencha o endereço manualmente.`, found: false });
    }
  };

  const checkout = async (e) => {
    e.preventDefault();
    setError('');
    if (!user) return navigate('/login', { state: { from: '/carrinho' } });
    if (phone.replace(/\D/g, '').length < 10) return setError('Informe um telefone/WhatsApp com DDD para contato.');
    const required = ['zip', 'street', 'number', 'neighborhood', 'city', 'state'];
    if (delivery === 'entrega' && required.some((k) => !address[k].trim())) {
      return setError('Preencha o endereço completo (o complemento é opcional).');
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/orders', {
        items: items.map((i) => ({ product: i._id, quantity: i.quantity })),
        contactPhone: phone,
        deliveryMethod: delivery,
        ...(delivery === 'entrega' && { shippingAddress: address }),
      });
      clear();
      toast('Pedido criado! Agora é só pagar com Pix 💸', 'success');
      navigate(`/pagamento/${data._id}`);
    } catch (err) {
      setError(errorMessage(err)); // ex: estoque insuficiente
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cart">
      <section>
        <div className="cart-head">
          <h1>Carrinho</h1>
          <Link to="/loja" className="btn btn-ghost btn-sm">← Continuar comprando</Link>
        </div>
        <ul className="cart-list">
          {items.map((i) => (
            <li key={i._id} className="card cart-item">
              <img src={i.image || PLACEHOLDER_IMG} alt="" onError={(e) => (e.currentTarget.src = PLACEHOLDER_IMG)} />
              <div className="cart-item-info">
                <Link to={`/produto/${i._id}`}><strong>{i.name}</strong></Link>
                <span className="muted">{formatPrice(i.price)} cada</span>
              </div>
              <div className="qty">
                <button onClick={() => setQuantity(i._id, i.quantity - 1)} aria-label="Diminuir">−</button>
                <span>{i.quantity}</span>
                <button onClick={() => setQuantity(i._id, i.quantity + 1)} aria-label="Aumentar">+</button>
              </div>
              <strong className="cart-subtotal">{formatPrice(i.price * i.quantity)}</strong>
              <button className="btn btn-icon" onClick={() => remove(i._id)} aria-label={`Remover ${i.name}`}>🗑️</button>
            </li>
          ))}
        </ul>
        <button className="btn btn-ghost btn-sm" onClick={clear}>Esvaziar carrinho</button>
      </section>

      <form className="card checkout" onSubmit={checkout} noValidate>
        <h2>Finalizar compra</h2>
        <Alert onClose={() => setError('')}>{error}</Alert>
        {user ? (
          <>
            <label className="field">
              <span>Telefone / WhatsApp</span>
              <input
                className="input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(95) 99123-4567"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
              />
              <small className="muted">Usamos só para falar sobre o seu pedido.</small>
            </label>

            <fieldset className="delivery" aria-label="Forma de entrega">
              <label className={`delivery-opt ${delivery === 'entrega' ? 'active' : ''}`}>
                <input type="radio" name="delivery" value="entrega" checked={delivery === 'entrega'} onChange={() => setDelivery('entrega')} />
                <span className="delivery-icon">🚚</span>
                <span className="delivery-text">
                  <strong>Receber em casa</strong>
                  <small>Frete fixo para todo o Brasil</small>
                </span>
                <strong className="delivery-price">{formatPrice(shipping.fee)}</strong>
              </label>
              <label className={`delivery-opt ${delivery === 'retirada' ? 'active' : ''}`}>
                <input type="radio" name="delivery" value="retirada" checked={delivery === 'retirada'} onChange={() => setDelivery('retirada')} />
                <span className="delivery-icon">🏪</span>
                <span className="delivery-text">
                  <strong>Retirar o produto</strong>
                  <small>Sem custo de frete</small>
                </span>
                <strong className="delivery-price free">Grátis</strong>
              </label>
            </fieldset>

            {delivery === 'retirada' ? (
              <div className="pickup-info">
                <strong>📍 Como funciona a retirada</strong>
                <p>{shipping.pickupInfo}</p>
              </div>
            ) : (
            <>
            <label className="field">
              <span>CEP</span>
              <div className="cep-row">
                <input
                  className={`input ${cepStatus.error ? 'invalid' : ''}`}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={address.zip}
                  onChange={onCepChange}
                  placeholder="00000-000"
                />
                {cepStatus.loading && <Spinner small />}
                {cepStatus.found && <span className="cep-ok" aria-label="CEP encontrado">✓</span>}
              </div>
              {cepStatus.error ? (
                <small className="field-error">{cepStatus.error}</small>
              ) : (
                <small className="muted">Digite o CEP e o endereço é preenchido sozinho.</small>
              )}
            </label>
            <label className="field"><span>Rua</span><input className="input" value={address.street} onChange={set('street')} autoComplete="address-line1" /></label>
            <div className="row-2 row-num">
              <label className="field"><span>Número</span><input ref={numberRef} className="input" inputMode="numeric" value={address.number} onChange={set('number')} placeholder="123" /></label>
              <label className="field"><span>Complemento</span><input className="input" value={address.complement} onChange={set('complement')} placeholder="Apto, bloco (opcional)" /></label>
            </div>
            <label className="field"><span>Bairro</span><input className="input" value={address.neighborhood} onChange={set('neighborhood')} /></label>
            <div className="row-2">
              <label className="field"><span>Cidade</span><input className="input" value={address.city} onChange={set('city')} /></label>
              <label className="field"><span>UF</span><input className="input" maxLength={2} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })} placeholder="RR" /></label>
            </div>
            </>
            )}
          </>
        ) : (
          <p className="muted">Faça login para concluir o pedido.</p>
        )}
        <div className="checkout-lines">
          <div><span>Produtos</span><span>{formatPrice(total)}</span></div>
          <div>
            <span>Frete</span>
            <span>{shippingFee ? formatPrice(shippingFee) : 'Grátis (retirada)'}</span>
          </div>
        </div>
        <div className="checkout-total">
          <span>Total</span>
          <strong>{formatPrice(grandTotal)}</strong>
        </div>
        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? <Spinner small /> : user ? 'Ir para o pagamento (Pix)' : 'Entrar para finalizar'}
        </button>
      </form>
    </div>
  );
}

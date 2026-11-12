import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { toOrderItems, useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { Alert, Empty, Spinner } from '../components/Feedback';
import { PLACEHOLDER_IMG, formatPrice, maskPhone } from '../utils';
import { lookupCep, maskCep } from '../services/cep';

export default function Cart() {
  const { items, setQuantity, remove, clear, total, sync } = useCart();
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
  const [shipping, setShipping] = useState({ fee: 15, deliveryArea: 'Boa Vista/RR', deliveryTime: 'até 1 dia útil', pickupAddress: '', pickupInfo: '', cepRanges: [] });

  // CEP dentro da área de entrega? (o servidor confere de novo ao criar o pedido)
  const inArea = (zip) => {
    const n = Number(String(zip).replace(/\D/g, ''));
    return !shipping.cepRanges?.length || shipping.cepRanges.some(([a, b]) => n >= a && n <= b);
  };

  // Personalizados no carrinho: mostra o prazo de produção
  const hasCustom = items.some((i) => i.custom);
  const [productionDays, setProductionDays] = useState(null);
  useEffect(() => {
    if (hasCustom) api.get('/custom').then(({ data }) => setProductionDays(data.productionDays)).catch(() => {});
  }, [hasCustom]);

  // Ao abrir o carrinho: atualiza preços e estoque com os da loja
  const [cartNotes, setCartNotes] = useState([]);
  useEffect(() => {
    sync().then(setCartNotes).catch(() => {});
  }, [sync]);

  // Valor do frete vem do servidor (é ele quem calcula o total de verdade)
  useEffect(() => {
    api.get('/orders/shipping').then(({ data }) => setShipping(data)).catch(() => {});
  }, []);

  // se o login terminar de carregar depois, preenche o telefone salvo
  useEffect(() => {
    if (user?.phone) setPhone((p) => p || maskPhone(user.phone));
  }, [user?.phone]);

  // ---------- Cupom de desconto (o valor é sempre calculado pelo servidor) ----------
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null); // { code, type, discount }
  const [couponMsg, setCouponMsg] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const cartKey = items.map((i) => `${i._id}:${i.quantity}`).join(',');

  const checkCoupon = async (code) => {
    const { data } = await api.post('/coupons/validate', {
      code,
      items: toOrderItems(items),
      deliveryMethod: delivery,
    });
    return data;
  };

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponMsg('');
    try {
      setCoupon(await checkCoupon(code));
      setCouponInput('');
    } catch (err) {
      setCouponMsg(errorMessage(err));
    } finally {
      setCouponLoading(false);
    }
  };

  // Mudou o carrinho ou a entrega: recalcula (ex: compra mínima, frete grátis só na entrega)
  useEffect(() => {
    if (!coupon || items.length === 0) return;
    let alive = true;
    checkCoupon(coupon.code)
      .then((data) => { if (alive) setCoupon(data); })
      .catch((err) => {
        if (!alive) return;
        setCoupon(null);
        setCouponMsg(`Cupom ${coupon.code} removido: ${errorMessage(err)}`);
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, delivery]);

  const shippingFee = delivery === 'entrega' ? shipping.fee : 0;
  const discount = coupon?.discount || 0;
  const grandTotal = Math.max(total + shippingFee - discount, 0);

  if (items.length === 0) {
    return (
      <>
        {cartNotes.length > 0 && (
          <Alert type="info">{cartNotes.map((n) => <div key={n}>{n}</div>)}</Alert>
        )}
        <Empty emoji="🛒" title="Seu carrinho está vazio">
          <Link to="/loja" className="btn btn-primary">Ver produtos</Link>
        </Empty>
      </>
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
    if (!inArea(zip)) {
      setCepStatus({ loading: false, error: `No momento entregamos apenas em ${shipping.deliveryArea}. Escolha "Retirar na loja".`, found: false });
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
    if (delivery === 'entrega' && !inArea(address.zip)) {
      return setError(`No momento entregamos apenas em ${shipping.deliveryArea}. Escolha "Retirar na loja".`);
    }
    if (delivery === 'entrega' && required.some((k) => !address[k].trim())) {
      return setError('Preencha o endereço completo (o complemento é opcional).');
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/orders', {
        items: toOrderItems(items),
        contactPhone: phone,
        deliveryMethod: delivery,
        ...(coupon && { couponCode: coupon.code }),
        ...(delivery === 'entrega' && { shippingAddress: address }),
      });
      clear();
      toast('Pedido criado! Agora é só pagar com Pix 💸', 'success');
      navigate(`/pagamento/${data._id}`);
    } catch (err) {
      setError(errorMessage(err)); // ex: estoque insuficiente
      sync().then(setCartNotes).catch(() => {}); // atualiza o carrinho com o estoque real
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
        {cartNotes.length > 0 && (
          <Alert type="info" onClose={() => setCartNotes([])}>
            {cartNotes.map((n) => <div key={n}>{n}</div>)}
          </Alert>
        )}
        <ul className="cart-list">
          {items.map((i) => (
            <li key={i._id} className="card cart-item">
              <img
                src={i.image || PLACEHOLDER_IMG}
                alt=""
                className={i.custom ? `custom-thumb ${i.custom.optionId.startsWith('button') ? 'round' : ''}` : ''}
                onError={(e) => (e.currentTarget.src = PLACEHOLDER_IMG)}
              />
              <div className="cart-item-info">
                <Link to={i.custom ? '/personalizado' : `/produto/${i._id}`}><strong>{i.name}</strong></Link>
                {i.custom?.notes && <span className="muted cart-notes">📝 {i.custom.notes}</span>}
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
                <span className="delivery-icon">🛵</span>
                <span className="delivery-text">
                  <strong>Receber em casa</strong>
                  <small>Só em {shipping.deliveryArea} · {shipping.deliveryTime}</small>
                </span>
                <strong className="delivery-price">{formatPrice(shipping.fee)}</strong>
              </label>
              <label className={`delivery-opt ${delivery === 'retirada' ? 'active' : ''}`}>
                <input type="radio" name="delivery" value="retirada" checked={delivery === 'retirada'} onChange={() => setDelivery('retirada')} />
                <span className="delivery-icon">🏪</span>
                <span className="delivery-text">
                  <strong>Retirar na loja</strong>
                  <small>Sem taxa de entrega</small>
                </span>
                <strong className="delivery-price free">Grátis</strong>
              </label>
            </fieldset>

            {delivery === 'retirada' ? (
              <div className="pickup-info">
                <strong>📍 Retirada na loja</strong>
                {shipping.pickupAddress && <p><strong>{shipping.pickupAddress}</strong></p>}
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
        {hasCustom && productionDays != null && (
          <p className="custom-note">✨ Os personalizados levam até <strong>{productionDays} dias úteis</strong> para ficar prontos. Depois disso vem a entrega ou a retirada.</p>
        )}
        <div className="coupon-box">
          {coupon ? (
            <div className="coupon-applied">
              <span>🏷️ Cupom <strong>{coupon.code}</strong> aplicado</span>
              <button type="button" className="link-btn" onClick={() => { setCoupon(null); setCouponMsg(''); }}>
                remover
              </button>
            </div>
          ) : (
            <div className="coupon-row">
              <input
                className="input"
                placeholder="Cupom de desconto"
                value={couponInput}
                maxLength={20}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }}
                aria-label="Cupom de desconto"
              />
              <button type="button" className="btn btn-sm" onClick={applyCoupon} disabled={couponLoading || !couponInput.trim()}>
                {couponLoading ? <Spinner small /> : 'Aplicar'}
              </button>
            </div>
          )}
          {couponMsg && <p className="field-error">{couponMsg}</p>}
        </div>
        <div className="checkout-lines">
          <div><span>Produtos</span><span>{formatPrice(total)}</span></div>
          <div>
            <span>Entrega</span>
            <span>{shippingFee ? formatPrice(shippingFee) : 'Grátis (retirada)'}</span>
          </div>
          {discount > 0 && (
            <div className="discount-line">
              <span>Desconto ({coupon.code})</span>
              <span>− {formatPrice(discount)}</span>
            </div>
          )}
        </div>
        <div className="checkout-total">
          <span>Total</span>
          <strong>{formatPrice(grandTotal)}</strong>
        </div>
        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? <Spinner small /> : user ? 'Ir para o pagamento (Pix)' : 'Entrar para finalizar'}
        </button>
        <p className="checkout-terms">
          Ao continuar, você concorda com os <Link to="/termos">Termos de uso</Link> e
          a política de <Link to="/trocas">Trocas e devoluções</Link>.
        </p>
      </form>
    </div>
  );
}

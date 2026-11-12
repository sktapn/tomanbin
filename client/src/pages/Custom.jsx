import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { Alert, Empty, Spinner } from '../components/Feedback';
import { formatPrice } from '../utils';

const MAX_MB = 10;

/** Desenho do tamanho real aproximado de cada opção (só ilustração) */
const SIZE_PX = { 'button-p': 34, 'button-m': 48, 'button-g': 64, chaveiro: 56 };

export default function Custom() {
  const { user } = useAuth();
  const { addCustom } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fileRef = useRef(null);

  const [cfg, setCfg] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [optionId, setOptionId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [rights, setRights] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/custom')
      .then(({ data }) => {
        setCfg(data);
        setOptionId(data.options[1]?.id || data.options[0]?.id || '');
      })
      .catch((err) => setLoadError(errorMessage(err)));
  }, []);

  // libera a prévia local da memória
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const option = cfg?.options.find((o) => o.id === optionId);
  const isButton = option?.kind === 'button';

  const pickFile = async (file) => {
    if (!file) return;
    setError('');
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError('Envie uma imagem JPG, PNG ou WEBP.');
    if (file.size > MAX_MB * 1024 * 1024) return setError(`A imagem tem mais de ${MAX_MB} MB.`);

    setPreview(URL.createObjectURL(file));
    setImageUrl('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const { data } = await api.post('/custom/art', form, { timeout: 120000 });
      setImageUrl(data.url);
    } catch (err) {
      setPreview('');
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = (goToCart) => {
    setError('');
    if (!option) return setError('Escolha o tipo.');
    if (!imageUrl) return setError('Envie a sua imagem.');
    if (!rights) return setError('Confirme que você pode usar esta imagem.');
    addCustom({ option, imageUrl, notes: notes.trim(), quantity });
    toast(`${option.label} personalizado adicionado ao carrinho!`, 'success');
    if (goToCart) return navigate('/carrinho');
    // pronto para criar outro
    setImageUrl('');
    setPreview('');
    setNotes('');
    setQuantity(1);
    setRights(false);
  };

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!cfg) return <Spinner />;
  if (!cfg.enabled || cfg.options.length === 0) {
    return (
      <Empty emoji="🎨" title="Personalizados em breve">
        <p>Estamos preparando tudo. Enquanto isso, fale com a gente no WhatsApp!</p>
        <Link to="/loja" className="btn btn-primary">Ver produtos</Link>
      </Empty>
    );
  }

  return (
    <div className="custom-page">
      <div className="shop-banner">
        <h1>Faça o seu ✨</h1>
      </div>
      <p className="custom-intro">
        Escolha o tipo, envie a sua imagem (foto, desenho, arte) e a gente produz pra você.
        Produção em até <strong>{cfg.productionDays} dias úteis</strong>, depois entregamos em Boa Vista ou você retira na loja.
      </p>

      <div className="custom-grid">
        {/* 1. Tipo */}
        <section className="card custom-step">
          <h2><span className="step-n">1</span> Escolha o tipo</h2>
          <div className="custom-options" role="radiogroup" aria-label="Tipo de personalizado">
            {cfg.options.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={o.id === optionId}
                className={`custom-option ${o.id === optionId ? 'active' : ''}`}
                onClick={() => setOptionId(o.id)}
              >
                <span
                  className={`size-dot ${o.kind === 'button' ? 'round' : 'square'}`}
                  style={{ width: SIZE_PX[o.id], height: SIZE_PX[o.id] }}
                  aria-hidden="true"
                />
                <strong>{o.label}</strong>
                <small>{o.detail}</small>
                <span className="custom-price">{formatPrice(o.price)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 2. Imagem */}
        <section className="card custom-step">
          <h2><span className="step-n">2</span> Envie sua imagem</h2>
          {!user ? (
            <div className="custom-login">
              <p>Para enviar a sua imagem, entre na sua conta.</p>
              <Link to="/login" state={{ from: location.pathname }} className="btn btn-primary">Entrar ou criar conta</Link>
            </div>
          ) : (
            <>
              <div
                className={`custom-drop ${preview ? 'has-image' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
              >
                {preview ? (
                  <div className={`custom-preview ${isButton ? 'round' : 'square'}`}>
                    <img src={preview} alt="Prévia da sua imagem" />
                    {uploading && <span className="custom-uploading"><Spinner small /> Enviando…</span>}
                  </div>
                ) : (
                  <>
                    <span className="custom-drop-icon">🖼️</span>
                    <strong>Toque para escolher ou arraste aqui</strong>
                    <small>JPG, PNG ou WEBP · até {MAX_MB} MB · quanto maior a resolução, melhor a impressão</small>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
              {preview && !uploading && (
                <button type="button" className="link-btn" onClick={() => fileRef.current?.click()}>Trocar imagem</button>
              )}
              {isButton && preview && <p className="muted small">A parte de fora do círculo dobra para trás do button.</p>}
            </>
          )}
        </section>

        {/* 3. Detalhes */}
        <section className="card custom-step">
          <h2><span className="step-n">3</span> Detalhes</h2>
          <label className="field">
            <span>Observação (opcional)</span>
            <textarea
              className="input"
              rows={2}
              maxLength={120}
              placeholder="Ex: nome no chaveiro, centralizar o rosto…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="custom-qty">
            <span>Quantidade</span>
            <div className="qty">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Diminuir">−</button>
              <span>{quantity}</span>
              <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} aria-label="Aumentar">+</button>
            </div>
            <strong className="custom-total">{option ? formatPrice(option.price * quantity) : '—'}</strong>
          </div>
          <label className="check custom-rights">
            <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} />
            <span>
              Confirmo que a imagem é minha ou que tenho autorização para usá-la. Personagens e marcas famosas podem
              ser recusados, e nesse caso o valor é devolvido.
            </span>
          </label>

          <Alert onClose={() => setError('')}>{error}</Alert>

          <div className="custom-actions">
            <button type="button" className="btn btn-primary btn-lg" disabled={!user || uploading} onClick={() => handleAdd(true)}>
              Adicionar e ir ao carrinho
            </button>
            <button type="button" className="btn" disabled={!user || uploading} onClick={() => handleAdd(false)}>
              Adicionar e criar outro
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

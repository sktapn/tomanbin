import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import ImageGallery from '../components/ImageGallery';
import BackButton from '../components/BackButton';
import ProductCard from '../components/ProductCard';
import { Alert, Spinner } from '../components/Feedback';
import { CATEGORY_EMOJI, CATEGORY_LABELS, TAG_LABELS, formatPrice } from '../utils';

// Texto usado quando o produto não tem descrição cadastrada
const DEFAULT_DESCRIPTION = {
  buttons: 'Button com acabamento brilhante e alfinete com trava de segurança. Perfeito para mochilas, bolsas, jaquetas e bonés.',
  chaveiros: 'Chaveiro resistente com argola de metal. Leve sua fofura favorita junto com as chaves, a mochila ou o estojo.',
  'action-figures': 'Figura colecionável com acabamento caprichado. Ideal para decorar a estante, a mesa do computador ou presentear.',
};

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [shippingFee, setShippingFee] = useState(15);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { add, items } = useCart();
  const { socket, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError('');
    setQty(1);
    api
      .get(`/products/${id}`)
      .then(({ data }) => setProduct(data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  // Produtos da mesma categoria ("Você também pode gostar")
  useEffect(() => {
    if (!product) return;
    api
      .get('/products', { params: { category: product.category, limit: 8 } })
      .then(({ data }) => setRelated(data.items.filter((p) => p._id !== product._id && p.stock > 0).slice(0, 4)))
      .catch(() => setRelated([]));
  }, [product?._id, product?.category]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.get('/orders/shipping').then(({ data }) => setShippingFee(data.fee)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onStock = ({ productId, stock }) => {
      if (productId === id) setProduct((p) => p && { ...p, stock });
    };
    socket.on('stock:update', onStock);
    return () => {
      socket.off('stock:update', onStock);
    };
  }, [socket, id]);

  if (loading) return <Spinner label="Carregando produto..." />;
  if (error) {
    return (
      <>
        <Alert>{error}</Alert>
        <Link to="/loja" className="btn btn-ghost">← Voltar para a loja</Link>
      </>
    );
  }

  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= 3;
  const inCart = items.find((i) => i._id === product._id)?.quantity || 0;
  const maxQty = Math.max(0, product.stock - inCart);
  const categoryLabel = CATEGORY_LABELS[product.category];

  const handleAdd = (goToCart) => {
    if (qty > maxQty) {
      toast(`Você já tem ${inCart} no carrinho. Só restam ${product.stock}.`, 'error');
      return;
    }
    add(product, qty);
    toast(`${qty}× "${product.name}" no carrinho`, 'success');
    if (goToCart) navigate('/carrinho');
  };

  return (
    <>
      <nav className="page-nav" aria-label="Navegação">
        <BackButton />
        <ol className="crumbs">
          <li><Link to="/loja">Loja</Link></li>
          <li><Link to={`/loja?categoria=${product.category}`}>{categoryLabel}</Link></li>
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <div className={`pdp ${soldOut ? 'is-soldout' : ''}`}>
        {/* Imagens */}
        <div className="pdp-media">
          <ImageGallery images={product.images} alt={product.name} />
          {soldOut && <span className="soldout-ribbon">Esgotado</span>}
        </div>

        {/* Informações e compra */}
        <div className="pdp-info">
          <div className="pdp-chips">
            <Link to={`/loja?categoria=${product.category}`} className="chip chip-cat">
              {CATEGORY_EMOJI[product.category]} {categoryLabel}
            </Link>
            {product.tag && <span className={`chip badge-${product.tag}`}>{TAG_LABELS[product.tag]}</span>}
          </div>

          <h1>{product.name}</h1>

          <div className="pdp-price">
            <span className="price big">{formatPrice(product.price)}</span>
            <span className="muted">à vista no Pix</span>
          </div>

          {soldOut ? (
            <div className="soldout-box">
              <strong>😢 Esse produto esgotou</strong>
              <p>Ele saiu rapidinho! Enquanto não volta, dá uma olhada em outros {categoryLabel.toLowerCase()} da loja.</p>
              <div className="soldout-actions">
                <Link to={`/loja?categoria=${product.category}`} className="btn btn-primary">Ver outros {categoryLabel.toLowerCase()}</Link>
                <Link to="/loja" className="btn btn-ghost">Ver toda a loja</Link>
              </div>
            </div>
          ) : (
            <div className="buy-box">
              <div className={`stock-line ${lowStock ? 'low' : ''}`}>
                <span className="dot" />
                {lowStock
                  ? `Corre! Só ${product.stock === 1 ? 'resta 1 unidade' : `restam ${product.stock} unidades`}`
                  : `Em estoque (${product.stock} unidades)`}
              </div>

              <div className="buy-row">
                <div className="qty" aria-label="Quantidade">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir" disabled={qty <= 1}>−</button>
                  <span>{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(Math.max(1, maxQty), q + 1))} aria-label="Aumentar" disabled={qty >= maxQty}>+</button>
                </div>
                <button className="btn btn-ghost" onClick={() => handleAdd(false)} disabled={maxQty === 0}>
                  Adicionar ao carrinho
                </button>
              </div>
              <button className="btn btn-primary btn-block btn-lg" onClick={() => handleAdd(true)} disabled={maxQty === 0}>
                Comprar agora
              </button>
              {inCart > 0 && (
                <p className="in-cart">
                  🛒 Você já tem {inCart} no carrinho. <Link to="/carrinho">Ver carrinho</Link>
                </p>
              )}
            </div>
          )}

          <ul className="perks">
            <li><span>🛵</span><div><strong>Entrega em Boa Vista por {formatPrice(shippingFee)}</strong><small>em até 1 dia útil, ou retire grátis na loja</small></div></li>
            <li><span>💸</span><div><strong>Pagamento via Pix</strong><small>confirmação na hora</small></div></li>
            <li><span>🔒</span><div><strong>Compra segura</strong><small>seus dados protegidos</small></div></li>
          </ul>

          <section className="pdp-about">
            <h2>Sobre o produto</h2>
            <p className="description">{product.description || DEFAULT_DESCRIPTION[product.category]}</p>
            <dl className="specs">
              <div><dt>Categoria</dt><dd>{categoryLabel}</dd></div>
              <div><dt>Código</dt><dd>#{product._id.slice(-6).toUpperCase()}</dd></div>
              <div><dt>Disponibilidade</dt><dd>{soldOut ? 'Esgotado' : 'Pronta entrega'}</dd></div>
            </dl>
          </section>

          {isAdmin && (
            <Link to={`/admin/produtos/${product._id}/editar`} className="btn btn-ghost btn-sm">✏️ Editar (admin)</Link>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="related">
          <h2>{soldOut ? `Outros ${categoryLabel.toLowerCase()} disponíveis` : 'Você também pode gostar'}</h2>
          <div className="grid">
            {related.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}
    </>
  );
}

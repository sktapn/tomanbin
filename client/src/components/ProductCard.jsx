import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { PLACEHOLDER_IMG, TAG_LABELS, formatPrice } from '../utils';

function badgeFor(product) {
  if (product.stock <= 0) return { text: 'Esgotado', cls: 'badge-dark' };
  if (product.tag) return { text: TAG_LABELS[product.tag], cls: `badge-${product.tag}` };
  if (product.stock <= 3) return { text: `Últimas ${product.stock}!`, cls: 'badge-orange' };
  return null;
}

export default function ProductCard({ product }) {
  const { add } = useCart();
  const toast = useToast();
  const soldOut = product.stock <= 0;
  const badge = badgeFor(product);

  const handleAdd = (e) => {
    e.preventDefault();
    add(product, 1);
    toast(`"${product.name}" foi pro carrinho!`, 'success');
  };

  return (
    <Link to={`/produto/${product._id}`} className={`pcard ${soldOut ? 'is-soldout' : ''}`}>
      <div className="pcard-img">
        <img
          src={product.images?.[0] || PLACEHOLDER_IMG}
          alt={product.name}
          loading="lazy"
          onError={(e) => (e.currentTarget.src = PLACEHOLDER_IMG)}
        />
        {badge && <span className={`badge ${badge.cls}`}>● {badge.text}</span>}
        {!soldOut && (
          <button className="pcard-add" onClick={handleAdd} aria-label={`Adicionar ${product.name} ao carrinho`}>
            + Carrinho
          </button>
        )}
      </div>
      <div className="pcard-foot">
        <h3>{product.name}</h3>
        <span className="price-tag">{formatPrice(product.price)}</span>
      </div>
    </Link>
  );
}

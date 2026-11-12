import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { API_URL, errorMessage } from '../api/axios';
import ProductCard from '../components/ProductCard';
import { Alert, SkeletonCard } from '../components/Feedback';

const img = (slug) => `${API_URL}/static/products/${slug}.svg`;

// Os três tipos de produto da loja
const CATEGORIES = [
  { key: 'buttons', title: 'Buttons', text: 'Pra enfeitar mochila, jaqueta e bolsa.', color: 'yellow', image: img('button-gatinho-astronauta') },
  { key: 'chaveiros', title: 'Chaveiros', text: 'Fofura que vai junto com suas chaves.', color: 'blue', image: img('chaveiro-dragaozinho') },
  { key: 'action-figures', title: 'Action Figures', text: 'Colecionáveis pra deixar a estante feliz.', color: 'purple', image: img('figure-mago-chibi') },
];

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Produtos disponíveis (com estoque); os mais vendidos e novos aparecem primeiro
    const order = { 'mais-vendido': 0, novo: 1, 'edicao-limitada': 2, '': 3 };
    api
      .get('/products', { params: { limit: 20 } })
      .then(({ data }) =>
        setFeatured(
          data.items
            .filter((p) => p.stock > 0)
            .sort((a, b) => (order[a.tag || ''] ?? 3) - (order[b.tag || ''] ?? 3))
        )
      )
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home">
      {/* Destaque principal */}
      <section className="hero">
        <div className="hero-text">
          <span className="hero-tag">Loja</span>
          <h1 className="hero-title">Tomanbin</h1>
          <p>Buttons, chaveiros e action figures fofos pra todas as idades.</p>
          <Link to="/loja" className="btn btn-yellow btn-lg">Ver produtos</Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="burst" />
          <img src={img('chaveiro-lua-estrelas')} alt="" />
        </div>
      </section>

      {/* Atalhos por categoria */}
      <section className="cat-tiles" aria-label="Categorias">
        {CATEGORIES.map((c) => (
          <Link key={c.key} to={`/loja?categoria=${c.key}`} className={`cat-tile ${c.color}`}>
            <div>
              <h2>{c.title}</h2>
              <p>{c.text}</p>
              <span className="cat-go">Ver {c.title.toLowerCase()} →</span>
            </div>
            <img src={c.image} alt="" loading="lazy" />
          </Link>
        ))}
      </section>

      {/* Personalizados */}
      <Link to="/personalizado" className="custom-cta">
        <div>
          <span className="hero-tag">Novo</span>
          <h2>Faça o seu ✨</h2>
          <p>Button P, M ou G e chaveiro com a <strong>sua</strong> imagem: foto do pet, desenho, arte do seu jeito.</p>
        </div>
        <span className="btn btn-yellow">Criar o meu →</span>
      </Link>

      {/* Produtos em destaque */}
      <section className="featured">
        <h2 className="featured-title">Os queridinhos</h2>
        <p className="featured-sub">Tudo que está disponível agora na loja · passe o mouse para pausar</p>

        <Alert>{error}</Alert>
        {loading ? (
          <div className="grid">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          featured.length > 0 && (
            // Carrossel infinito: a lista é duplicada para o movimento não ter "pulo"
            <div className="carousel">
              <div className="carousel-track" style={{ '--dur': `${Math.max(20, featured.length * 5)}s` }}>
                {[...featured, ...featured].map((p, i) => (
                  <div className="carousel-item" key={`${p._id}-${i}`} aria-hidden={i >= featured.length}>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        <div className="center">
          <Link to="/loja" className="btn btn-yellow btn-xl">Ver todos os produtos</Link>
        </div>
      </section>
    </div>
  );
}

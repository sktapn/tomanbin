import { Link } from 'react-router-dom';
import PixelArt from '../components/PixelArt';

export default function About() {
  return (
    <div className="info-page">
      <div className="shop-banner wine">
        <h1>Sobre</h1>
      </div>
      <div className="info-grid">
        <article className="info-card yellow">
          <PixelArt sprite="bear" size={90} />
          <h2>Quem somos</h2>
          <p>
            A Tomanbin nasceu da vontade de transformar pequenas coisas em alegria: buttons pra enfeitar a mochila,
            chaveiros que contam um pouco de quem você é e action figures pra deixar a estante mais divertida.
          </p>
        </article>
        <article className="info-card teal">
          <PixelArt sprite="heart" size={70} />
          <h2>Pra todo mundo</h2>
          <p>
            Nossos produtos são pensados pra crianças, jovens e adultos. Fofos, coloridos e sem frescura: se faz você
            sorrir, tem espaço aqui.
          </p>
        </article>
        <article className="info-card purple">
          <PixelArt sprite="star" size={76} />
          <h2>Edições limitadas</h2>
          <p>
            Algumas peças são produzidas em pequenos lotes e não voltam ao estoque. Fique de olho nos selos
            <strong> Novo</strong> e <strong>Edição limitada</strong>!
          </p>
        </article>
      </div>
      <div className="center">
        <Link to="/loja" className="btn btn-primary">Ir para a loja</Link>
      </div>
    </div>
  );
}

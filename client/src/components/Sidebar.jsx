import { Link } from 'react-router-dom';
import SocialIcons from './SocialIcons';
import { CATEGORY_LABELS } from '../utils';

export default function Sidebar({ category, onChange }) {
  return (
    <aside className="sidebar">
      <div>
        <h4>Categorias</h4>
        <ul>
          <li>
            <button className={!category ? 'active' : ''} onClick={() => onChange({ categoria: '' })}>
              Todos os produtos
            </button>
          </li>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <li key={key}>
              <button className={category === key ? 'active' : ''} onClick={() => onChange({ categoria: key })}>
                {label}
              </button>
            </li>
          ))}
          <li>
            <Link to="/personalizado" className="sidebar-custom">✨ Faça o seu</Link>
          </li>
        </ul>
      </div>

      <div className="sidebar-bottom">
        <p>
          Boas-vindas à Tomanbin! 💛 Aqui tem fofura pra todo mundo: crianças, adultos e colecionadores. Algumas
          peças não voltam ao estoque, então garanta as suas!
        </p>
        <div className="sidebar-social">
          <span>Redes sociais</span>
          <SocialIcons />
        </div>
      </div>
    </aside>
  );
}

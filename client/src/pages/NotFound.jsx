import { Link } from 'react-router-dom';
import { Empty } from '../components/Feedback';

export default function NotFound() {
  return (
    <Empty emoji="🧭" title="Página não encontrada">
      <Link to="/" className="btn btn-primary">Voltar para a loja</Link>
    </Empty>
  );
}

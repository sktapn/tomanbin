import { useNavigate } from 'react-router-dom';

/**
 * Botão "Voltar": volta para a página anterior do site.
 * Se a pessoa abriu o link direto (sem histórico), vai para `fallback`.
 */
export default function BackButton({ fallback = '/loja', label = 'Voltar' }) {
  const navigate = useNavigate();
  const goBack = () => {
    const hasHistory = (window.history.state?.idx ?? 0) > 0;
    if (hasHistory) navigate(-1);
    else navigate(fallback);
  };
  return (
    <button type="button" className="btn btn-ghost btn-sm back-btn" onClick={goBack}>
      ← {label}
    </button>
  );
}

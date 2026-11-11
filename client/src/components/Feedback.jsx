/* Componentes de feedback visual: spinner, skeleton, alerta e estado vazio */

export function Spinner({ label = 'Carregando...', small = false }) {
  return (
    <div className={`spinner-wrap ${small ? 'small' : ''}`} role="status">
      <span className="spinner" aria-hidden="true" />
      {!small && <span className="spinner-label">{label}</span>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="pcard skeleton" aria-hidden="true">
      <div className="pcard-img"><div className="sk sk-img" /></div>
      <div className="pcard-foot">
        <div className="sk sk-line" />
        <div className="sk sk-pill" />
      </div>
    </div>
  );
}

export function Alert({ type = 'error', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${type}`} role="alert">
      <span>{type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}</span>
      <div className="alert-body">{children}</div>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      )}
    </div>
  );
}

export function Empty({ emoji = '🫥', title, children }) {
  return (
    <div className="empty">
      <div className="empty-emoji">{emoji}</div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

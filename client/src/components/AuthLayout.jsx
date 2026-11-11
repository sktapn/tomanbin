import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../api/axios';

const img = (slug) => `${API_URL}/static/products/${slug}.svg`;

/** Layout das telas de login/cadastro: painel colorido + formulário */
export function AuthLayout({ panelTitle, panelText, perks = [], children }) {
  return (
    <div className="auth-split">
      <aside className="auth-panel" aria-hidden="true">
        <div className="auth-panel-text">
          <span className="hero-tag">Tomanbin</span>
          <h2>{panelTitle}</h2>
          <p>{panelText}</p>
          {perks.length > 0 && (
            <ul className="auth-perks">
              {perks.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}
        </div>
        <div className="auth-floaters">
          {['chaveiro-dragaozinho', 'button-gatinho-astronauta', 'figure-mago-chibi'].map((slug, i) => (
            <img key={slug} className={`floater f${i + 1}`} src={img(slug)} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
          ))}
        </div>
      </aside>

      <div className="auth-form-wrap">{children}</div>
    </div>
  );
}

/** Campo de senha com botão de mostrar/ocultar */
export function PasswordInput({ value, onChange, autoComplete, invalid, id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input
        id={id}
        className={`input ${invalid ? 'invalid' : ''}`}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
      />
      <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
        {show ? 'Ocultar' : 'Mostrar'}
      </button>
    </div>
  );
}

/** Medidor simples de força da senha */
export function PasswordStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const level = password.length < 6 ? 0 : score <= 2 ? 1 : score <= 3 ? 2 : 3;
  const labels = ['Muito curta', 'Fraca', 'Boa', 'Forte'];
  return (
    <div className={`pw-strength lvl-${level}`} aria-live="polite">
      <div className="pw-bars">
        {[0, 1, 2].map((i) => <span key={i} className={i < level ? 'on' : ''} />)}
      </div>
      <small>{labels[level]}</small>
    </div>
  );
}

export const AuthSwitch = ({ text, to, label }) => (
  <p className="auth-switch">
    {text} <Link to={to}>{label}</Link>
  </p>
);

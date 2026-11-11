/* Ícones simples (genéricos) de redes sociais */
const icons = {
  Vídeos: (
    <svg viewBox="0 0 24 24" width="20" height="20"><rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" /><path d="M10 9l5 3-5 3z" fill="#fff" /></svg>
  ),
  Fotos: (
    <svg viewBox="0 0 24 24" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2.5" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2.5" /><circle cx="17.3" cy="6.7" r="1.3" fill="currentColor" /></svg>
  ),
  Música: (
    <svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 17V5l11-2v12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><circle cx="6.5" cy="17.5" r="3" fill="currentColor" /><circle cx="17.5" cy="15" r="3" fill="currentColor" /></svg>
  ),
};

export default function SocialIcons() {
  return (
    <div className="socials">
      {Object.entries(icons).map(([label, icon]) => (
        <a key={label} href="#" aria-label={label} title={label} onClick={(e) => e.preventDefault()}>
          {icon}
        </a>
      ))}
    </div>
  );
}

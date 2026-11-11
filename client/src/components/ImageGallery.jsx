import { useEffect, useState } from 'react';
import { PLACEHOLDER_IMG } from '../utils';

/** Galeria de imagens: foto principal + miniaturas + navegação por setas/teclado */
export default function ImageGallery({ images = [], alt }) {
  const list = images.length ? images : [PLACEHOLDER_IMG];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [images]);

  const go = (dir) => setIndex((i) => (i + dir + list.length) % list.length);

  return (
    <div
      className="gallery"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(-1);
        if (e.key === 'ArrowRight') go(1);
      }}
    >
      <div className="gallery-main">
        <img
          src={list[index]}
          alt={`${alt} — imagem ${index + 1}`}
          onError={(e) => (e.currentTarget.src = PLACEHOLDER_IMG)}
        />
        {list.length > 1 && (
          <>
            <button className="gallery-nav prev" onClick={() => go(-1)} aria-label="Imagem anterior">‹</button>
            <button className="gallery-nav next" onClick={() => go(1)} aria-label="Próxima imagem">›</button>
            <span className="gallery-count">{index + 1}/{list.length}</span>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="gallery-thumbs">
          {list.map((src, i) => (
            <button
              key={src + i}
              className={`thumb ${i === index ? 'active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Ver imagem ${i + 1}`}
            >
              <img src={src} alt="" onError={(e) => (e.currentTarget.src = PLACEHOLDER_IMG)} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

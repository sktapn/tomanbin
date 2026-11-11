import { useRef, useState } from 'react';
import api, { errorMessage } from '../api/axios';
import { useToast } from '../context/ToastContext';
import { Spinner } from './Feedback';
import { PLACEHOLDER_IMG } from '../utils';

const MAX_IMAGES = 6;
const MAX_SIDE = 1600; // px — fotos de celular são enormes; reduzimos antes de enviar

/** Reduz a foto no próprio navegador (mais rápido de enviar e mais leve na loja) */
async function shrink(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
    return blob ? new File([blob], 'foto.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file; // navegador não conseguiu ler: o servidor valida e avisa
  }
}

/**
 * Fotos do produto: enviar do computador/celular, arrastar e soltar, reordenar e remover.
 * A primeira foto é a capa (aparece na loja).
 */
export default function ImageUploader({ images, onChange }) {
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [link, setLink] = useState('');
  const inputRef = useRef(null);
  const toast = useToast();
  const free = MAX_IMAGES - images.length - uploading;

  const uploadFiles = async (fileList) => {
    const files = [...fileList].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    if (!files.length) return toast('Escolha arquivos de imagem (JPG, PNG ou WEBP).', 'error');
    const batch = files.slice(0, Math.max(0, free));
    if (files.length > batch.length) toast(`Máximo de ${MAX_IMAGES} fotos por produto.`, 'info');

    setUploading((n) => n + batch.length);
    let current = images;
    for (const file of batch) {
      try {
        const data = new FormData();
        data.append('image', await shrink(file));
        const res = await api.post('/uploads/image', data, { timeout: 60000 });
        current = [...current, res.data.url];
        onChange(current);
      } catch (err) {
        toast(`${file.name}: ${errorMessage(err)}`, 'error');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const remove = (i) => onChange(images.filter((_, j) => j !== i));

  const addLink = () => {
    const url = link.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) return toast('Cole um link que comece com http:// ou https://', 'error');
    if (images.length >= MAX_IMAGES) return toast(`Máximo de ${MAX_IMAGES} fotos.`, 'info');
    onChange([...images, url]);
    setLink('');
  };

  return (
    <div className="uploader">
      <div className="uploader-grid">
        {images.map((src, i) => (
          <figure key={src + i} className="up-thumb">
            <img src={src} alt={`Foto ${i + 1}`} onError={(e) => (e.currentTarget.src = PLACEHOLDER_IMG)} />
            {i === 0 && <span className="up-cover">Capa</span>}
            <div className="up-actions">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover para a esquerda">←</button>
              <button type="button" onClick={() => remove(i)} aria-label="Remover foto">✕</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Mover para a direita">→</button>
            </div>
          </figure>
        ))}

        {Array.from({ length: uploading }).map((_, i) => (
          <div key={`up-${i}`} className="up-thumb up-loading"><Spinner small /><small>Enviando…</small></div>
        ))}

        {free > 0 && (
          <button
            type="button"
            className={`up-drop ${dragOver ? 'over' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              uploadFiles(e.dataTransfer.files);
            }}
          >
            <span>📷</span>
            <strong>Adicionar fotos</strong>
            <small>clique ou arraste aqui</small>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        multiple
        hidden
        onChange={(e) => {
          uploadFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <p className="muted up-help">
        Até {MAX_IMAGES} fotos (JPG, PNG ou WEBP, até 5 MB). A primeira é a <strong>capa</strong>; use as setas para trocar a ordem.
      </p>

      <details className="up-link">
        <summary>ou colar o link de uma imagem</summary>
        <div className="image-row">
          <input
            className="input"
            placeholder="https://..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addLink();
              }
            }}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={addLink}>Adicionar</button>
        </div>
      </details>
    </div>
  );
}

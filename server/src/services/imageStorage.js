/**
 * Guarda as fotos dos produtos.
 *  - Com CLOUDINARY_URL no .env: envia para o Cloudinary (recomendado para o site no ar,
 *    porque o disco do Render é apagado a cada novo deploy).
 *  - Sem Cloudinary: salva em server/public/uploads (bom para desenvolvimento).
 */
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const AppError = require('../utils/AppError');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');

/** Confere o tipo REAL do arquivo pelos primeiros bytes (não confia na extensão/mimetype) */
function detectImageType(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

function uploadToCloudinary(buffer) {
  // o SDK lê a configuração da variável CLOUDINARY_URL automaticamente
  const { v2: cloudinary } = require('cloudinary');
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'tomanbin/produtos',
        resource_type: 'image',
        // reduz fotos grandes de celular e converte para o melhor formato automaticamente
        transformation: [{ width: 1200, height: 1200, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
      },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}

async function saveLocally(buffer, ext) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), buffer);
  const base = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5001}`;
  return `${base}/static/uploads/${name}`;
}

async function storeImage(buffer) {
  const ext = detectImageType(buffer);
  if (!ext) throw new AppError('Formato não suportado. Envie uma foto JPG, PNG ou WEBP.', 400);

  if (process.env.CLOUDINARY_URL) {
    try {
      return await uploadToCloudinary(buffer);
    } catch (err) {
      console.error('Cloudinary:', err.message);
      throw new AppError('Não foi possível enviar a foto para o Cloudinary. Confira CLOUDINARY_URL.', 502);
    }
  }
  return saveLocally(buffer, ext);
}

module.exports = { storeImage, detectImageType };

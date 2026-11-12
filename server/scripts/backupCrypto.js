/**
 * Criptografia dos backups (AES-256-GCM com senha).
 * O backup tem dados de clientes (nome, e-mail, telefone, endereço): por causa da LGPD,
 * ele nunca fica salvo "aberto" fora do banco.
 * Formato do arquivo: "TMB1" + salt(16) + iv(12) + tag(16) + dados.
 */
const crypto = require('crypto');

const MAGIC = Buffer.from('TMB1');

function key(passphrase, salt) {
  return crypto.scryptSync(passphrase, salt, 32);
}

function encrypt(buf, passphrase) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(passphrase, salt), iv);
  const data = Buffer.concat([cipher.update(buf), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), data]);
}

function decrypt(buf, passphrase) {
  if (!buf.subarray(0, 4).equals(MAGIC)) throw new Error('Arquivo não é um backup criptografado da Tomanbin');
  const salt = buf.subarray(4, 20);
  const iv = buf.subarray(20, 32);
  const tag = buf.subarray(32, 48);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(passphrase, salt), iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(buf.subarray(48)), decipher.final()]);
  } catch {
    throw new Error('Senha do backup incorreta (ou arquivo corrompido)');
  }
}

module.exports = { encrypt, decrypt };

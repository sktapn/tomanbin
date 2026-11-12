/**
 * Backup do banco: exporta todas as coleções para um arquivo compactado e criptografado.
 *   npm run backup
 * Precisa de MONGO_URI e BACKUP_PASSPHRASE (senha do backup) no .env.
 * Arquivo gerado: server/backups/tomanbin-AAAA-MM-DD-HHmm.bak
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const mongoose = require('mongoose');
const { BSON } = require('mongodb');
const { encrypt } = require('./backupCrypto');

async function main() {
  const { MONGO_URI, BACKUP_PASSPHRASE } = process.env;
  if (!MONGO_URI) throw new Error('MONGO_URI não definida');
  if (!BACKUP_PASSPHRASE || BACKUP_PASSPHRASE.length < 12) {
    throw new Error('Defina BACKUP_PASSPHRASE (mínimo 12 caracteres) para criptografar o backup');
  }

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const collections = (await db.listCollections().toArray()).map((c) => c.name).filter((n) => !n.startsWith('system.'));

  const dump = { createdAt: new Date().toISOString(), database: db.databaseName, collections: {} };
  for (const name of collections) {
    dump.collections[name] = await db.collection(name).find().toArray();
    console.log(`  ${name}: ${dump.collections[name].length} documento(s)`);
  }
  await mongoose.disconnect();

  // EJSON guarda ObjectId e datas sem perder o tipo
  const json = Buffer.from(BSON.EJSON.stringify(dump, { relaxed: false }));
  const file = encrypt(zlib.gzipSync(json), BACKUP_PASSPHRASE);

  const dir = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  const out = path.join(dir, `tomanbin-${stamp}.bak`);
  fs.writeFileSync(out, file);
  console.log(`✅ Backup salvo em ${out} (${(file.length / 1024).toFixed(1)} KB, criptografado)`);
}

main().catch((err) => {
  console.error('❌ Backup falhou:', err.message);
  process.exit(1);
});

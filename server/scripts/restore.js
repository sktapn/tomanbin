/**
 * Restaura um backup no banco do MONGO_URI.
 *   npm run restore -- backups/tomanbin-2026-11-11-0200.bak --sim-apagar-tudo
 * ATENÇÃO: substitui TODOS os dados atuais pelos do backup.
 */
require('dotenv').config();
const fs = require('fs');
const zlib = require('zlib');
const mongoose = require('mongoose');
const { BSON } = require('mongodb');
const { decrypt } = require('./backupCrypto');

async function main() {
  const file = process.argv[2];
  const confirmed = process.argv.includes('--sim-apagar-tudo');
  if (!file || !fs.existsSync(file)) throw new Error('Informe o arquivo do backup. Ex: npm run restore -- backups/arquivo.bak');

  const dump = BSON.EJSON.parse(zlib.gunzipSync(decrypt(fs.readFileSync(file), process.env.BACKUP_PASSPHRASE || '')).toString());
  console.log(`Backup de ${dump.createdAt} (banco "${dump.database}"):`);
  for (const [name, docs] of Object.entries(dump.collections)) console.log(`  ${name}: ${docs.length} documento(s)`);

  if (!confirmed) {
    console.log('\nNada foi alterado. Para substituir os dados atuais por este backup, rode de novo com --sim-apagar-tudo');
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  for (const [name, docs] of Object.entries(dump.collections)) {
    await db.collection(name).deleteMany({});
    if (docs.length) await db.collection(name).insertMany(docs);
    console.log(`  ✔ ${name} restaurada`);
  }
  await mongoose.disconnect();
  console.log(`✅ Banco restaurado a partir de ${file}`);
}

main().catch((err) => {
  console.error('❌ Restauração falhou:', err.message);
  process.exit(1);
});

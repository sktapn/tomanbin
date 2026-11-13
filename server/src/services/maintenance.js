/**
 * Modo manutenção: ligado pelo painel (Admin → Dashboard).
 * Com ele ligado, os clientes veem a página "Voltamos já" e a API recusa
 * cadastro, pedido, pagamento e envio de arte. O admin continua usando tudo.
 */
const mongoose = require('mongoose');
const Setting = require('../models/Setting');

const KEY = 'maintenance';
const DEFAULT_MESSAGE = 'Estamos fazendo uns ajustes na loja. Daqui a pouquinho ela volta!';

const dbReady = () => mongoose.connection.readyState === 1;

async function getMaintenance() {
  // Sem banco não há o que bloquear (e a loja já não funcionaria): segue desligado
  if (!module.exports.dbReady()) return { enabled: false, message: DEFAULT_MESSAGE };
  const saved = (await Setting.findOne({ key: KEY }).lean())?.value || {};
  return { enabled: !!saved.enabled, message: saved.message?.trim() || DEFAULT_MESSAGE };
}

async function setMaintenance({ enabled, message = '' }) {
  await Setting.findOneAndUpdate({ key: KEY }, { value: { enabled, message } }, { upsert: true });
  return getMaintenance();
}

module.exports = { getMaintenance, setMaintenance, dbReady, DEFAULT_MESSAGE };

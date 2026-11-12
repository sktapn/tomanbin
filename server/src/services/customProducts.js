/**
 * Produtos personalizados ("Faça o seu"): button P/M/G e chaveiro com a imagem do cliente.
 * Preços, tamanhos e prazo ficam no banco e são editados em Admin → Personalizados.
 * Os IDs das opções são fixos; o admin muda nome, medida, preço e se está ativo.
 */
const Setting = require('../models/Setting');

const KEY = 'custom-products';

const DEFAULTS = {
  enabled: true,
  productionDays: 3, // dias úteis para produzir antes da entrega
  options: [
    { id: 'button-p', kind: 'button', label: 'Button P', detail: '2,5 cm', price: 6, active: true },
    { id: 'button-m', kind: 'button', label: 'Button M', detail: '3,8 cm', price: 8, active: true },
    { id: 'button-g', kind: 'button', label: 'Button G', detail: '5,8 cm', price: 12, active: true },
    { id: 'chaveiro', kind: 'chaveiro', label: 'Chaveiro', detail: 'acrílico 5 cm', price: 18, active: true },
  ],
};

const OPTION_IDS = DEFAULTS.options.map((o) => o.id);

/** Configuração atual (padrões + o que o admin salvou) */
async function getConfig() {
  const saved = (await Setting.findOne({ key: KEY }).lean())?.value || {};
  const options = DEFAULTS.options.map((def) => ({ ...def, ...(saved.options || []).find((o) => o.id === def.id), id: def.id, kind: def.kind }));
  return {
    enabled: saved.enabled ?? DEFAULTS.enabled,
    productionDays: saved.productionDays ?? DEFAULTS.productionDays,
    options,
  };
}

async function saveConfig(value) {
  await Setting.findOneAndUpdate({ key: KEY }, { value }, { upsert: true });
  return getConfig();
}

/** Versão pública: só o que está ativo */
async function publicConfig() {
  const cfg = await getConfig();
  return { ...cfg, options: cfg.options.filter((o) => o.active) };
}

module.exports = { getConfig, saveConfig, publicConfig, OPTION_IDS, DEFAULTS };

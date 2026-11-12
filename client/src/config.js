/* =========================================================
   Configurações fáceis de mudar da loja
   ========================================================= */

// Faixa animada da loja: o normal é controlar pelo painel (Admin → Cupons →
// "Mostrar na faixa da loja"). Ela some sozinha quando o cupom acaba.
// Esta mensagem fixa só aparece se não houver cupom em destaque. '' = sem faixa.
export const PROMO_MESSAGE = '';

// Dados da loja (rodapé e páginas legais).
// Os valores reais ficam no client/.env (variáveis VITE_STORE_*).
// Os padrões abaixo são FICTÍCIOS, só para exemplo.
const env = import.meta.env;
export const STORE = {
  name: env.VITE_STORE_NAME || 'Tomanbin',
  legalName: env.VITE_STORE_LEGAL_NAME || 'Tomanbin Artigos Colecionáveis LTDA (exemplo)',
  document: env.VITE_STORE_DOCUMENT || 'CNPJ 00.000.000/0001-00 (fictício)',
  address: env.VITE_STORE_ADDRESS || 'Rua Exemplo, 123 – Centro, Boa Vista/RR – CEP 69301-000',
  email: env.VITE_STORE_EMAIL || 'contato@tomanbin.com.br',
  whatsapp: env.VITE_STORE_WHATSAPP || '95920029106', // só números, com DDD
  instagram: env.VITE_STORE_INSTAGRAM || 'tomanbin', // sem o @
  updatedAt: '11/11/2026', // data da última revisão das políticas
};

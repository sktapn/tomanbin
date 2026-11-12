require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5001;

(async () => {
  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET não definido no .env');
    if (process.env.JWT_SECRET.length < 32) {
      const msg = 'JWT_SECRET muito curto (use 32+ caracteres aleatórios). Veja o README.';
      if (process.env.NODE_ENV === 'production') throw new Error(msg);
      console.warn(`⚠️  ${msg}`);
    }
    if (process.env.NODE_ENV === 'production') {
      // Sem isso o site no ar fica quebrado (CORS, links dos e-mails) ou perde as fotos
      if (!process.env.CLIENT_URL) throw new Error('Defina CLIENT_URL (endereço do site, ex: https://tomanbin.vercel.app)');
      if (!process.env.CLOUDINARY_URL) console.warn('⚠️  Sem CLOUDINARY_URL: o envio de fotos fica desativado no site no ar.');
      const { paymentTestMode } = require('./controllers/orderController');
      if (paymentTestMode()) console.warn('⚠️  Pagamentos em MODO DE TESTE: nenhum Pix é cobrado de verdade. O site mostra um aviso.');
    }
    await connectDB();
    const server = http.createServer(app);
    initSocket(server, process.env.CLIENT_URL || 'http://localhost:5173');
    server.listen(PORT, () => console.log(`🚀 API rodando em http://localhost:${PORT}`));

    // Tarefas automáticas de pagamento
    const { expireStalePendingOrders, reconcilePendingPayments } = require('./controllers/orderController');
    // a cada 2 min: confere Pix pendentes no gateway (caso o webhook não chegue)
    setInterval(() => reconcilePendingPayments().catch((e) => console.error('Conferência de pagamentos:', e.message)), 2 * 60 * 1000).unref();
    // a cada 15 min: cancela pedidos não pagos antigos (conferindo o gateway antes) e devolve o estoque
    setInterval(() => expireStalePendingOrders().catch((e) => console.error('Limpeza de pedidos:', e.message)), 15 * 60 * 1000).unref();
  } catch (err) {
    console.error('❌ Falha ao iniciar:', err.message);
    process.exit(1);
  }
})();

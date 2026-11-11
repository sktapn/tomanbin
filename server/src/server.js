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
    await connectDB();
    const server = http.createServer(app);
    initSocket(server, process.env.CLIENT_URL || 'http://localhost:5173');
    server.listen(PORT, () => console.log(`🚀 API rodando em http://localhost:${PORT}`));

    // A cada 15 min, cancela pedidos não pagos antigos e devolve o estoque
    const { expireStalePendingOrders } = require('./controllers/orderController');
    setInterval(() => expireStalePendingOrders().catch((e) => console.error('Limpeza de pedidos:', e.message)), 15 * 60 * 1000).unref();
  } catch (err) {
    console.error('❌ Falha ao iniciar:', err.message);
    process.exit(1);
  }
})();

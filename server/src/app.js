const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const couponRoutes = require('./routes/couponRoutes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimit');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Atrás de proxy (Render/Railway) o IP real vem no X-Forwarded-For
if (isProd) app.set('trust proxy', 1);

// cross-origin: permite que o front (outra porta) exiba as imagens servidas aqui
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// Libera o CLIENT_URL. Fora de produção também libera localhost em qualquer porta
// (o Vite usa 5174, 5175...) e a rede local (para testar pelo celular no mesmo Wi-Fi).
const allowOrigin = (origin, cb) => {
  const local = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):\d+$/;
  const ok = !origin || origin === process.env.CLIENT_URL || (!isProd && local.test(origin));
  cb(null, ok);
};
app.use(cors({ origin: allowOrigin, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', apiLimiter);
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Imagens dos produtos de exemplo
app.use('/static', express.static(path.join(__dirname, '..', 'public'), { maxAge: '7d' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/coupons', couponRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
module.exports.allowOrigin = allowOrigin;

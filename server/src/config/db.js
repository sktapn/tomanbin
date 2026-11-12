const mongoose = require('mongoose');

async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) throw new Error('MONGO_URI não definida no .env');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000, // desiste rápido se o banco estiver fora
    socketTimeoutMS: 30_000,
    maxPoolSize: 10, // limite de conexões abertas
  });
  console.log(`✅ MongoDB conectado: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = connectDB;

const mongoose = require('mongoose');

async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) throw new Error('MONGO_URI não definida no .env');
  await mongoose.connect(uri);
  console.log(`✅ MongoDB conectado: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = connectDB;

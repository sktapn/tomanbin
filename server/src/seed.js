/* Popula o banco com um admin, um cliente de teste e produtos de exemplo.
 * Uso: npm run seed   (APAGA produtos e pedidos existentes!)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

const BASE = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5001}`;
// Ilustrações em server/public/products (servidas em /static/products)
const imgs = (slug, detalhe = true) => [
  `${BASE}/static/products/${slug}.svg`,
  ...(detalhe ? [`${BASE}/static/products/${slug}-2.svg`] : []),
];

const products = [
  { name: 'Button Gatinho Astronauta', category: 'buttons', price: 6.9, stock: 40, tag: 'mais-vendido', description: 'Button 38mm com acabamento brilhante e alfinete de segurança. Um gatinho explorando o espaço!', images: imgs('button-gatinho-astronauta') },
  { name: 'Kit 5 Buttons Retrô', category: 'buttons', price: 24.9, stock: 15, tag: 'novo', description: 'Kit com 5 buttons de 45mm: coração, estrela, carinha feliz, raio e coração pixel.', images: imgs('kit-buttons-retro') },
  { name: 'Button "Café Primeiro"', category: 'buttons', price: 5.5, stock: 60, tag: '', description: 'Para quem não funciona antes do café. 38mm.', images: imgs('button-cafe-primeiro') },
  { name: 'Button Planta Feliz', category: 'buttons', price: 5.9, stock: 2, tag: '', description: 'Uma plantinha sorridente em button 32mm.', images: imgs('button-planta-feliz', false) },
  { name: 'Chaveiro Dragãozinho', category: 'chaveiros', price: 14.9, stock: 25, tag: 'mais-vendido', description: 'Acrílico 6cm, impressão dupla face, argola metálica.', images: imgs('chaveiro-dragaozinho') },
  { name: 'Chaveiro Sushi Sorridente', category: 'chaveiros', price: 12.5, stock: 30, tag: '', description: 'Acrílico 5cm, super resistente. O sushi mais fofo do Japão.', images: imgs('chaveiro-sushi', false) },
  { name: 'Chaveiro Shaker Lua & Estrelas', category: 'chaveiros', price: 18.0, stock: 10, tag: 'edicao-limitada', description: 'Acrílico com glitter em movimento (shaker). Balance e veja as estrelinhas!', images: imgs('chaveiro-lua-estrelas') },
  { name: 'Chaveiro Personalizado com Nome', category: 'chaveiros', price: 22.0, stock: 50, tag: 'novo', description: 'Escreva o nome que quiser! Acrílico 7cm.', images: imgs('chaveiro-nome', false) },
  { name: 'Action Figure Guerreira Estelar', category: 'action-figures', price: 129.9, stock: 6, tag: 'edicao-limitada', description: 'Figura articulada 15cm com varinha de estrela e base colecionável.', images: imgs('figure-guerreira-pixel') },
  { name: 'Action Figure Robô Retrô', category: 'action-figures', price: 99.0, stock: 3, tag: '', description: 'Robô colecionável 12cm, braços e cabeça articulados.', images: imgs('figure-robo-retro') },
  { name: 'Mini Figure Mago Chibi', category: 'action-figures', price: 59.9, stock: 12, tag: 'novo', description: 'Estilo chibi, 8cm, pintado à mão. Acompanha cajado de cristal.', images: imgs('figure-mago-chibi', false) },
  { name: 'Action Figure Astronauta Lunar', category: 'action-figures', price: 149.0, stock: 0, tag: 'edicao-limitada', description: 'Edição limitada 18cm com capacete transparente.', images: imgs('figure-astronauta-lunar') },
];

(async () => {
  try {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@quelita.com';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: 'Admin Tomanbin',
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || 'admin123',
        role: 'admin',
      });
    }
    if (!(await User.findOne({ email: 'cliente@quelita.com' }))) {
      await User.create({ name: 'Cliente Teste', email: 'cliente@quelita.com', password: 'cliente123' });
    }

    await Order.deleteMany({});
    await Product.deleteMany({});
    await Product.insertMany(products.map((p) => ({ ...p, createdBy: admin._id })));

    console.log(`🌱 Seed concluído: ${products.length} produtos`);
    console.log(`   Admin:   ${adminEmail} / ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    console.log('   Cliente: cliente@quelita.com / cliente123');
  } catch (err) {
    console.error('Erro no seed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

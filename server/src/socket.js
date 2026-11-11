const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io = null;

/**
 * Tempo real (bônus):
 *  - "order:new"     -> admins recebem aviso de novo pedido
 *  - "order:status"  -> o dono do pedido recebe aviso de mudança de status
 *  - "stock:update"  -> todos recebem o estoque atualizado de um produto
 */
function initSocket(httpServer, clientUrl) {
  const { allowOrigin } = require('./app');
  io = new Server(httpServer, { cors: { origin: allowOrigin || clientUrl, credentials: true } });

  io.on('connection', async (socket) => {
    const token = socket.handshake.auth?.token;
    if (!token) return;
    try {
      const { id } = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      // Confere no banco: quem perdeu o acesso de admin não recebe mais avisos de admin
      const user = await User.findById(id).select('role');
      if (!user) return;
      socket.join(`user:${user._id}`);
      if (user.role === 'admin') socket.join('admins');
    } catch {
      /* token inválido: segue como visitante */
    }
  });

  return io;
}

// Emite com segurança mesmo quando o socket não foi iniciado (ex: testes)
function emit(room, event, payload) {
  if (!io) return;
  if (room) io.to(room).emit(event, payload);
  else io.emit(event, payload);
}

module.exports = { initSocket, emit };

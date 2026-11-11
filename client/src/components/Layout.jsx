import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { STATUS_LABELS, formatPrice } from '../utils';

export default function Layout() {
  const { user, isAdmin, socket } = useAuth();
  const toast = useToast();
  const { pathname } = useLocation();

  // Volta ao topo ao trocar de página.
  // Obs.: as chaves {} são importantes — no Chrome novo, scrollTo devolve uma Promise e,
  // se ela fosse "retornada" pelo efeito, o React tentaria usá-la como limpeza e quebraria a tela.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Notificações em tempo real (Socket.io)
  useEffect(() => {
    if (!socket) return;
    const onNewOrder = (o) => toast(`🛍️ Novo pedido de ${o.customer}: ${formatPrice(o.total)}`, 'info');
    const onStatus = (o) => toast(`📦 Seu pedido agora está: ${STATUS_LABELS[o.status]}`, 'info');
    const onPaid = (o) => toast(`💸 Pagamento Pix recebido: ${formatPrice(o.total)}`, 'success');
    const onPaidLate = (o) => toast(`⚠️ Pix de ${formatPrice(o.total)} caiu num pedido já cancelado. Veja em Pedidos.`, 'error');
    if (isAdmin) {
      socket.on('order:new', onNewOrder);
      socket.on('order:paid', onPaid);
      socket.on('order:paid-after-cancel', onPaidLate);
    }
    if (user) socket.on('order:status', onStatus);
    return () => {
      socket.off('order:new', onNewOrder);
      socket.off('order:paid', onPaid);
      socket.off('order:paid-after-cancel', onPaidLate);
      socket.off('order:status', onStatus);
    };
  }, [socket, user, isAdmin, toast]);

  return (
    <div className="app">
      <Navbar />
      <main className="container main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

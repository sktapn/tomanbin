import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import WhatsAppButton from './WhatsAppButton';
import { Spinner } from './Feedback';
import Maintenance from '../pages/Maintenance';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { STATUS_LABELS, formatPrice } from '../utils';

// Páginas que continuam abertas na manutenção (para o admin conseguir entrar)
const OPEN_DURING_MAINTENANCE = /^\/(login|esqueci-senha|redefinir-senha)/;

export default function Layout() {
  const { user, isAdmin, socket, loading } = useAuth();
  const toast = useToast();
  const { pathname } = useLocation();

  // Pagamentos em modo de teste? Avisa o visitante para ninguém achar que pagou de verdade
  // e se a loja está em manutenção (clientes veem a página "Voltamos já")
  const [testMode, setTestMode] = useState(false);
  const [maintenance, setMaintenance] = useState(null);
  useEffect(() => {
    api.get('/store').then(({ data }) => {
      setTestMode(!!data.paymentTestMode);
      setMaintenance(data.maintenance || null);
    }).catch(() => {});
    // o admin ligou/desligou no Dashboard: atualiza sem recarregar
    const onChange = (e) => setMaintenance(e.detail.maintenance);
    window.addEventListener('tomanbin:store-changed', onChange);
    return () => window.removeEventListener('tomanbin:store-changed', onChange);
  }, []);

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

  if (maintenance?.enabled && !OPEN_DURING_MAINTENANCE.test(pathname)) {
    if (loading) return <Spinner label="Carregando..." />; // ainda conferindo se é o admin
    if (!isAdmin) return <Maintenance message={maintenance.message} />;
  }

  return (
    <div className="app">
      {maintenance?.enabled && isAdmin && (
        <div className="test-banner maintenance-banner" role="status">
          🛠️ Modo manutenção ligado: os clientes estão vendo a página "Voltamos já".{' '}
          <Link to="/admin">Abrir a loja no painel</Link>
        </div>
      )}
      {testMode && (
        <div className="test-banner" role="status">
          🧪 Loja em modo de teste: os pagamentos são simulados e nenhum pedido será entregue.
        </div>
      )}
      <Navbar />
      <main className="container main">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

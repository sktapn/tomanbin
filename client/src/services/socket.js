import { io } from 'socket.io-client';
import { API_URL } from '../api/axios';

/** Cria uma conexão Socket.io com o token atual (ou como visitante). */
export function connectSocket(token) {
  return io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] });
}

import axios from 'axios';

const ENV_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Se o site foi aberto por outro aparelho (ex: celular em http://192.168.x.x:5173),
// "localhost" apontaria para o próprio celular. Trocamos pelo endereço do computador.
function resolveApiUrl() {
  try {
    const url = new URL(ENV_URL);
    const pageHost = window.location.hostname;
    const isLocal = (h) => h === 'localhost' || h === '127.0.0.1';
    if (isLocal(url.hostname) && !isLocal(pageHost)) url.hostname = pageHost;
    return url.origin;
  } catch {
    return ENV_URL;
  }
}

export const API_URL = resolveApiUrl();
const ENV_ORIGIN = (() => {
  try {
    return new URL(ENV_URL).origin;
  } catch {
    return ENV_URL;
  }
})();

const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 15000 });

// Envia o token JWT em toda requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tomanbin:token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Se o token expirar, avisa a aplicação para deslogar
api.interceptors.response.use(
  (res) => {
    // Corrige URLs de imagem salvas como http://localhost:5001/... quando acessado pelo celular
    if (API_URL !== ENV_ORIGIN && res.data && typeof res.data === 'object') {
      res.data = JSON.parse(JSON.stringify(res.data).split(ENV_ORIGIN).join(API_URL));
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('tomanbin:token')) {
      window.dispatchEvent(new Event('tomanbin:unauthorized'));
    }
    return Promise.reject(err);
  }
);

/** Extrai uma mensagem amigável de qualquer erro do axios */
export function errorMessage(err) {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.code === 'ECONNABORTED') return 'O servidor demorou para responder. Tente novamente.';
  if (!err.response) return 'Não foi possível conectar ao servidor.';
  return 'Algo deu errado. Tente novamente.';
}

export default api;

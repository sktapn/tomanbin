import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Endereço público do site (usado nas tags de prévia do index.html)
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.VITE_SITE_URL || 'http://localhost:5173').replace(/\/$/, '');

  return {
    plugins: [
      react(),
      { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl) },
    ],
    // host: true -> permite abrir pelo celular na mesma rede Wi-Fi
    server: { port: 5173, host: true },
    preview: { host: true },
  };
});

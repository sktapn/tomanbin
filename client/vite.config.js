import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // host: true -> permite abrir pelo celular na mesma rede Wi-Fi
  server: { port: 5173, host: true },
  preview: { host: true },
});

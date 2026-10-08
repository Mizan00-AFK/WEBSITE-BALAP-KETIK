import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const rootDir = fileURLToPath(new URL('..', import.meta.url));
  const env = loadEnv(mode, rootDir, '');
  const serverTarget = `http://localhost:${env.PORT || '3001'}`;
  // In development the client talks to the Socket.IO server through this proxy,
  // so phones on the same Wi-Fi only need to open http://<your-ip>:5173.
  const proxy = {
    '/socket.io': { target: serverTarget, ws: true, changeOrigin: true },
    '/api': { target: serverTarget, changeOrigin: true },
  };

  return {
    plugins: [react()],
    envDir: rootDir,
    resolve: {
      alias: {
        '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
      },
    },
    server: {
      host: true,
      port: 5173,
      proxy,
      fs: { allow: [rootDir] },
    },
    preview: {
      host: true,
      port: 4173,
      proxy,
    },
    build: {
      outDir: 'dist',
      assetsDir: 'static',
      chunkSizeWarningLimit: 2000,
    },
  };
});

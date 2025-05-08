import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Match your running port
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true, // Enable WebSocket proxy for Socket.IO
      },
    },
  },
});
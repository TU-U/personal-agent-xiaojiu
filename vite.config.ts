import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { host:'127.0.0.1', port: 5173, fs:{deny:['**/.env','**/.env.*','**/.git/**','**/.data/**','**/.local-model/**','**/.local-runtime/**','**/server/provider.local.mjs','**/server/ai/provider.local.mjs']}, proxy: { '/api': 'http://127.0.0.1:4317' } }, build: { chunkSizeWarningLimit: 700 } });

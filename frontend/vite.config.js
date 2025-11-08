import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = mode === 'production' 
    ? 'https://tailor-booking-website.onrender.com'
    : (env.VITE_API_BASE || 'http://127.0.0.1:8000');
  
  console.log('Mode:', mode);
  console.log('API Base URL:', apiBase);
  
  return {
    plugins: [react()],
    base: '/',
    define: {
      'import.meta.env.VITE_API_BASE': JSON.stringify(apiBase)
    },
    build: {
      rollupOptions: {
        // Ensure _redirects file is copied to build output
        external: [],
      }
    },
    // Ensure SPA routing works in development
    server: {
      historyApiFallback: true
    }
  };
});

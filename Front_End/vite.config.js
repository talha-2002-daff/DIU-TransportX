
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  //This tells Vite to listen on all network interfaces rather than only the local loopback interface.
    strictPort: true,
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: function (proxy) {
          proxy.on('proxyReq', function (proxyReq) {
            proxyReq.removeHeader('origin')
          })
        }
      }
    }
  }
})
//This tells Vite to forward API requests to your Express backend
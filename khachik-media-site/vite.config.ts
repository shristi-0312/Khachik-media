import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      // Same-origin media for WebGL (CloudFront CORS is unreliable for textures).
      '/cf': {
        target: 'https://d1rkq96nxpa3sq.cloudfront.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/cf/, ''),
      },
    },
  },
})

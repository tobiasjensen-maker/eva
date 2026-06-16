import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env (all vars, no VITE_ prefix filter) into this Node-side config only.
  // The e-conomic tokens stay here — they are never bundled into the client.
  const env = loadEnv(mode, process.cwd(), '')
  const appSecret = env.ECONOMIC_APP_SECRET_TOKEN
  const grantToken = env.ECONOMIC_AGREEMENT_GRANT_TOKEN

  return {
    // Served from https://<user>.github.io/eva/ — assets must resolve under /eva/.
    base: '/eva/',
    plugins: [react()],
    css: {
      transformer: 'postcss',
    },
    build: {
      cssMinify: false,
    },
    server: {
      proxy: {
        // The e-conomic REST API sends no CORS headers, so the browser can't call it
        // directly. We proxy /eco/* → restapi.e-conomic.com/* and attach the App
        // Secret + Agreement Grant tokens here, server-side, so they never reach the client.
        '/eco': {
          target: 'https://restapi.e-conomic.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/eco/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (appSecret) proxyReq.setHeader('X-AppSecretToken', appSecret)
              if (grantToken) proxyReq.setHeader('X-AgreementGrantToken', grantToken)
              proxyReq.setHeader('Content-Type', 'application/json')
            })
          },
        },
      },
    },
  }
})

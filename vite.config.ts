import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

/**
 * Supabase default Site URL is often set to http://localhost:3000.
 * When developers or users click email confirmation / invite links that point to localhost:3000,
 * this plugin catches port 3000 requests and forwards them to the active Vite dev server (port 5173),
 * preserving all path, query parameters, and auth hash tokens (#access_token=...).
 */
function supabasePortForwarder(): Plugin {
  return {
    name: 'supabase-port-forwarder',
    configureServer(server) {
      const forwarder = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting to Pondtora...</title>
  <script>
    const target = 'http://localhost:5173' + window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(target);
  </script>
</head>
<body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #334155;">
  <div style="text-align: center;">
    <h2>Redirecting to Pondtora...</h2>
    <p>If you are not redirected automatically, <a href="http://localhost:5173" style="color: #16a34a; font-weight: bold;">click here</a>.</p>
  </div>
</body>
</html>`)
      })

      forwarder.on('error', (err: any) => {
        // Port 3000 already in use or cannot bind - ignore silently
        if (err.code !== 'EADDRINUSE') {
          console.warn('[supabase-forwarder] Notice:', err.message)
        }
      })

      forwarder.listen(3000, () => {
        console.log('  ➜  Supabase callback forwarder active on http://localhost:3000 -> http://localhost:5173')
      })

      server.httpServer?.on('close', () => {
        try {
          forwarder.close()
        } catch {}
      })
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
    supabasePortForwarder(),
  ],
  server: {
    port: 5173,
    strictPort: false,
  },
  root: '.',
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})


import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from fanofin.site's root (custom domain via public/CNAME), not a GitHub Pages
  // project subpath — '/' is Vite's default, set explicitly so it doesn't silently change if
  // someone later assumes a subpath deploy.
  base: '/',
  plugins: [react(), tailwindcss()],
})

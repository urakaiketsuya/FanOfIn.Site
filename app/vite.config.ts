import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { artistSocialManifest } from '../scripts/artist-social-manifest.mjs'

// https://vite.dev/config/
export default defineConfig({
  // Served from fanofin.site's root (custom domain via public/CNAME), not a GitHub Pages
  // project subpath — '/' is Vite's default, set explicitly so it doesn't silently change if
  // someone later assumes a subpath deploy.
  base: '/',
  define: { __ARTIST_SOCIAL_IMAGES__: JSON.stringify(artistSocialManifest()) },
  plugins: [react(), tailwindcss()],
})

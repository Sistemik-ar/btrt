import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Allow ngrok/cloudflare tunnels to reach `vite preview` (phone PWA testing).
  preview: {
    allowedHosts: ['.ngrok-free.dev', '.ngrok.app', '.trycloudflare.com'],
  },
  server: {
    allowedHosts: ['.ngrok-free.dev', '.ngrok.app', '.trycloudflare.com'],
  },
})

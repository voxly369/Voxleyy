import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { securityHeadersPlugin } from './vite-security-headers-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), securityHeadersPlugin()],
})

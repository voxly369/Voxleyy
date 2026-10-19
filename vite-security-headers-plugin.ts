import type { Plugin } from 'vite'
import { headersForPath } from './config/securityHeaders.ts'

export function securityHeadersPlugin(): Plugin {
  return {
    name: 'voxly-security-headers',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '/'
        const headers = headersForPath(url)
        for (const [name, value] of Object.entries(headers)) {
          res.setHeader(name, value)
        }
        next()
      })
    },
  }
}

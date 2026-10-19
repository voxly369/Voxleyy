import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { CSP, GLOBAL_SECURITY_HEADERS, PERMISSIONS_POLICY } from './securityHeaders.ts'

describe('security headers drift', () => {
  it('matches render.yaml CSP and global headers', () => {
    const yaml = readFileSync(path.join(process.cwd(), 'render.yaml'), 'utf8')
    expect(yaml).toContain(CSP)
    expect(yaml).toContain(GLOBAL_SECURITY_HEADERS['Strict-Transport-Security'])
    expect(yaml).toContain(GLOBAL_SECURITY_HEADERS['X-Content-Type-Options'])
    expect(yaml).toContain(GLOBAL_SECURITY_HEADERS['Referrer-Policy'])
    expect(yaml).toContain(GLOBAL_SECURITY_HEADERS['X-Frame-Options'])
    expect(yaml).toContain(PERMISSIONS_POLICY)
    expect(yaml).toContain(GLOBAL_SECURITY_HEADERS['Cross-Origin-Opener-Policy'])
  })
})

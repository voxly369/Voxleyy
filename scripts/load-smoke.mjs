#!/usr/bin/env node
/**
 * Read-only smoke check: GET {BASE_URL}/health JSON.
 * Refuses to run when pointed at production Supabase unless VOXLY_SMOKE_ALLOW_PRODUCTION=1.
 */
const BASE_URL = process.env.BASE_URL?.replace(/\/$/, '')
const PRODUCTION_PROJECT_REF = process.env.VOXLY_PRODUCTION_PROJECT_REF ?? 'ktgxdqplvggeyrnuqljx'

function supabaseUrl() {
  return process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
}

function isProductionDatabase() {
  const url = supabaseUrl()
  if (!url) return false
  try {
    const host = new URL(url).hostname
    return host.includes(PRODUCTION_PROJECT_REF)
  } catch {
    return false
  }
}

if (!BASE_URL) {
  console.error('load-smoke: set BASE_URL (e.g. http://127.0.0.1:4173)')
  process.exit(1)
}

if (isProductionDatabase() && process.env.VOXLY_SMOKE_ALLOW_PRODUCTION !== '1') {
  console.error(
    'load-smoke: refusing to run with production Supabase URL. Set VOXLY_SMOKE_ALLOW_PRODUCTION=1 to override.',
  )
  process.exit(1)
}

const healthUrl = `${BASE_URL}/health`

const response = await fetch(healthUrl, { method: 'GET', headers: { Accept: 'application/json' } })
if (!response.ok) {
  console.error(`load-smoke: ${healthUrl} returned ${response.status}`)
  process.exit(1)
}

let body
try {
  body = await response.json()
} catch {
  console.error('load-smoke: health response is not JSON')
  process.exit(1)
}

if (body?.status !== 'ok') {
  console.error('load-smoke: unexpected health payload', body)
  process.exit(1)
}

console.log(`load-smoke: OK ${healthUrl}`)

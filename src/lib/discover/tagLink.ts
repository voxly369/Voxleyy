import { normalizeTagInput } from '../creations/tags.ts'

export function normalizeTagRouteParam(raw: string): string | null {
  return normalizeTagInput(raw.replace(/^#/, ''))
}

export function tagPagePath(tag: string): string {
  const normalized = normalizeTagInput(tag)
  return normalized ? `/tags/${encodeURIComponent(normalized)}` : '/discover'
}

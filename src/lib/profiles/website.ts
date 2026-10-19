export type WebsiteLink = {
  href: string
  label: string
}

export type WebsiteResult = { ok: true; link: WebsiteLink | null } | { ok: false; message: string }

const MAX_WEBSITE_LENGTH = 300

// Only http and https are links. javascript:, data:, and scheme-less text are rejected.
export function parseWebsite(input: string): WebsiteResult {
  const value = input.trim()
  if (!value) return { ok: true, link: null }
  if (value.length > MAX_WEBSITE_LENGTH) {
    return { ok: false, message: 'That web address is too long.' }
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return { ok: false, message: 'Enter a full web address starting with http:// or https://.' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, message: 'Use an http or https web address.' }
  }
  if (url.username || url.password) {
    return { ok: false, message: 'That web address is not allowed.' }
  }
  if (!url.hostname) {
    return { ok: false, message: 'Enter a full web address starting with http:// or https://.' }
  }

  const path = `${url.pathname}${url.search}${url.hash}`
  const visiblePath = path === '/' ? '' : path
  return {
    ok: true,
    link: {
      href: url.href,
      label: `${url.host}${visiblePath}`,
    },
  }
}

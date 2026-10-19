export type PublishCheckInput = {
  title: string
  body: string
}

export type PublishCheckResult = { ok: true } | { ok: false; message: string }

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function nonEmptyBodyLines(body: string): number {
  return body.split('\n').filter((line) => line.trim().length > 0).length
}

export function validatePublishContent(input: PublishCheckInput): PublishCheckResult {
  if (!input.title.trim()) {
    return { ok: false, message: 'Add a title before you publish.' }
  }
  if (nonEmptyBodyLines(input.body) < 1) {
    return { ok: false, message: 'Add at least one line of writing before you publish.' }
  }
  return { ok: true }
}

export function publishContentStats(body: string) {
  return {
    words: countWords(body),
    lines: body.split('\n').length,
    characters: body.length,
  }
}

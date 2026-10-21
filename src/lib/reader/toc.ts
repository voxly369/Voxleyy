import { bodyContentFromJson } from '../creations/bodyDocument.ts'
import type { Json } from '../database.types.ts'

export type TocEntry = { id: string; level: 2 | 3; text: string; blockIndex: number }

export function tableOfContentsFromBody(bodyJson: Json | null | undefined, bodyText: string | null): TocEntry[] {
  const doc = bodyContentFromJson(bodyJson, bodyText ?? '')
  const entries: TocEntry[] = []
  doc.content.forEach((block, index) => {
    if (block.type !== 'heading') return
    const level = block.level === 3 ? 3 : 2
    const text = (block.content ?? []).map((n) => (n.type === 'text' ? n.text : '')).join('').trim()
    if (!text) return
    entries.push({ id: `reader-heading-${index}`, level, text, blockIndex: index })
  })
  return entries
}

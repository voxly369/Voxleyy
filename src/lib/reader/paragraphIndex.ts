import type { RichBodyDocument } from '../creations/richDocument.ts'
import { bodyContentFromJson } from '../creations/bodyDocument.ts'
import type { Json } from '../database.types.ts'

/** Paragraph index = index among paragraph + heading blocks (reader resume position). */
export function paragraphBlocksFromBody(bodyJson: Json | null | undefined, bodyText: string | null): RichBodyDocument['content'] {
  const doc = bodyContentFromJson(bodyJson, bodyText ?? '')
  return doc.content.filter((block) => block.type === 'paragraph' || block.type === 'heading')
}

export function paragraphCount(bodyJson: Json | null | undefined, bodyText: string | null): number {
  return paragraphBlocksFromBody(bodyJson, bodyText).length
}

export function percentFromParagraphIndex(index: number, totalParagraphs: number): number {
  if (totalParagraphs <= 0) return 0
  const clamped = Math.min(totalParagraphs - 1, Math.max(0, index))
  return Math.round(((clamped + 1) / totalParagraphs) * 100)
}

/** Map a full-document block index to reader paragraph index (headings + paragraphs only). */
export function readerParagraphIndexFromBlockIndex(
  blockIndex: number,
  bodyJson: Json | null | undefined,
  bodyText: string | null,
): number {
  const doc = bodyContentFromJson(bodyJson, bodyText ?? '')
  let readerIndex = 0
  for (let i = 0; i < doc.content.length && i <= blockIndex; i += 1) {
    const block = doc.content[i]
    if (block.type === 'paragraph' || block.type === 'heading') {
      if (i === blockIndex) return readerIndex
      readerIndex += 1
    }
  }
  return Math.max(0, readerIndex)
}

export function paragraphIndexFromScroll(
  blockOffsets: readonly number[],
  scrollTop: number,
  viewportHeight: number,
): number {
  if (blockOffsets.length === 0) return 0
  const focus = scrollTop + viewportHeight * 0.25
  let index = 0
  for (let i = 0; i < blockOffsets.length; i += 1) {
    if (blockOffsets[i] <= focus) index = i
  }
  return index
}

import { clampPercent } from './progressRules.ts'
import { percentFromParagraphIndex } from './paragraphIndex.ts'

export type StoredReadingPosition = {
  paragraphIndex: number
  positionOffset: number
  percent: number
}

export function clampPositionOffset(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function readingPositionFromParagraph(
  paragraphIndex: number,
  positionOffset: number,
  totalParagraphs: number,
): StoredReadingPosition {
  const offset = clampPositionOffset(positionOffset)
  const index = Math.max(0, paragraphIndex)
  return {
    paragraphIndex: index,
    positionOffset: offset,
    percent: clampPercent(percentFromParagraphIndex(index, totalParagraphs)),
  }
}

export function paragraphElement(root: ParentNode, paragraphIndex: number): HTMLElement | null {
  const node = root.querySelector(`[data-reader-paragraph-index="${paragraphIndex}"]`)
  return node instanceof HTMLElement ? node : null
}

/** Viewport focus line as fraction from top (matches paragraphIndexFromScroll). */
export const READING_FOCUS_VIEWPORT_FRACTION = 0.25

export function measureParagraphOffset(paragraph: HTMLElement, scrollTop: number, viewportHeight: number): number {
  const paraTop = paragraph.offsetTop
  const paraHeight = Math.max(paragraph.offsetHeight, 1)
  const focus = scrollTop + viewportHeight * READING_FOCUS_VIEWPORT_FRACTION
  return clampPositionOffset((focus - paraTop) / paraHeight)
}

export function measureScrollReadingPosition(scrollable: HTMLElement): StoredReadingPosition | null {
  const paragraphs = scrollable.querySelectorAll('[data-reader-paragraph-index]')
  if (paragraphs.length === 0) return null
  const scrollTop = scrollable.scrollTop
  const viewportHeight = scrollable.clientHeight
  const focus = scrollTop + viewportHeight * READING_FOCUS_VIEWPORT_FRACTION
  let paragraphIndex = 0
  for (const node of paragraphs) {
    if (!(node instanceof HTMLElement)) continue
    if (node.offsetTop <= focus) paragraphIndex = Number(node.dataset.readerParagraphIndex ?? 0)
  }
  const active = paragraphElement(scrollable, paragraphIndex)
  const positionOffset = active ? measureParagraphOffset(active, scrollTop, viewportHeight) : 0
  return readingPositionFromParagraph(paragraphIndex, positionOffset, paragraphs.length)
}

export function scrollToReadingPosition(
  scrollable: HTMLElement,
  paragraphIndex: number,
  positionOffset: number,
): void {
  const paragraph = paragraphElement(scrollable, paragraphIndex)
  if (!paragraph) return
  const offset = clampPositionOffset(positionOffset)
  const paraTop = paragraph.offsetTop
  const paraHeight = Math.max(paragraph.offsetHeight, 1)
  const focusY = paraTop + offset * paraHeight
  const nextTop = focusY - scrollable.clientHeight * READING_FOCUS_VIEWPORT_FRACTION
  const max = Math.max(0, scrollable.scrollHeight - scrollable.clientHeight)
  scrollable.scrollTop = Math.min(max, Math.max(0, nextTop))
}

export function paragraphHorizontalFocus(paragraph: HTMLElement, positionOffset: number): number {
  const offset = clampPositionOffset(positionOffset)
  return paragraph.offsetLeft + offset * Math.max(paragraph.offsetWidth, 1)
}

export function pageIndexForParagraph(paragraph: HTMLElement, pageWidth: number, positionOffset: number): number {
  if (pageWidth <= 0) return 0
  const x = paragraphHorizontalFocus(paragraph, positionOffset)
  return Math.max(0, Math.floor(x / pageWidth))
}

export function focusReaderHeading(blockIndex: number, root: ParentNode): void {
  const id = `reader-heading-${blockIndex}`
  const heading = root.querySelector(`#${CSS.escape(id)}`)
  if (heading instanceof HTMLElement) {
    heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }
}

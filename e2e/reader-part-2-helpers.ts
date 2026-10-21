import type { Page } from '@playwright/test'

export async function selectWordInParagraph(page: Page, paragraphIndex: number, word: string) {
  const locator = page.locator(`[data-reader-paragraph-index="${paragraphIndex}"]`)
  await locator.evaluate(
    (el, targetWord) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let node: Node | null = walker.nextNode()
      while (node) {
        const content = node.textContent ?? ''
        const idx = content.indexOf(targetWord)
        if (idx >= 0) {
          const range = document.createRange()
          range.setStart(node, idx)
          range.setEnd(node, idx + targetWord.length)
          const selection = window.getSelection()
          selection?.removeAllRanges()
          selection?.addRange(range)
          document.dispatchEvent(new Event('selectionchange'))
          el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
          return true
        }
        node = walker.nextNode()
      }
      return false
    },
    word,
  )
  await page.dispatchEvent('body', 'mouseup')
}

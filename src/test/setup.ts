import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { resetModalStackForTests } from '../lib/shell/modalFocus.ts'

afterEach(() => {
  resetModalStackForTests()
})

if (typeof document !== 'undefined' && !document.elementFromPoint) {
  document.elementFromPoint = () => null
}

if (typeof Element !== 'undefined') {
  Element.prototype.getClientRects =
    Element.prototype.getClientRects ??
    function getClientRects() {
      return [{ width: 100, height: 20, top: 0, left: 0, right: 100, bottom: 20 }] as unknown as DOMRectList
    }
  Element.prototype.getBoundingClientRect =
    Element.prototype.getBoundingClientRect ??
    function getBoundingClientRect() {
      return { width: 100, height: 20, top: 0, left: 0, right: 100, bottom: 20, x: 0, y: 0, toJSON: () => ({}) }
    }
}

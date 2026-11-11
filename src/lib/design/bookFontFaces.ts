/**
 * Book-writing @font-face rules (Fontsource, SIL OFL).
 * Import this module when mounting the book writer or preview — not from app shell,
 * so CSP `font-src 'self'` is not tripped by unrelated routes during e2e.
 */
import '@fontsource/literata/400.css'
import '@fontsource/literata/400-italic.css'
import '@fontsource/literata/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/700.css'

export function loadBookWritingFontFaces(): void {
  /* side-effect imports above */
}

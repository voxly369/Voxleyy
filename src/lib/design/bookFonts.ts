/** Body text in the book writer and preview. */
export const BOOK_BODY_FONT_FAMILY = "'Literata', Georgia, 'Times New Roman', serif"

/** Chrome and controls around the book writing tools (distinct from app shell variable Inter). */
export const BOOK_UI_FONT_FAMILY = "'Inter', ui-sans-serif, system-ui, sans-serif"

/** Book titles and chapter headings. */
export const BOOK_HEADING_FONT_FAMILY = "'Cormorant Garamond', Georgia, 'Times New Roman', serif"

export const BOOK_WRITING_FONT_PACKAGES = [
  '@fontsource/literata',
  '@fontsource/inter',
  '@fontsource/cormorant-garamond',
] as const

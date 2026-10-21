/** Page count from total content height and one viewport page height (legacy vertical slice). */
export function pageCount(contentHeight: number, pageHeight: number): number {
  if (pageHeight <= 0 || contentHeight <= 0) return 1
  return Math.max(1, Math.ceil(contentHeight / pageHeight))
}

/** Page count for CSS multi-column layout (horizontal scroll width / one page width). */
export function columnPageCount(contentScrollWidth: number, pageWidth: number): number {
  if (pageWidth <= 0 || contentScrollWidth <= 0) return 1
  return Math.max(1, Math.ceil(contentScrollWidth / pageWidth))
}

export function pagesRemaining(currentPage: number, totalPages: number): number {
  return Math.max(0, totalPages - currentPage)
}

export function clampPageIndex(page: number, totalPages: number): number {
  if (totalPages <= 0) return 0
  return Math.min(totalPages - 1, Math.max(0, page))
}

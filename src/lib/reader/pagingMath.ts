/** Page count from total content height and one viewport page height. */
export function pageCount(contentHeight: number, pageHeight: number): number {
  if (pageHeight <= 0 || contentHeight <= 0) return 1
  return Math.max(1, Math.ceil(contentHeight / pageHeight))
}

export function pagesRemaining(currentPage: number, totalPages: number): number {
  return Math.max(0, totalPages - currentPage)
}

export function clampPageIndex(page: number, totalPages: number): number {
  if (totalPages <= 0) return 0
  return Math.min(totalPages - 1, Math.max(0, page))
}

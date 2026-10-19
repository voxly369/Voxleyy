import type { PublishedWorkSummary } from './types.ts'

/** Client-side guard: never render non-public tiles even if the server mis-filters. */
export function worksForPostsGrid(works: readonly PublishedWorkSummary[]): PublishedWorkSummary[] {
  return works.filter((work) => work.audience === 'public')
}

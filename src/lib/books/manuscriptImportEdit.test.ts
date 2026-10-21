import { describe, expect, it } from 'vitest'
import { plainTextToChapterJson } from './booksApi.ts'
import type { ImportedChapter } from './importManuscript.ts'
import {
  deleteImportedChapter,
  mergeImportedChapterWithNext,
  renameImportedChapter,
  reorderImportedChapters,
  splitImportedChapter,
} from './manuscriptImportEdit.ts'

const sample = (): ImportedChapter[] => [
  { title: 'A', bodyText: 'Alpha body text', bodyJson: plainTextToChapterJson('Alpha body text') },
  { title: 'B', bodyText: 'Beta body text', bodyJson: plainTextToChapterJson('Beta body text') },
]

describe('manuscriptImportEdit', () => {
  it('renames, reorders, merges, splits, and deletes', () => {
    let chapters = sample()
    chapters = renameImportedChapter(chapters, 0, 'Alpha renamed')
    expect(chapters[0]?.title).toBe('Alpha renamed')
    chapters = reorderImportedChapters(chapters, 1, 0)
    expect(chapters[0]?.title).toBe('B')
    chapters = mergeImportedChapterWithNext(chapters, 0)
    expect(chapters).toHaveLength(1)
    chapters = splitImportedChapter(chapters, 0)
    expect(chapters.length).toBeGreaterThan(1)
    chapters = deleteImportedChapter(chapters, 0)
    expect(chapters).toHaveLength(1)
  })
})

import { describe, expect, it } from 'vitest'
import { validateCollectionName } from './collectionName.ts'

describe('validateCollectionName', () => {
  it('trims and rejects html', () => {
    expect(validateCollectionName('  Poetry  ')).toBeNull()
    expect(validateCollectionName('<b>x</b>')).toMatch(/HTML/)
    expect(validateCollectionName('')).toMatch(/required/)
  })
})

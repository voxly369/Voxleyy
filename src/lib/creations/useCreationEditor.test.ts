import { describe, expect, it, vi } from 'vitest'
import { buildBodyJsonForTest } from './editorTestHelpers.ts'

vi.mock('./api.ts', () => ({
  createDraft: vi.fn(),
  getEditableCreation: vi.fn(),
  saveCreationFields: vi.fn(),
}))

describe('editor save payload', () => {
  it('includes caption in body json build for quote cards', () => {
    const json = buildBodyJsonForTest('quote_card', 'Line', { background: '#111111', color: '#eeeeee', size: 'medium' })
    expect(json).toMatchObject({ format: 'quote_card', text: 'Line' })
  })
})

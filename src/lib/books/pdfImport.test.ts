import { describe, expect, it } from 'vitest'
import {
  extractPlainTextFromPdfDocument,
  mapPdfLoadError,
  PDF_CORRUPT_OR_PASSWORD,
  PDF_NO_SELECTABLE_TEXT,
} from './pdfImport.ts'

describe('pdfImport', () => {
  it('throws the exact no-selectable-text message when pages have no text', async () => {
    const doc = {
      numPages: 2,
      getPage: async () => ({
        getTextContent: async () => ({ items: [{ str: '   ' }] }),
      }),
    }
    await expect(extractPlainTextFromPdfDocument(doc)).rejects.toThrow(PDF_NO_SELECTABLE_TEXT)
  })

  it('throws the exact no-selectable-text message when there are zero pages', async () => {
    const doc = { numPages: 0, getPage: async () => ({ getTextContent: async () => ({ items: [] }) }) }
    await expect(extractPlainTextFromPdfDocument(doc)).rejects.toThrow(PDF_NO_SELECTABLE_TEXT)
  })

  it('returns joined text when pages contain strings', async () => {
    const doc = {
      numPages: 1,
      getPage: async () => ({
        getTextContent: async () => ({ items: [{ str: 'Hello' }, { str: 'world' }] }),
      }),
    }
    await expect(extractPlainTextFromPdfDocument(doc)).resolves.toBe('Hello world')
  })

  it('maps password errors to the corrupt or password message', () => {
    expect(mapPdfLoadError(new Error('Password required')).message).toBe(PDF_CORRUPT_OR_PASSWORD)
  })

  it('maps invalid pdf errors to the corrupt or password message', () => {
    expect(mapPdfLoadError(new Error('Invalid PDF structure')).message).toBe(PDF_CORRUPT_OR_PASSWORD)
  })
})

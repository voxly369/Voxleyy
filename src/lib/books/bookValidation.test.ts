import { describe, expect, it } from 'vitest'
import { publishDisabledReason, validateBookMetadata, validateBookForPublish } from './bookValidation.ts'

describe('validateBookMetadata', () => {
  it('requires paid books to have price', () => {
    const result = validateBookMetadata({
      title: 'Book',
      subtitle: null,
      description: '',
      saleModel: 'purchase',
      priceCents: 0,
      currency: 'GBP',
      rentalDays: null,
      isbnInternal: null,
    })
    expect(result.ok).toBe(false)
  })

  it('accepts valid free metadata', () => {
    const result = validateBookMetadata({
      title: 'Book',
      subtitle: null,
      description: 'About',
      saleModel: 'free',
      priceCents: 0,
      currency: 'GBP',
      rentalDays: null,
      isbnInternal: null,
    })
    expect(result.ok).toBe(true)
  })
})

describe('validateBookForPublish', () => {
  it('blocks publish without cover or chapters', () => {
    const issues = validateBookForPublish({
      metadata: {
        title: 'Book',
        subtitle: null,
        description: '',
        saleModel: 'free',
        priceCents: 0,
        currency: 'GBP',
        rentalDays: null,
        isbnInternal: null,
      },
      hasCover: false,
      chapters: [],
    })
    expect(issues.length).toBeGreaterThan(0)
  })

  it('publishDisabledReason mentions payments for paid books', () => {
    const reason = publishDisabledReason(
      {
        metadata: {
          title: 'Book',
          subtitle: null,
          description: '',
          saleModel: 'purchase',
          priceCents: 500,
          currency: 'GBP',
          rentalDays: null,
          isbnInternal: null,
        },
        hasCover: true,
        chapters: [
          {
            id: '1',
            bookId: 'b',
            position: 1,
            title: 'Ch',
            status: 'published',
            isSample: false,
            publishedAt: null,
            comingSoon: false,
          },
        ],
      },
      false,
    )
    expect(reason).toMatch(/payments/i)
  })
})

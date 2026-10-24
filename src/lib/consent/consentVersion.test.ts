import { describe, expect, it } from 'vitest'
import { documentsNeedingReaccept, latestConsentVersion, parseStoredConsents } from './consentVersion.ts'
import { LEGAL_DOCUMENT_VERSIONS } from '../../config/organization.ts'

describe('consentVersion', () => {
  it('finds latest version per document', () => {
    const records = [
      { document: 'terms', version: 'old', accepted_at: '2026-01-01T00:00:00Z' },
      { document: 'terms', version: 'new', accepted_at: '2026-02-01T00:00:00Z' },
    ]
    expect(latestConsentVersion(records, 'terms')).toBe('new')
  })

  it('flags outdated required documents', () => {
    const records = [{ document: 'terms', version: LEGAL_DOCUMENT_VERSIONS.terms, accepted_at: '2026-01-01' }]
    expect(documentsNeedingReaccept(records)).toEqual(['privacy'])
  })

  it('parses RPC rows', () => {
    expect(
      parseStoredConsents([
        { document: 'privacy', version: 'v1', accepted_at: '2026-01-01' },
        { bad: true },
      ]),
    ).toEqual([{ document: 'privacy', version: 'v1', accepted_at: '2026-01-01' }])
  })
})

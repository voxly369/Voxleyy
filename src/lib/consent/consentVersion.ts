import { LEGAL_DOCUMENT_VERSIONS, type LegalDocumentKey } from '../../config/organization.ts'

export type StoredConsent = {
  document: string
  version: string
  accepted_at?: string
}

/** Documents users must re-accept when version bumps. */
export const REQUIRED_CONSENT_DOCUMENTS: LegalDocumentKey[] = ['terms', 'privacy']

export function latestConsentVersion(records: StoredConsent[], document: string): string | null {
  let best: StoredConsent | null = null
  for (const row of records) {
    if (row.document !== document) continue
    if (!best) {
      best = row
      continue
    }
    const rowAt = row.accepted_at ?? ''
    const bestAt = best.accepted_at ?? ''
    if (rowAt >= bestAt) best = row
  }
  return best?.version ?? null
}

export function documentsNeedingReaccept(
  records: StoredConsent[],
  requiredVersions: Record<LegalDocumentKey, string> = LEGAL_DOCUMENT_VERSIONS,
): LegalDocumentKey[] {
  const outdated: LegalDocumentKey[] = []
  for (const document of REQUIRED_CONSENT_DOCUMENTS) {
    const expected = requiredVersions[document]
    const accepted = latestConsentVersion(records, document)
    if (!accepted || accepted !== expected) outdated.push(document)
  }
  return outdated
}

export function parseStoredConsents(data: unknown): StoredConsent[] {
  if (!Array.isArray(data)) return []
  const rows: StoredConsent[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const document = typeof row.document === 'string' ? row.document : null
    const version = typeof row.version === 'string' ? row.version : null
    if (!document || !version) continue
    rows.push({
      document,
      version,
      accepted_at: typeof row.accepted_at === 'string' ? row.accepted_at : undefined,
    })
  }
  return rows
}

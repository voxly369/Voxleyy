/** Placeholders until legal review — replace before public launch. */
export const organization = {
  companyName: '[Company name]',
  contactEmail: '[contact@example.com]',
  informationOfficerName: '[Information officer name]',
  informationOfficerEmail: '[dpo@example.com]',
  postalAddress: '[Postal address]',
  governingLawPlaceholder: '[Governing law jurisdiction]',
  minimumAgePlaceholder: '[Minimum age, e.g. 13]',
} as const

/** Bump when published legal text changes; stored with user consent records. */
export const LEGAL_DOCUMENT_VERSIONS = {
  terms: 'draft-2026-01',
  privacy: 'draft-2026-01',
  community: 'draft-2026-01',
  copyright: 'draft-2026-01',
  age_18: 'confirmed',
} as const

export type LegalDocumentKey = keyof typeof LEGAL_DOCUMENT_VERSIONS

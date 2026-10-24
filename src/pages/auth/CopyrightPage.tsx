import { organization, LEGAL_DOCUMENT_VERSIONS } from '../../config/organization.ts'
import { LegalPageFrame } from '../../components/legal/LegalPageFrame.tsx'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

export default function CopyrightPage() {
  useDocumentTitle('Copyright')

  return (
    <LegalPageFrame title="Copyright policy" backTo="/settings" backLabel="Back to settings">
      <p className="text-sm text-muted">Version {LEGAL_DOCUMENT_VERSIONS.copyright}</p>
      <p>
        {organization.companyName} respects intellectual property. If you believe content on Voxly infringes your
        copyright, send a notice with the details below.
      </p>
      <section>
        <h2 className="font-serif text-xl text-ink">Notice requirements</h2>
        <ul className="mt-2 list-disc pl-5">
          <li>Identification of the copyrighted work and the material you claim is infringing.</li>
          <li>Your contact information and a statement of good faith.</li>
          <li>A statement, under penalty of perjury, that the information is accurate and you are authorised to act.</li>
        </ul>
      </section>
      <section>
        <h2 className="font-serif text-xl text-ink">Send notices to</h2>
        <p className="mt-2">
          {organization.contactEmail}
          <br />
          {organization.postalAddress}
        </p>
      </section>
    </LegalPageFrame>
  )
}

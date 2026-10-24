import { organization } from '../../config/organization.ts'
import { LegalPageFrame } from '../../components/legal/LegalPageFrame.tsx'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

export default function ContactPage() {
  useDocumentTitle('Contact')

  return (
    <LegalPageFrame title="Contact" backTo="/settings" backLabel="Back to settings">
      <p>Reach {organization.companyName} using the details below. Support hours and SLAs will be published before launch.</p>
      <dl className="mt-2 flex flex-col gap-3 text-sm">
        <div>
          <dt className="font-semibold text-muted">General</dt>
          <dd className="text-ink">{organization.contactEmail}</dd>
        </div>
        <div>
          <dt className="font-semibold text-muted">Privacy</dt>
          <dd className="text-ink">{organization.informationOfficerEmail}</dd>
        </div>
        <div>
          <dt className="font-semibold text-muted">Postal</dt>
          <dd className="text-ink">{organization.postalAddress}</dd>
        </div>
      </dl>
    </LegalPageFrame>
  )
}

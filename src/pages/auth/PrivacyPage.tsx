import { organization, LEGAL_DOCUMENT_VERSIONS } from '../../config/organization.ts'
import { LegalPageFrame } from '../../components/legal/LegalPageFrame.tsx'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

export default function PrivacyPage() {
  useDocumentTitle('Privacy')

  return (
    <LegalPageFrame title="Privacy Policy">
      <p className="text-sm text-muted">Version {LEGAL_DOCUMENT_VERSIONS.privacy}</p>
      <p>
        {organization.companyName} (&quot;we&quot;) explains here how Voxly collects and uses personal data. This draft
        will be replaced after legal review.
      </p>
      <section>
        <h2 className="font-serif text-xl text-ink">Data we process</h2>
        <ul className="mt-2 list-disc pl-5">
          <li>Account data such as email, username, and profile details you choose to share.</li>
          <li>Content you create, save, or publish on Voxly.</li>
          <li>Usage and security logs needed to keep the service reliable and safe.</li>
        </ul>
      </section>
      <section>
        <h2 className="font-serif text-xl text-ink">Why we use it</h2>
        <p className="mt-2">
          We process data to provide the service, secure accounts, comply with law, and improve Voxly. We do not sell
          personal data.
        </p>
      </section>
      <section>
        <h2 className="font-serif text-xl text-ink">Your rights</h2>
        <p className="mt-2">
          Depending on where you live, you may have rights to access, export, correct, or delete your data. Use Settings
          to download or delete your account, or contact {organization.informationOfficerEmail}.
        </p>
      </section>
      <section>
        <h2 className="font-serif text-xl text-ink">Data protection contact</h2>
        <p className="mt-2">
          {organization.informationOfficerName}, {organization.informationOfficerEmail},{' '}
          {organization.postalAddress}.
        </p>
      </section>
    </LegalPageFrame>
  )
}

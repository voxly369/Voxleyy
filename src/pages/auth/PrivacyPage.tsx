import { organization, LEGAL_DOCUMENT_VERSIONS } from '../../config/organization.ts'
import { CLIENT_STORAGE_INVENTORY } from '../../lib/privacy/clientStorageAudit.ts'
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
          <li>One activity day per UTC day when you use the app, to measure active use and retention.</li>
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
        <h2 className="font-serif text-xl text-ink">Browser storage</h2>
        <p className="mt-2">
          The web app stores the items below on your device. Supabase Auth session cookies are essential for sign-in.
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {CLIENT_STORAGE_INVENTORY.map((row) => (
            <li key={`${row.store}-${row.key}`}>
              <span className="font-medium">{row.store}</span> — {row.key}: {row.purpose}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-serif text-xl text-ink">Account deletion and files</h2>
        <p className="mt-2">
          When you delete your account, profile and content data are removed from our database promptly. Uploaded files
          may remain in storage until our cleanup queue is processed; we do not promise instant removal of every blob
          during the private beta.
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

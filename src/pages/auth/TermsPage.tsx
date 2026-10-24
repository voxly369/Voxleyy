import { organization, LEGAL_DOCUMENT_VERSIONS } from '../../config/organization.ts'
import { LegalPageFrame } from '../../components/legal/LegalPageFrame.tsx'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

export default function TermsPage() {
  useDocumentTitle('Terms')

  return (
    <LegalPageFrame title="Terms of Service">
      <p className="text-sm text-muted">Version {LEGAL_DOCUMENT_VERSIONS.terms}</p>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of {organization.companyName}&apos;s writing and reading
        platform (&quot;Voxly&quot;). By creating an account you agree to these Terms.
      </p>
      <section>
        <h2 className="font-serif text-xl text-ink">Eligibility</h2>
        <p className="mt-2">
          You must be at least {organization.minimumAgePlaceholder} years old, or the age required in your country, to use
          Voxly. You are responsible for the accuracy of registration information you provide.
        </p>
      </section>
      <section>
        <h2 className="font-serif text-xl text-ink">Your content</h2>
        <p className="mt-2">
          You retain ownership of work you publish. You grant {organization.companyName} a limited licence to host,
          display, and distribute your content solely to operate the service. You must have the rights to anything you
          upload.
        </p>
      </section>
      <section>
        <h2 className="font-serif text-xl text-ink">Acceptable use</h2>
        <p className="mt-2">
          Follow our Community Guidelines. We may remove content or suspend accounts that violate those rules or these
          Terms.
        </p>
      </section>
      <section>
        <h2 className="font-serif text-xl text-ink">Governing law</h2>
        <p className="mt-2">
          These Terms are governed by the laws of {organization.governingLawPlaceholder}, without regard to conflict-of-law
          rules.
        </p>
      </section>
      <section>
        <h2 className="font-serif text-xl text-ink">Contact</h2>
        <p className="mt-2">
          Questions about these Terms: {organization.contactEmail}, {organization.postalAddress}.
        </p>
      </section>
    </LegalPageFrame>
  )
}

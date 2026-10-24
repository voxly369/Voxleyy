import { organization, LEGAL_DOCUMENT_VERSIONS } from '../../config/organization.ts'
import { LegalPageFrame } from '../../components/legal/LegalPageFrame.tsx'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

export default function CommunityGuidelinesPage() {
  useDocumentTitle('Community guidelines')

  return (
    <LegalPageFrame title="Community Guidelines" backTo="/settings" backLabel="Back to settings">
      <p className="text-sm text-muted">Version {LEGAL_DOCUMENT_VERSIONS.community}</p>
      <p>Voxly is for writers and readers who treat each other with respect. These guidelines apply to all public activity.</p>
      <section>
        <h2 className="font-serif text-xl text-ink">Be kind and honest</h2>
        <p className="mt-2">Harassment, hate, threats, and targeted abuse are not allowed. Credit others when you reference their work.</p>
      </section>
      <section>
        <h2 className="font-serif text-xl text-ink">Keep it lawful</h2>
        <p className="mt-2">Do not post content that infringes copyright, promotes illegal activity, or exploits minors.</p>
      </section>
      <section>
        <h2 className="font-serif text-xl text-ink">Enforcement</h2>
        <p className="mt-2">
          {organization.companyName} may remove content, limit reach, or suspend accounts that break these guidelines or
          our Terms. Appeals may be available in Settings where offered.
        </p>
      </section>
    </LegalPageFrame>
  )
}

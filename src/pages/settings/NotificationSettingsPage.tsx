import { Link } from 'react-router-dom'
import { NotificationSettingsForm } from '../../components/notifications/NotificationSettingsForm.tsx'
import { PageContainer } from '../../components/shell/PageContainer.tsx'
import { PageHeader } from '../../components/shell/PageHeader.tsx'
import { focusRing } from '../../components/shell/navItems.ts'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

export default function NotificationSettingsPage() {
  useDocumentTitle('Notification settings')

  return (
    <PageContainer variant="wide" className="flex flex-col gap-6 py-8">
      <PageHeader title="Notification settings" />
      <Link to="/settings" className={`self-start text-sm font-semibold text-coral ${focusRing}`}>
        Back to settings
      </Link>
      <NotificationSettingsForm />
    </PageContainer>
  )
}

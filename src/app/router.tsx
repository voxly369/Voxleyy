import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/shell/AppShell.tsx'
import { RouteErrorBoundary } from '../components/shell/RouteErrorBoundary.tsx'
import { PageSkeleton } from '../components/states/Skeleton.tsx'

const HomePage = lazy(() => import('../pages/HomePage.tsx'))
const DiscoverPage = lazy(() => import('../pages/DiscoverPage.tsx'))
const CreatePage = lazy(() => import('../pages/CreatePage.tsx'))
const MessagesPage = lazy(() => import('../pages/MessagesPage.tsx'))
const SettingsPage = lazy(() => import('../pages/SettingsPage.tsx'))
const ProfilePage = lazy(() => import('../pages/ProfilePage.tsx'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.tsx'))

export function AppRouter() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppShell>
        <RouteErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/create" element={<CreatePage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </AppShell>
    </BrowserRouter>
  )
}

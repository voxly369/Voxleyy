import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { AuthLayout } from '../components/auth/AuthLayout.tsx'
import { AppShell } from '../components/shell/AppShell.tsx'
import { RouteErrorBoundary } from '../components/shell/RouteErrorBoundary.tsx'
import { PageSkeleton } from '../components/states/Skeleton.tsx'
import { ModalStackProvider } from '../lib/shell/modalStack.tsx'
import { ToastProvider } from '../components/shell/ToastProvider.tsx'
import { AuthProvider } from '../lib/auth/AuthProvider.tsx'
import { RequireAuth, RequireFounder, RequireGuest } from './guards.tsx'

const HomePage = lazy(() => import('../pages/HomePage.tsx'))
const DiscoverPage = lazy(() => import('../pages/DiscoverPage.tsx'))
const DiscoverSearchPage = lazy(() => import('../pages/DiscoverSearchPage.tsx'))
const DiscoverBrowsePage = lazy(() => import('../pages/DiscoverBrowsePage.tsx'))
const TagPage = lazy(() => import('../pages/TagPage.tsx'))
const CreatePage = lazy(() => import('../pages/CreatePage.tsx'))
const CreationEditorPage = lazy(() => import('../pages/CreationEditorPage.tsx'))
const DraftsListPage = lazy(() => import('../pages/DraftsListPage.tsx'))
const CreationPage = lazy(() => import('../pages/CreationPage.tsx'))
const MessagesPage = lazy(() => import('../pages/MessagesPage.tsx'))
const SettingsPage = lazy(() => import('../pages/SettingsPage.tsx'))
const EditProfilePage = lazy(() => import('../pages/EditProfilePage.tsx'))
const OwnProfileRedirect = lazy(() => import('../pages/OwnProfileRedirect.tsx'))
const ProfilePage = lazy(() => import('../pages/ProfilePage.tsx'))
const ProfileBadgesPage = lazy(() => import('../pages/ProfileBadgesPage.tsx'))
const FollowListPage = lazy(() => import('../pages/FollowListPage.tsx'))
const LibraryPage = lazy(() => import('../pages/LibraryPage.tsx'))
const SavedPage = lazy(() => import('../pages/SavedPage.tsx'))
const ReaderPage = lazy(() => import('../pages/ReaderPage.tsx'))
const BookChapterReaderPage = lazy(() => import('../pages/BookChapterReaderPage.tsx'))
const BookNewPage = lazy(() => import('../pages/BookNewPage.tsx'))
const BookBuilderPage = lazy(() => import('../pages/BookBuilderPage.tsx'))
const BookChapterEditPage = lazy(() => import('../pages/BookChapterEditPage.tsx'))
const BookPage = lazy(() => import('../pages/BookPage.tsx'))
const CoverStudioPage = lazy(() => import('../pages/CoverStudioPage.tsx'))
const BookPreviewPage = lazy(() => import('../pages/BookPreviewPage.tsx'))
const FounderPage = lazy(() => import('../pages/FounderPage.tsx'))
const MyReportsPage = lazy(() => import('../pages/settings/MyReportsPage.tsx'))
const AppealsPage = lazy(() => import('../pages/settings/AppealsPage.tsx'))
const NotificationSettingsPage = lazy(() => import('../pages/settings/NotificationSettingsPage.tsx'))
const NotificationsPage = lazy(() => import('../pages/NotificationsPage.tsx'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.tsx'))
const LoginPage = lazy(() => import('../pages/auth/LoginPage.tsx'))
const SignUpPage = lazy(() => import('../pages/auth/SignUpPage.tsx'))
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage.tsx'))
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage.tsx'))
const CheckEmailPage = lazy(() => import('../pages/auth/CheckEmailPage.tsx'))
const AuthCallbackPage = lazy(() => import('../pages/auth/AuthCallbackPage.tsx'))
const TermsPage = lazy(() => import('../pages/auth/TermsPage.tsx'))
const PrivacyPage = lazy(() => import('../pages/auth/PrivacyPage.tsx'))
const CommunityGuidelinesPage = lazy(() => import('../pages/auth/CommunityGuidelinesPage.tsx'))
const CopyrightPage = lazy(() => import('../pages/auth/CopyrightPage.tsx'))
const ContactPage = lazy(() => import('../pages/auth/ContactPage.tsx'))
const LicencesPage = lazy(() => import('../pages/LicencesPage.tsx'))

function RootLayout() {
  return (
    <AuthProvider>
      <RouteErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </RouteErrorBoundary>
    </AuthProvider>
  )
}

const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      children: [
        {
          element: <AuthLayout />,
          children: [
            {
              element: <RequireGuest />,
              children: [
                { path: '/login', element: <LoginPage /> },
                { path: '/signup', element: <SignUpPage /> },
                { path: '/forgot-password', element: <ForgotPasswordPage /> },
                { path: '/check-email', element: <CheckEmailPage /> },
              ],
            },
            { path: '/reset-password', element: <ResetPasswordPage /> },
            { path: '/auth/callback', element: <AuthCallbackPage /> },
            { path: '/terms', element: <TermsPage /> },
            { path: '/privacy', element: <PrivacyPage /> },
            { path: '/community-guidelines', element: <CommunityGuidelinesPage /> },
            { path: '/copyright', element: <CopyrightPage /> },
            { path: '/contact', element: <ContactPage /> },
            { path: '/licences', element: <LicencesPage /> },
          ],
        },
        {
          element: <RequireAuth />,
          children: [
            {
              element: (
                <ModalStackProvider>
                  <ToastProvider>
                    <Outlet />
                  </ToastProvider>
                </ModalStackProvider>
              ),
              children: [
                { path: '/read/:id', element: <ReaderPage /> },
                { path: '/read/book/:bookId/:chapterId', element: <BookChapterReaderPage /> },
              ],
            },
            {
              element: <AppShell />,
              children: [
                { path: '/', element: <HomePage /> },
                { path: '/discover', element: <DiscoverPage /> },
                { path: '/discover/search', element: <DiscoverSearchPage /> },
                { path: '/discover/browse', element: <DiscoverBrowsePage /> },
                { path: '/tags/:tag', element: <TagPage /> },
                { path: '/books/new', element: <BookNewPage /> },
                { path: '/books/:id/builder/chapter/:chapterId', element: <BookChapterEditPage /> },
                { path: '/books/:id/builder', element: <BookBuilderPage /> },
                { path: '/books/:id/preview/chapter/:chapterId', element: <BookPreviewPage /> },
                { path: '/books/:id/preview', element: <BookPreviewPage /> },
                { path: '/books/:id/cover', element: <CoverStudioPage /> },
                { path: '/books/:id', element: <BookPage /> },
                { path: '/create', element: <CreatePage /> },
                { path: '/create/new/:type', element: <CreationEditorPage /> },
                { path: '/create/:id', element: <CreationEditorPage /> },
                { path: '/write/drafts', element: <DraftsListPage /> },
                { path: '/c/:id', element: <CreationPage /> },
                { path: '/messages', element: <MessagesPage /> },
                { path: '/messages/:conversationId', element: <MessagesPage /> },
                { path: '/settings', element: <SettingsPage /> },
                { path: '/settings/reports', element: <MyReportsPage /> },
                { path: '/settings/appeals', element: <AppealsPage /> },
                { path: '/settings/notifications', element: <NotificationSettingsPage /> },
                { path: '/notifications', element: <NotificationsPage /> },
                { path: '/settings/profile', element: <EditProfilePage /> },
                { path: '/library', element: <LibraryPage /> },
                { path: '/library/saved', element: <SavedPage /> },
                { path: '/profile', element: <OwnProfileRedirect /> },
                { path: '/u/:username', element: <ProfilePage /> },
                { path: '/u/:username/badges', element: <ProfileBadgesPage /> },
                { path: '/u/:username/followers', element: <FollowListPage /> },
                { path: '/u/:username/following', element: <FollowListPage /> },
                {
                  element: <RequireFounder />,
                  children: [{ path: '/founder', element: <FounderPage /> }],
                },
                { path: '*', element: <NotFoundPage /> },
              ],
            },
          ],
        },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
)

export function AppRouter() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />
}

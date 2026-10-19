import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { AuthLayout } from '../components/auth/AuthLayout.tsx'
import { AppShell } from '../components/shell/AppShell.tsx'
import { RouteErrorBoundary } from '../components/shell/RouteErrorBoundary.tsx'
import { PageSkeleton } from '../components/states/Skeleton.tsx'
import { AuthProvider } from '../lib/auth/AuthProvider.tsx'
import { RequireAuth, RequireFounder, RequireGuest } from './guards.tsx'

const HomePage = lazy(() => import('../pages/HomePage.tsx'))
const DiscoverPage = lazy(() => import('../pages/DiscoverPage.tsx'))
const CreatePage = lazy(() => import('../pages/CreatePage.tsx'))
const CreationEditorPage = lazy(() => import('../pages/CreationEditorPage.tsx'))
const CreationPage = lazy(() => import('../pages/CreationPage.tsx'))
const MessagesPage = lazy(() => import('../pages/MessagesPage.tsx'))
const SettingsPage = lazy(() => import('../pages/SettingsPage.tsx'))
const EditProfilePage = lazy(() => import('../pages/EditProfilePage.tsx'))
const OwnProfileRedirect = lazy(() => import('../pages/OwnProfileRedirect.tsx'))
const ProfilePage = lazy(() => import('../pages/ProfilePage.tsx'))
const FollowListPage = lazy(() => import('../pages/FollowListPage.tsx'))
const FounderPage = lazy(() => import('../pages/FounderPage.tsx'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.tsx'))
const LoginPage = lazy(() => import('../pages/auth/LoginPage.tsx'))
const SignUpPage = lazy(() => import('../pages/auth/SignUpPage.tsx'))
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage.tsx'))
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage.tsx'))
const CheckEmailPage = lazy(() => import('../pages/auth/CheckEmailPage.tsx'))
const AuthCallbackPage = lazy(() => import('../pages/auth/AuthCallbackPage.tsx'))
const TermsPage = lazy(() => import('../pages/auth/TermsPage.tsx'))
const PrivacyPage = lazy(() => import('../pages/auth/PrivacyPage.tsx'))

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
          ],
        },
        {
          element: <RequireAuth />,
          children: [
            {
              element: <AppShell />,
              children: [
                { path: '/', element: <HomePage /> },
                { path: '/discover', element: <DiscoverPage /> },
                { path: '/create', element: <CreatePage /> },
                { path: '/create/new/:type', element: <CreationEditorPage /> },
                { path: '/create/:id', element: <CreationEditorPage /> },
                { path: '/c/:id', element: <CreationPage /> },
                { path: '/messages', element: <MessagesPage /> },
                { path: '/settings', element: <SettingsPage /> },
                { path: '/settings/profile', element: <EditProfilePage /> },
                { path: '/profile', element: <OwnProfileRedirect /> },
                { path: '/u/:username', element: <ProfilePage /> },
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

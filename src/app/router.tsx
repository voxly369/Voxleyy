import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthLayout } from '../components/auth/AuthLayout.tsx'
import { AppShell } from '../components/shell/AppShell.tsx'
import { RouteErrorBoundary } from '../components/shell/RouteErrorBoundary.tsx'
import { PageSkeleton } from '../components/states/Skeleton.tsx'
import { AuthProvider } from '../lib/auth/AuthProvider.tsx'
import { RequireAuth, RequireFounder, RequireGuest } from './guards.tsx'

const HomePage = lazy(() => import('../pages/HomePage.tsx'))
const DiscoverPage = lazy(() => import('../pages/DiscoverPage.tsx'))
const CreatePage = lazy(() => import('../pages/CreatePage.tsx'))
const MessagesPage = lazy(() => import('../pages/MessagesPage.tsx'))
const SettingsPage = lazy(() => import('../pages/SettingsPage.tsx'))
const ProfilePage = lazy(() => import('../pages/ProfilePage.tsx'))
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

export function AppRouter() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <RouteErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route element={<AuthLayout />}>
                <Route element={<RequireGuest />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignUpPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/check-email" element={<CheckEmailPage />} />
                </Route>
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
              </Route>

              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/discover" element={<DiscoverPage />} />
                  <Route path="/create" element={<CreatePage />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route element={<RequireFounder />}>
                    <Route path="/founder" element={<FounderPage />} />
                  </Route>
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  )
}

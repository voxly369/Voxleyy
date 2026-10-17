import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <p className="font-serif text-4xl text-ink">Voxly</p>
        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </main>
  )
}

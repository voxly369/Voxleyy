export default function ConfigurationErrorPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6 py-12">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-3xl text-ink">Voxly is not configured</h1>
        <p className="mt-4 text-base text-muted">
          This deployment is missing the public Supabase URL or anon key. Set{' '}
          <code className="rounded bg-raised px-1 py-0.5 text-sm">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-raised px-1 py-0.5 text-sm">VITE_SUPABASE_ANON_KEY</code> in the
          hosting environment, then rebuild.
        </p>
        <p className="mt-3 text-sm text-muted">Values are never shown here for security.</p>
      </div>
    </main>
  )
}

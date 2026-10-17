import { useState } from 'react'
import { getTheme, toggleTheme } from './lib/theme.ts'
import type { ThemeMode } from './lib/theme.ts'

const coralScale = [
  { step: '50', hex: '#FFF1EE', swatch: 'bg-coral-50' },
  { step: '100', hex: '#FFE0DA', swatch: 'bg-coral-100' },
  { step: '200', hex: '#FFC2B7', swatch: 'bg-coral-200' },
  { step: '300', hex: '#FF9C8A', swatch: 'bg-coral-300' },
  { step: '400', hex: '#FF7A61', swatch: 'bg-coral-400' },
  { step: '500', hex: '#FF5A3C', swatch: 'bg-coral' },
  { step: '600', hex: '#E8442A', swatch: 'bg-coral-600' },
  { step: '700', hex: '#C23520', swatch: 'bg-coral-700' },
  { step: '800', hex: '#9B2C1C', swatch: 'bg-coral-800' },
  { step: '900', hex: '#7A261A', swatch: 'bg-coral-900' },
]

export default function App() {
  const [theme, setThemeState] = useState<ThemeMode>(getTheme)

  return (
    <main className="min-h-screen bg-bg px-5 pt-safe pb-nav text-ink">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 py-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-coral">Voxly</p>
            <h1 className="mt-2 text-4xl text-ink">Token preview</h1>
            <p className="mt-2 text-muted">Temporary page. Removed in the next step.</p>
          </div>
          <button
            type="button"
            className="rounded-2xl border border-line bg-raised px-5 py-3 text-base font-semibold text-ink"
            onClick={() => setThemeState(toggleTheme())}
          >
            {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          </button>
        </header>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-2xl">Coral</h2>
          <p className="mt-2 font-sans text-base text-muted">Signature #FF5A3C. Primary text is white, 16px, semibold.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {coralScale.map((swatch) => (
              <div key={swatch.step} className="overflow-hidden rounded-2xl border border-line">
                <div className={`h-14 ${swatch.swatch}`} />
                <p className="bg-raised px-2 py-2 font-sans text-sm text-ink">
                  {swatch.step}
                  <span className="mt-1 block text-muted">{swatch.hex}</span>
                </p>
              </div>
            ))}
          </div>
          <button type="button" className="mt-5 rounded-2xl bg-coral px-5 py-3 text-base font-semibold text-white">
            Primary button
          </button>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-2xl">Verified and surfaces</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="rounded-2xl bg-verified px-4 py-3 font-sans text-base font-semibold text-white">#8B5CF6</div>
            <div className="rounded-2xl border border-line bg-bg px-4 py-3 font-sans text-sm">bg</div>
            <div className="rounded-2xl border border-line bg-surface px-4 py-3 font-sans text-sm">surface</div>
            <div className="rounded-2xl border border-line bg-raised px-4 py-3 font-sans text-sm">raised</div>
            <div className="rounded-2xl border border-line bg-surface px-4 py-3 font-sans text-sm text-ink">ink</div>
            <div className="rounded-2xl border border-line bg-surface px-4 py-3 font-sans text-sm text-muted">muted</div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-2xl">Type</h2>
          <p className="reading mt-4 text-2xl text-ink">The line you write is the line a reader keeps.</p>
          <p className="mt-3 font-sans text-base text-muted">Interface text uses Inter. Reading text uses Fraunces.</p>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-2xl">Skeleton</h2>
          <div className="skeleton mt-4 h-16 w-full" />
        </section>
      </div>
    </main>
  )
}

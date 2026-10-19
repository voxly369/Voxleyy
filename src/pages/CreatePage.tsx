import { Link } from 'react-router-dom'
import { CreationTypeIcon } from '../components/creations/CreationTypeIcon.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { CREATION_TYPE_CARDS } from '../lib/creations/creationTypes.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function CreatePage() {
  useDocumentTitle('Create')

  const phase1 = CREATION_TYPE_CARDS.filter((card) => card.phase1)
  const later = CREATION_TYPE_CARDS.filter((card) => !card.phase1)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 pb-28">
      <PageHeader title="What will you share?" />
      <p className="text-base text-muted">Choose a format. You can save a draft and finish it later.</p>
      <ul className="flex flex-col gap-3">
        {phase1.map((card) => (
          <li key={card.type}>
            <Link
              to={`/create/new/${card.type}`}
              className={`flex min-h-11 items-start gap-4 rounded-2xl border border-line bg-surface p-4 ${focusRing}`}
            >
              <CreationTypeIcon type={card.type} />
              <span className="flex flex-col gap-1 text-left">
                <span className="font-serif text-lg text-ink">{card.name}</span>
                <span className="text-sm text-muted">{card.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {later.length > 0 ? (
        <section aria-labelledby="create-coming-soon">
          <h2 id="create-coming-soon" className="text-xs font-semibold uppercase tracking-wide text-muted">
            Coming soon
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {later.map((card) => (
              <li key={card.type}>
                <div
                  aria-disabled="true"
                  title="This format is not available yet."
                  className="flex min-h-11 cursor-not-allowed items-start gap-4 rounded-2xl border border-line bg-bg p-4 opacity-70"
                >
                  <CreationTypeIcon type={card.type} className="size-8 shrink-0 text-muted" />
                  <span className="flex flex-col gap-1">
                    <span className="font-serif text-lg text-muted">{card.name}</span>
                    <span className="text-sm text-muted">{card.description}</span>
                    <span className="text-xs text-muted">Coming soon</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

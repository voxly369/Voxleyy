import { Link } from 'react-router-dom'
import { discoverFiltersToSearchParams } from '../../lib/discover/filterParams.ts'
import { focusRing } from '../shell/navItems.ts'

type Chip = { slug: string; label: string; kind: 'mood' | 'genre' }

type HorizontalChipRowProps = {
  title: string
  chips: Chip[]
}

export function HorizontalChipRow({ title, chips }: HorizontalChipRowProps) {
  return (
    <section className="flex flex-col gap-2" aria-labelledby={`${title.replace(/\s+/g, '-')}-heading`}>
      <h3 id={`${title.replace(/\s+/g, '-')}-heading`} className="text-sm font-semibold text-ink">
        {title}
      </h3>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0">
        {chips.map((chip) => {
          const params = discoverFiltersToSearchParams(
            chip.kind === 'mood' ? { mood: chip.slug as never, sort: 'trending' } : { genre: chip.slug as never, sort: 'trending' },
          )
          return (
            <Link
              key={chip.slug}
              to={`/discover/browse?${params.toString()}`}
              className={`shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink ${focusRing}`}
            >
              {chip.label}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

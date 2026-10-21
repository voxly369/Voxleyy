import { Link } from 'react-router-dom'
import { discoverFiltersToSearchParams } from '../../lib/discover/filterParams.ts'
import { focusRing } from '../shell/navItems.ts'

type DiscoverChip = { slug: string; label: string; kind: 'mood' | 'genre' }
type FilterChip = { id: string; label: string; selected?: boolean; onSelect?: () => void }

type HorizontalChipRowProps =
  | { title: string; chips: DiscoverChip[]; variant?: 'discover' }
  | { title: string; chips: FilterChip[]; variant: 'filter' }

export function HorizontalChipRow(props: HorizontalChipRowProps) {
  const { title, chips } = props
  const variant = props.variant ?? 'discover'
  return (
    <section className="flex flex-col gap-2" aria-labelledby={`${title.replace(/\s+/g, '-')}-heading`}>
      <h3 id={`${title.replace(/\s+/g, '-')}-heading`} className="text-sm font-semibold text-ink">
        {title}
      </h3>
      <div className="scrollbar-hide -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0" role={variant === 'filter' ? 'tablist' : undefined}>
        {variant === 'filter'
          ? (chips as FilterChip[]).map((chip) => (
              <button
                key={chip.id}
                type="button"
                role="tab"
                aria-selected={chip.selected === true}
                onClick={chip.onSelect}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium ${
                  chip.selected ? 'bg-coral font-semibold text-[#1a100a]' : 'border border-line bg-surface text-ink'
                } ${focusRing}`}
              >
                {chip.label}
              </button>
            ))
          : (chips as DiscoverChip[]).map((chip) => {
              const params = discoverFiltersToSearchParams(
                chip.kind === 'mood'
                  ? { mood: chip.slug as never, sort: 'trending' }
                  : { genre: chip.slug as never, sort: 'trending' },
              )
              return (
                <Link
                  key={chip.slug}
                  to={`/discover/browse?${params.toString()}`}
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink ${focusRing}`}
                >
                  {chip.label}
                </Link>
              )
            })}
      </div>
    </section>
  )
}

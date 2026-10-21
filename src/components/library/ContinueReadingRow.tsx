import { LibraryItemCard } from './LibraryItemCard.tsx'
import type { LibraryItem } from '../../lib/library/types.ts'

type ContinueReadingRowProps = {
  items: LibraryItem[]
}

export function ContinueReadingRow({ items }: ContinueReadingRowProps) {
  return (
    <div className="flex flex-col gap-3" data-testid="continue-reading-row">
      {items.map((item) => (
        <LibraryItemCard
          key={`${item.creationId}-${item.resumeChapterId ?? 'post'}`}
          item={item}
          progressLabel={`${item.percent ?? 0}% read`}
        />
      ))}
    </div>
  )
}

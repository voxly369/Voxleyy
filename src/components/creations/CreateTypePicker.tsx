import { useNavigate } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { CreationTypeIcon } from './CreationTypeIcon.tsx'
import { isVisibleInCreatePicker } from '../../config/productFlags.ts'
import {
  CREATION_TYPE_GROUPS,
  creationTypesInGroup,
  type CreationType,
} from '../../lib/creations/creationTypes.ts'

type CreateTypePickerProps = {
  onPick?: (type: CreationType) => void
  showIntro?: boolean
}

export function CreateTypePicker({ onPick, showIntro = true }: CreateTypePickerProps) {
  const navigate = useNavigate()

  function openType(type: CreationType) {
    if (onPick) {
      onPick(type)
      return
    }
    if (type === 'book') {
      navigate('/books/new')
      return
    }
    navigate(`/create/new/${type}`)
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      {showIntro ? (
        <p className="text-base text-muted">Choose a format. You can save a draft and finish it later.</p>
      ) : null}
      {CREATION_TYPE_GROUPS.map((group) => {
        const cards = creationTypesInGroup(group.id).filter((card) => isVisibleInCreatePicker(card.type))
        if (cards.length === 0) return null
        return (
          <section key={group.id} aria-labelledby={`create-group-${group.id}`}>
            <h2 id={`create-group-${group.id}`} className="text-xs font-semibold uppercase tracking-wide text-muted">
              {group.label}
            </h2>
            <ul className="mt-3 flex flex-col gap-3">
              {cards.map((card) => (
                <li key={card.type}>
                  <button
                    type="button"
                    onClick={() => openType(card.type)}
                    className={`flex min-h-11 w-full items-start gap-4 rounded-2xl border border-line bg-surface p-4 text-left ${focusRing}`}
                  >
                    <CreationTypeIcon type={card.type} />
                    <span className="flex flex-col gap-1">
                      <span className="font-serif text-lg text-ink">{card.name}</span>
                      <span className="text-sm text-muted">{card.description}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

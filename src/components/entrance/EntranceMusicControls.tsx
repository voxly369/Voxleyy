import { focusRing } from '../shell/navItems.ts'
import type { EntranceMusicState } from '../../lib/entrance/entranceMusic.ts'

type EntranceMusicControlsProps = {
  visible: boolean
  musicState: EntranceMusicState
  muted: boolean
  onToggleMute: () => void
  onStartFromBlocked: () => void
}

export function EntranceMusicControls({
  visible,
  musicState,
  muted,
  onToggleMute,
  onStartFromBlocked,
}: EntranceMusicControlsProps) {
  if (!visible) return null

  if (musicState === 'blocked') {
    return (
      <button
        type="button"
        onClick={onStartFromBlocked}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line bg-surface text-sm font-medium text-ink ${focusRing}`}
        aria-label="Play entrance music"
        data-testid="entrance-music-start"
      >
        <span aria-hidden="true">🔈</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggleMute}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line bg-surface text-sm font-medium text-ink ${focusRing}`}
      aria-label={muted ? 'Unmute entrance music' : 'Mute entrance music'}
      aria-pressed={muted}
      data-testid="entrance-music-mute"
    >
      <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
    </button>
  )
}

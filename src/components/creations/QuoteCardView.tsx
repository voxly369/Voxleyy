import type { QuoteCardSize, QuoteCardStyle } from '../../lib/creations/bodyDocument.ts'
import { DEFAULT_QUOTE_CARD_STYLE } from '../../lib/creations/bodyDocument.ts'

const sizeClass: Record<QuoteCardSize, string> = {
  small: 'text-lg',
  medium: 'text-2xl',
  large: 'text-3xl',
}

type QuoteCardViewProps = {
  text: string
  style?: QuoteCardStyle
  handle?: string | null
  className?: string
}

export function QuoteCardView({ text, style = DEFAULT_QUOTE_CARD_STYLE, handle, className = '' }: QuoteCardViewProps) {
  const safeSize: QuoteCardSize =
    style.size === 'small' || style.size === 'medium' || style.size === 'large' ? style.size : 'medium'
  const safe = {
    background: style.background.match(/^#[0-9a-fA-F]{6}$/) ? style.background : DEFAULT_QUOTE_CARD_STYLE.background,
    color: style.color.match(/^#[0-9a-fA-F]{6}$/) ? style.color : DEFAULT_QUOTE_CARD_STYLE.color,
    size: safeSize,
  }

  return (
    <div
      className={`flex min-h-[10rem] flex-col items-center justify-center rounded-xl px-6 py-8 text-center font-serif font-bold leading-snug ${sizeClass[safe.size]} ${className}`}
      style={{ backgroundColor: safe.background, color: safe.color }}
    >
      <p className="max-w-[30ch] whitespace-pre-wrap">{text.trim() || 'Your line appears here'}</p>
      {handle ? <p className="mt-6 text-sm font-normal opacity-80">@{handle.replace(/^@/, '')}</p> : null}
    </div>
  )
}

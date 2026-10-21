import type { Json } from '../../lib/database.types.ts'
import { literaryLinesFromBody, literaryStanzasFromLines } from '../../lib/creations/literaryDisplay.ts'

type LiteraryBodyViewProps = {
  bodyJson?: Json | null | undefined
  bodyText?: string | null
  /** Precomputed lines (e.g. card excerpt) — same stanza rules as full body. */
  lines?: readonly string[]
  className?: string
  stanzaGapClassName?: string
}

export function LiteraryBodyView({
  bodyJson,
  bodyText,
  lines: linesProp,
  className = '',
  stanzaGapClassName = 'gap-4',
}: LiteraryBodyViewProps) {
  const lines = linesProp ?? literaryLinesFromBody(bodyJson ?? null, bodyText ?? null)
  const stanzas = literaryStanzasFromLines(lines)

  return (
    <div
      className={`flex max-w-[65ch] flex-col font-serif text-lg leading-normal text-ink ${stanzaGapClassName} ${className}`}
    >
      {stanzas.map((stanza, stanzaIndex) => (
        <div key={stanzaIndex} className="flex flex-col gap-0 whitespace-pre-wrap">
          {stanza.map((line, lineIndex) => (
            <span key={lineIndex} className="block">
              {line}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

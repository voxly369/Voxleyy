import type { Json } from '../../lib/database.types.ts'
import { contentLangProps } from '../../lib/languages/dir.ts'
import { literaryLinesFromBody, literaryStanzasFromLines } from '../../lib/creations/literaryDisplay.ts'

type LiteraryBodyViewProps = {
  bodyJson?: Json | null | undefined
  bodyText?: string | null
  /** Precomputed lines (e.g. card excerpt) — same stanza rules as full body. */
  lines?: readonly string[]
  className?: string
  stanzaGapClassName?: string
  readerAnchors?: boolean
  contentLanguage?: string | null
}

export function LiteraryBodyView({
  bodyJson,
  bodyText,
  lines: linesProp,
  className = '',
  stanzaGapClassName = 'gap-4',
  readerAnchors = false,
  contentLanguage,
}: LiteraryBodyViewProps) {
  const lines = linesProp ?? literaryLinesFromBody(bodyJson ?? null, bodyText ?? null)
  const stanzas = literaryStanzasFromLines(lines)
  const langProps = contentLangProps(contentLanguage)

  return (
    <div
      className={`content-lang flex max-w-[65ch] flex-col font-serif text-lg leading-normal ${readerAnchors ? 'text-inherit' : 'text-ink'} ${stanzaGapClassName} ${className}`}
      {...langProps}
    >
      {stanzas.map((stanza, stanzaIndex) => (
        <div
          key={stanzaIndex}
          className="flex flex-col gap-0 whitespace-pre-wrap"
          {...(readerAnchors ? { 'data-reader-paragraph-index': stanzaIndex } : {})}
        >
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

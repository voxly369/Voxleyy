import type { Json } from '../../lib/database.types.ts'
import { literaryLinesFromBody, literaryStanzasFromLines } from '../../lib/creations/literaryDisplay.ts'

type LiteraryBodyViewProps = {
  bodyJson: Json | null | undefined
  bodyText: string | null
  className?: string
}

export function LiteraryBodyView({ bodyJson, bodyText, className = '' }: LiteraryBodyViewProps) {
  const lines = literaryLinesFromBody(bodyJson, bodyText)
  const stanzas = literaryStanzasFromLines(lines)

  return (
    <div className={`flex max-w-[65ch] flex-col gap-4 font-serif text-lg leading-normal text-ink ${className}`}>
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

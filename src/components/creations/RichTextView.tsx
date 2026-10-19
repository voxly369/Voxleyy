import type { ReactNode } from 'react'
import type { CreationType } from '../../lib/creations/creationTypes.ts'
import { usesLiterarySurface } from '../../lib/creations/creationTypes.ts'
import type { Json } from '../../lib/database.types.ts'
import { bodyContentFromJson, type RichBodyDocument } from '../../lib/creations/bodyDocument.ts'
import type { RichInline } from '../../lib/creations/richDocument.ts'

type RichTextViewProps = {
  bodyJson: Json | null | undefined
  bodyText: string | null
  creationType?: CreationType
  className?: string
}

function renderInline(inline: RichInline, key: number) {
  if (inline.type === 'hardBreak') return <br key={key} />
  const marks = inline.marks ?? []
  let node: ReactNode = inline.text
  if (marks.includes('bold')) node = <strong key={`b-${key}`}>{node}</strong>
  if (marks.includes('italic')) node = <em key={`i-${key}`}>{node}</em>
  return <span key={key}>{node}</span>
}

function renderBlock(block: RichBodyDocument['content'][number], index: number, literary: boolean) {
  const inlines = block.content ?? []
  if (block.type === 'heading') {
    const Tag = block.level === 2 ? 'h2' : 'h3'
    return (
      <Tag key={index} className="font-serif text-2xl font-semibold text-ink">
        {inlines.map((inline, i) => renderInline(inline, i))}
      </Tag>
    )
  }
  return (
    <p key={index} className={`text-lg leading-relaxed text-ink ${literary ? 'font-serif whitespace-pre-wrap' : ''}`}>
      {inlines.map((inline, i) => renderInline(inline, i))}
    </p>
  )
}

export function RichTextView({ bodyJson, bodyText, creationType, className = '' }: RichTextViewProps) {
  const literary = creationType ? usesLiterarySurface(creationType) : true
  const doc = bodyContentFromJson(bodyJson, bodyText)
  const content = doc.content

  return (
    <div className={`flex max-w-[65ch] flex-col gap-4 ${className}`}>
      {content.map((block, index) => renderBlock(block, index, literary))}
    </div>
  )
}

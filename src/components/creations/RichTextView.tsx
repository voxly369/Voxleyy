import type { ReactNode } from 'react'
import type { CreationType } from '../../lib/creations/creationTypes.ts'
import { usesLiterarySurface } from '../../lib/creations/creationTypes.ts'
import { LiteraryBodyView } from './LiteraryBodyView.tsx'
import type { Json } from '../../lib/database.types.ts'
import { bodyContentFromJson, type RichBodyDocument } from '../../lib/creations/bodyDocument.ts'
import type { RichInline } from '../../lib/creations/richDocument.ts'

type RichTextViewProps = {
  bodyJson: Json | null | undefined
  bodyText: string | null
  creationType?: CreationType
  className?: string
  /** Annotate headings and paragraphs for reader resume, TOC focus, and paging. */
  readerAnchors?: boolean
}

function renderInline(inline: RichInline, key: number) {
  if (inline.type === 'hardBreak') return <br key={key} />
  const marks = inline.marks ?? []
  let node: ReactNode = inline.text
  if (marks.includes('bold')) node = <strong key={`b-${key}`}>{node}</strong>
  if (marks.includes('italic')) node = <em key={`i-${key}`}>{node}</em>
  return <span key={key}>{node}</span>
}

function renderBlock(
  block: RichBodyDocument['content'][number],
  index: number,
  literary: boolean,
  readerAnchors: boolean,
  readerParagraphIndex: number | null,
) {
  const inlines = block.content ?? []
  const textClass = readerAnchors ? 'text-inherit' : 'text-ink'
  const anchorProps =
    readerAnchors && readerParagraphIndex !== null
      ? { 'data-reader-paragraph-index': readerParagraphIndex }
      : {}
  if (block.type === 'heading') {
    const Tag = block.level === 2 ? 'h2' : 'h3'
    return (
      <Tag
        key={index}
        id={readerAnchors ? `reader-heading-${index}` : undefined}
        className={`font-serif text-2xl font-semibold ${textClass}`}
        {...anchorProps}
      >
        {inlines.map((inline, i) => renderInline(inline, i))}
      </Tag>
    )
  }
  if (block.type === 'paragraph') {
    return (
      <p
        key={index}
        className={`text-lg leading-relaxed ${textClass} ${literary ? 'font-serif whitespace-pre-wrap' : ''}`}
        {...anchorProps}
      >
        {inlines.map((inline, i) => renderInline(inline, i))}
      </p>
    )
  }
  return null
}

function usesPoemLineLayout(type: CreationType | undefined): boolean {
  return type === 'poem' || type === 'lyric' || type === 'script'
}

export function RichTextView({
  bodyJson,
  bodyText,
  creationType,
  className = '',
  readerAnchors = false,
}: RichTextViewProps) {
  const literary = creationType ? usesLiterarySurface(creationType) : true
  if (usesPoemLineLayout(creationType)) {
    return (
      <LiteraryBodyView bodyJson={bodyJson} bodyText={bodyText} className={className} readerAnchors={readerAnchors} />
    )
  }
  const doc = bodyContentFromJson(bodyJson, bodyText)
  const content = doc.content
  const readerIndexByBlock = readerAnchors
    ? (() => {
        let readerParagraphIndex = 0
        const map = new Map<number, number>()
        content.forEach((block, index) => {
          if (block.type === 'paragraph' || block.type === 'heading') {
            map.set(index, readerParagraphIndex)
            readerParagraphIndex += 1
          }
        })
        return map
      })()
    : null

  return (
    <div className={`flex max-w-[65ch] flex-col gap-4 ${className}`}>
      {content.map((block, index) => {
        const paraIndex = readerIndexByBlock?.get(index) ?? null
        return renderBlock(block, index, literary, readerAnchors, paraIndex)
      })}
    </div>
  )
}

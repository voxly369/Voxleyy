import type { ReactNode } from 'react'
import type { CreationType } from '../../lib/creations/creationTypes.ts'
import { usesLiterarySurface } from '../../lib/creations/creationTypes.ts'
import { contentLangProps } from '../../lib/languages/dir.ts'
import { LiteraryBodyView } from './LiteraryBodyView.tsx'
import type { Json } from '../../lib/database.types.ts'
import { bodyContentFromJson, type RichBodyDocument } from '../../lib/creations/bodyDocument.ts'
import type { RichInline } from '../../lib/creations/richDocument.ts'
import type { AnchoredHighlight } from '../../lib/reader/highlightAnchoring.ts'
import { paragraphPlainText } from '../../lib/reader/highlightOffsets.ts'
import { highlightColourClasses, segmentsForParagraph } from '../../lib/reader/highlightSegments.ts'

type RichTextViewProps = {
  bodyJson: Json | null | undefined
  bodyText: string | null
  creationType?: CreationType
  contentLanguage?: string | null
  className?: string
  /** Annotate headings and paragraphs for reader resume, TOC focus, and paging. */
  readerAnchors?: boolean
  highlights?: readonly AnchoredHighlight[]
  bookmarkParagraphs?: readonly number[]
  onHighlightPress?: (highlightId: string) => void
  testId?: string
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
  bodyJson: Json | null | undefined,
  bodyText: string | null,
  highlights: readonly AnchoredHighlight[],
  onHighlightPress?: (highlightId: string) => void,
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
    const plain =
      readerAnchors && readerParagraphIndex !== null
        ? paragraphPlainText(bodyJson, bodyText, readerParagraphIndex)
        : ''
    const hasHighlights =
      readerAnchors && readerParagraphIndex !== null && highlights.some((h) => !h.unmatched)
    return (
      <p
        key={index}
        className={`relative text-lg leading-relaxed ${textClass} ${literary ? 'font-serif whitespace-pre-wrap' : ''}`}
        {...anchorProps}
      >
        {hasHighlights ? (
          segmentsForParagraph(readerParagraphIndex ?? 0, plain, highlights).map((segment, segIndex) =>
            segment.highlightId ? (
              <mark
                key={segIndex}
                data-highlight-id={segment.highlightId}
                className={`cursor-pointer rounded-sm px-0.5 ${highlightColourClasses(segment.colour ?? 'yellow')}`}
                onClick={() => onHighlightPress?.(segment.highlightId!)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onHighlightPress?.(segment.highlightId!)
                  }
                }}
                tabIndex={0}
                aria-label={`Highlight: ${segment.text.slice(0, 80)}`}
              >
                {segment.text}
              </mark>
            ) : (
              <span key={segIndex}>{segment.text}</span>
            ),
          )
        ) : (
          inlines.map((inline, i) => renderInline(inline, i))
        )}
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
  contentLanguage,
  className = '',
  readerAnchors = false,
  highlights = [],
  bookmarkParagraphs = [],
  onHighlightPress,
  testId,
}: RichTextViewProps) {
  const literary = creationType ? usesLiterarySurface(creationType) : true
  const langProps = contentLangProps(contentLanguage)
  if (usesPoemLineLayout(creationType)) {
    return (
      <LiteraryBodyView
        bodyJson={bodyJson}
        bodyText={bodyText}
        className={className}
        readerAnchors={readerAnchors}
        contentLanguage={contentLanguage}
      />
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
    <div
      className={`content-lang flex max-w-[65ch] flex-col gap-4 ${className}`}
      {...langProps}
      {...(testId ? { 'data-testid': testId } : {})}
    >
      {content.map((block, index) => {
        const paraIndex = readerIndexByBlock?.get(index) ?? null
        const node = renderBlock(
          block,
          index,
          literary,
          readerAnchors,
          paraIndex,
          bodyJson,
          bodyText,
          highlights,
          onHighlightPress,
        )
        const showRibbon =
          readerAnchors &&
          paraIndex != null &&
          bookmarkParagraphs.includes(paraIndex) &&
          block.type === 'paragraph'
        if (!showRibbon) return node
        return (
          <div key={`wrap-${index}`} className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute -left-3 top-0 h-6 w-2 rounded-sm bg-coral/80"
              title="Bookmark"
            />
            {node}
          </div>
        )
      })}
    </div>
  )
}

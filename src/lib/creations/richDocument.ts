import { z } from 'zod'
import type { Json } from '../database.types.ts'
import { MAX_BODY_JSON_OCTETS, MAX_BODY_TEXT_OCTETS } from './limits.ts'

const markSchema = z.enum(['bold', 'italic'])

const inlineTextSchema = z
  .object({
    type: z.literal('text'),
    text: z.string(),
    marks: z.array(markSchema).optional(),
  })
  .strict()

const inlineHardBreakSchema = z.object({ type: z.literal('hardBreak') }).strict()

const inlineSchema = z.discriminatedUnion('type', [inlineTextSchema, inlineHardBreakSchema])

const paragraphSchema = z
  .object({
    type: z.literal('paragraph'),
    content: z.array(inlineSchema).optional(),
  })
  .strict()

const headingSchema = z
  .object({
    type: z.literal('heading'),
    level: z.union([z.literal(2), z.literal(3)]),
    content: z.array(inlineTextSchema).optional(),
  })
  .strict()

const blockSchema = z.discriminatedUnion('type', [paragraphSchema, headingSchema])

export type RichInlineText = z.infer<typeof inlineTextSchema>
export type RichInline = z.infer<typeof inlineSchema>
export type RichBlock = z.infer<typeof blockSchema>

export type RichBodyDocument = {
  version: 1
  format: 'rich'
  content: RichBlock[]
}

const richBodySchema = z
  .object({
    version: z.literal(1),
    format: z.literal('rich'),
    content: z.array(blockSchema),
  })
  .strict()

export function parseRichDocument(value: unknown): RichBodyDocument | null {
  const parsed = richBodySchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function validateRichDocumentSize(doc: RichBodyDocument): { ok: true } | { ok: false; message: string } {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(doc)).length
  if (jsonBytes > MAX_BODY_JSON_OCTETS) {
    return { ok: false, message: 'That text is too long. Shorten it and try again.' }
  }
  const plain = richToPlainText(doc)
  if (new TextEncoder().encode(plain).length > MAX_BODY_TEXT_OCTETS) {
    return { ok: false, message: 'That text is too long. Shorten it and try again.' }
  }
  return { ok: true }
}

export function richDocumentFingerprint(doc: RichBodyDocument): string {
  return JSON.stringify(doc)
}

export function richToPlainText(doc: RichBodyDocument): string {
  const blocks = doc.content.map((block) => {
    if (block.type === 'heading') {
      return inlineToPlain(block.content ?? [])
    }
    return inlineToPlain(block.content ?? [])
  })
  return blocks.join('\n\n')
}

function inlineToPlain(inlines: RichInline[]): string {
  return inlines
    .map((node) => {
      if (node.type === 'hardBreak') return '\n'
      return node.text
    })
    .join('')
}

export function plainToRich(text: string): RichBodyDocument {
  const paragraphs = text.split(/\n\n+/)
  const content: RichBlock[] = paragraphs.map((para) => {
    const parts = para.split('\n')
    const inlines: RichInline[] = []
    parts.forEach((part, index) => {
      if (part) inlines.push({ type: 'text', text: part })
      if (index < parts.length - 1) inlines.push({ type: 'hardBreak' })
    })
    return { type: 'paragraph', content: inlines.length ? inlines : undefined }
  })
  if (content.length === 0) content.push({ type: 'paragraph' })
  return { version: 1, format: 'rich', content }
}

export function emptyRichDocument(): RichBodyDocument {
  return { version: 1, format: 'rich', content: [{ type: 'paragraph' }] }
}

/** TipTap / ProseMirror JSON document shape (subset). */
type EditorDoc = { type: 'doc'; content?: EditorNode[] }
type EditorNode = Record<string, unknown>

export function docToEditorJson(doc: RichBodyDocument): EditorDoc {
  return {
    type: 'doc',
    content: doc.content.map((block) => {
      if (block.type === 'heading') {
        return {
          type: 'heading',
          attrs: { level: block.level },
          content: (block.content ?? []).map(editorInlineFromRich),
        }
      }
      return {
        type: 'paragraph',
        content: (block.content ?? []).map((inline) => {
          if (inline.type === 'hardBreak') return { type: 'hardBreak' }
          return editorInlineFromRich(inline)
        }),
      }
    }),
  }
}

function editorInlineFromRich(inline: RichInlineText): EditorNode {
  const marks = (inline.marks ?? []).map((mark) => ({ type: mark }))
  return marks.length ? { type: 'text', text: inline.text, marks } : { type: 'text', text: inline.text }
}

export function editorJsonToDoc(value: unknown): RichBodyDocument | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const root = value as EditorDoc
  if (root.type !== 'doc' || !Array.isArray(root.content)) return null

  const content: RichBlock[] = []
  for (const node of root.content) {
    if (!node || typeof node !== 'object') return null
    if (node.type === 'paragraph') {
      const inlines = parseEditorInlines(node.content)
      if (inlines === null) return null
      content.push({ type: 'paragraph', content: inlines.length ? inlines : undefined })
      continue
    }
    if (node.type === 'heading') {
      const level = (node.attrs as { level?: number } | undefined)?.level
      if (level !== 2 && level !== 3) return null
      const inlines = parseEditorTextInlines(node.content)
      if (inlines === null) return null
      content.push({ type: 'heading', level, content: inlines.length ? inlines : undefined })
      continue
    }
    return null
  }

  return parseRichDocument({ version: 1, format: 'rich', content: content.length ? content : [{ type: 'paragraph' }] })
}

function parseEditorInlines(nodes: unknown): RichInline[] | null {
  if (!Array.isArray(nodes)) return []
  const out: RichInline[] = []
  for (const node of nodes) {
    if (!node || typeof node !== 'object') return null
    if ((node as EditorNode).type === 'hardBreak') {
      out.push({ type: 'hardBreak' })
      continue
    }
    if ((node as EditorNode).type === 'text' && typeof (node as EditorNode).text === 'string') {
      const marks = parseEditorMarks((node as EditorNode).marks)
      if (marks === null) return null
      out.push({ type: 'text', text: (node as EditorNode).text as string, ...(marks.length ? { marks } : {}) })
      continue
    }
    return null
  }
  return out
}

function parseEditorTextInlines(nodes: unknown): RichInlineText[] | null {
  if (!Array.isArray(nodes)) return []
  const out: RichInlineText[] = []
  for (const node of nodes) {
    if (!node || typeof node !== 'object' || (node as EditorNode).type !== 'text') return null
    if (typeof (node as EditorNode).text !== 'string') return null
    const marks = parseEditorMarks((node as EditorNode).marks)
    if (marks === null) return null
    out.push({ type: 'text', text: (node as EditorNode).text as string, ...(marks.length ? { marks } : {}) })
  }
  return out
}

function parseEditorMarks(marks: unknown): ('bold' | 'italic')[] | null {
  if (!marks) return []
  if (!Array.isArray(marks)) return null
  const out: ('bold' | 'italic')[] = []
  for (const mark of marks) {
    if (!mark || typeof mark !== 'object') return null
    const type = (mark as { type?: string }).type
    if (type === 'bold' || type === 'italic') out.push(type)
    else return null
  }
  return out
}

export function bodyContentFromJson(value: Json | null | undefined, fallbackText: string | null): RichBodyDocument {
  const rich = parseRichDocument(value)
  if (rich) return rich
  const text = fallbackText ?? ''
  return plainToRich(text)
}

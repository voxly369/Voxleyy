import { Extension, useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef, useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import {
  docToEditorJson,
  richToPlainText,
  type RichBodyDocument,
} from '../../lib/creations/bodyDocument.ts'
import { processEditorJsonUpdate } from '../../lib/creations/richEditorUpdate.ts'
import { pastePlainTextIntoEditor } from '../../lib/creations/richPaste.ts'
import { MAX_BODY_JSON_OCTETS, MAX_BODY_TEXT_OCTETS } from '../../lib/creations/limits.ts'
import { countWords } from '../../lib/creations/publishValidation.ts'

export const FORMAT_UNREADABLE_MESSAGE =
  'We could not read that last change. Your previous text is safe. Undo to continue.'

type RichTextEditorProps = {
  document: RichBodyDocument
  literaryLineBreaks: boolean
  onChange: (doc: RichBodyDocument, plainText: string) => void
  onBlur: () => void
  onStructureFailure?: () => void
}

function LiteraryEnter(literary: boolean) {
  return Extension.create({
    name: 'literaryEnter',
    addKeyboardShortcuts(): Record<string, () => boolean> {
      const shiftEnter = () => this.editor.commands.setHardBreak()
      if (!literary) {
        return { 'Shift-Enter': shiftEnter }
      }
      return {
        Enter: () => {
          const { empty, $from } = this.editor.state.selection
          const parent = $from.parent
          if (empty && parent.content.size === 0) {
            return this.editor.commands.splitBlock()
          }
          return this.editor.commands.setHardBreak()
        },
        'Shift-Enter': shiftEnter,
      }
    },
  })
}

function focusNextToolbarButton(toolbar: HTMLDivElement, current: HTMLButtonElement, direction: 1 | -1) {
  const buttons = Array.from(toolbar.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
  const index = buttons.indexOf(current)
  if (index < 0) return
  const next = buttons[(index + direction + buttons.length) % buttons.length]
  next?.focus()
}

export function RichTextEditor({
  document,
  literaryLineBreaks,
  onChange,
  onBlur,
  onStructureFailure,
}: RichTextEditorProps) {
  const toolbarRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const lastValidRef = useRef<RichBodyDocument>(document)
  const [formatError, setFormatError] = useState(false)
  const [pasteMessage, setPasteMessage] = useState<string | null>(null)
  const [, bumpToolbar] = useState(0)

  useEffect(() => {
    lastValidRef.current = document
  }, [document])


  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
        code: false,
        strike: false,
        horizontalRule: false,
        dropcursor: false,
        gapcursor: false,
        heading: { levels: [2, 3] },
      }),
      LiteraryEnter(literaryLineBreaks),
    ],
    content: docToEditorJson(document),
    onUpdate: ({ editor: ed }) => {
      const outcome = processEditorJsonUpdate(ed.getJSON(), lastValidRef.current)
      if (!outcome.ok) {
        setFormatError(true)
        onStructureFailure?.()
        ed.commands.setContent(docToEditorJson(outcome.revertTo), false)
        return
      }
      setFormatError(false)
      setPasteMessage(null)
      lastValidRef.current = outcome.doc
      onChange(outcome.doc, outcome.plain)
    },
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Write your piece',
        class: `voxly-rich-editor min-h-[16rem] w-full rounded-2xl border border-line bg-surface px-3 py-3 text-lg text-ink outline-none focus-visible:ring-2 focus-visible:ring-coral ${literaryLineBreaks ? 'voxly-literary-editor font-serif leading-normal' : 'leading-relaxed'}`,
        'data-placeholder': 'Start writing…',
      },
      handlePaste(_view, event) {
        const text = event.clipboardData?.getData('text/plain')
        if (text == null) return false
        event.preventDefault()
        const ed = editorRef.current
        if (!ed) return true
        const result = pastePlainTextIntoEditor(ed, text)
        if (!result.ok) {
          setPasteMessage(result.message)
          return true
        }
        setPasteMessage(null)
        return true
      },
    },
  })

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const refresh = () => bumpToolbar((n) => n + 1)
    editor.on('transaction', refresh)
    return () => {
      editor.off('transaction', refresh)
    }
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const next = docToEditorJson(document)
    const current = editor.getJSON()
    if (JSON.stringify(current) !== JSON.stringify(next)) {
      editor.commands.setContent(next, false)
      lastValidRef.current = document
    }
  }, [document, editor])

  const plain = richToPlainText(document)
  const bytes = new TextEncoder().encode(plain).length
  const jsonBytes = new TextEncoder().encode(JSON.stringify(document)).length
  const words = countWords(plain)

  function onToolbarArrowKey(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const toolbar = toolbarRef.current
    if (!toolbar) return
    event.preventDefault()
    focusNextToolbarButton(toolbar, event.currentTarget, event.key === 'ArrowRight' ? 1 : -1)
  }

  function toggleButton(label: string, pressed: boolean, onClick: () => void) {
    return (
      <button
        type="button"
        aria-pressed={pressed}
        title={label}
        onClick={onClick}
        onKeyDown={onToolbarArrowKey}
        className={`min-h-11 min-w-11 rounded-xl border border-line px-2 text-sm font-medium ${pressed ? 'bg-coral text-white' : 'bg-surface'} ${focusRing}`}
      >
        {label}
      </button>
    )
  }

  function historyButton(label: 'Undo' | 'Redo', canRun: boolean, onClick: () => void) {
    return (
      <button
        type="button"
        title={label}
        disabled={!canRun}
        aria-disabled={!canRun}
        onClick={onClick}
        onKeyDown={onToolbarArrowKey}
        className={`min-h-11 min-w-11 rounded-xl border border-line px-2 text-sm font-medium disabled:opacity-40 ${focusRing}`}
      >
        {label}
      </button>
    )
  }

  if (!editor) return null

  const canUndo = editor.can().undo()
  const canRedo = editor.can().redo()

  return (
    <div className="sticky bottom-0 z-10 flex flex-col gap-2 bg-bg/95 pb-2 pt-2 backdrop-blur">
      <div ref={toolbarRef} role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-2">
        {toggleButton('Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
        {toggleButton('Italic', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
        {toggleButton('Heading 2', editor.isActive('heading', { level: 2 }), () =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
        )}
        {toggleButton('Heading 3', editor.isActive('heading', { level: 3 }), () =>
          editor.chain().focus().toggleHeading({ level: 3 }).run(),
        )}
        {toggleButton('Paragraph', editor.isActive('paragraph'), () => editor.chain().focus().setParagraph().run())}
        {historyButton('Undo', canUndo, () => editor.chain().focus().undo().run())}
        {historyButton('Redo', canRedo, () => editor.chain().focus().redo().run())}
      </div>
      {formatError ? (
        <p className="text-sm text-coral" role="status" aria-live="polite">
          {FORMAT_UNREADABLE_MESSAGE}
        </p>
      ) : null}
      {pasteMessage ? (
        <p className="text-sm text-coral" role="status" aria-live="polite">
          {pasteMessage}
        </p>
      ) : null}
      <EditorContent editor={editor} onBlur={onBlur} />
      <p className="text-sm text-muted">
        {words} words · {bytes.toLocaleString()} / {MAX_BODY_TEXT_OCTETS.toLocaleString()} bytes · JSON{' '}
        {jsonBytes.toLocaleString()} / {MAX_BODY_JSON_OCTETS.toLocaleString()} bytes
      </p>
    </div>
  )
}

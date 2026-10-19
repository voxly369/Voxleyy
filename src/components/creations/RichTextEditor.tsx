import { Extension, useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef } from 'react'
import { focusRing } from '../shell/navItems.ts'
import {
  docToEditorJson,
  editorJsonToDoc,
  richToPlainText,
  type RichBodyDocument,
} from '../../lib/creations/bodyDocument.ts'
import { MAX_BODY_JSON_OCTETS, MAX_BODY_TEXT_OCTETS } from '../../lib/creations/limits.ts'
import { countWords } from '../../lib/creations/publishValidation.ts'

type RichTextEditorProps = {
  document: RichBodyDocument
  literaryLineBreaks: boolean
  onChange: (doc: RichBodyDocument, plainText: string) => void
  onBlur: () => void
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

export function RichTextEditor({ document, literaryLineBreaks, onChange, onBlur }: RichTextEditorProps) {
  const toolbarRef = useRef<HTMLDivElement>(null)
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
      const parsed = editorJsonToDoc(ed.getJSON())
      if (!parsed) return
      onChange(parsed, richToPlainText(parsed))
    },
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Write your piece',
        class: `min-h-[16rem] max-w-[65ch] rounded-2xl border border-line bg-surface px-3 py-3 text-lg leading-relaxed text-ink outline-none focus-visible:ring-2 focus-visible:ring-coral ${literaryLineBreaks ? 'font-serif' : ''}`,
      },
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain')
        if (text == null) return false
        event.preventDefault()
        view.dispatch(view.state.tr.insertText(text))
        return true
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    const next = docToEditorJson(document)
    const current = editor.getJSON()
    if (JSON.stringify(current) !== JSON.stringify(next)) {
      editor.commands.setContent(next, false)
    }
  }, [document, editor])

  const plain = richToPlainText(document)
  const bytes = new TextEncoder().encode(plain).length
  const jsonBytes = new TextEncoder().encode(JSON.stringify(document)).length
  const words = countWords(plain)

  function onToolbarArrowKey(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const buttons = toolbarRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []
    const list = Array.from(buttons)
    const index = list.indexOf(event.currentTarget)
    if (index < 0) return
    event.preventDefault()
    if (event.key === 'ArrowRight') list[(index + 1) % list.length]?.focus()
    else list[(index - 1 + list.length) % list.length]?.focus()
  }

  function toolbarButton(label: string, pressed: boolean, onClick: () => void) {
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

  if (!editor) return null

  return (
    <div className="sticky bottom-0 z-10 flex flex-col gap-2 bg-bg/95 pb-2 pt-2 backdrop-blur">
      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap gap-2"
      >
        {toolbarButton('Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
        {toolbarButton('Italic', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
        {toolbarButton('Heading 2', editor.isActive('heading', { level: 2 }), () =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
        )}
        {toolbarButton('Heading 3', editor.isActive('heading', { level: 3 }), () =>
          editor.chain().focus().toggleHeading({ level: 3 }).run(),
        )}
        {toolbarButton('Paragraph', editor.isActive('paragraph'), () => editor.chain().focus().setParagraph().run())}
        {toolbarButton('Undo', false, () => editor.chain().focus().undo().run())}
        {toolbarButton('Redo', false, () => editor.chain().focus().redo().run())}
      </div>
      <EditorContent editor={editor} onBlur={onBlur} />
      <p className="text-sm text-muted">
        {words} words · {bytes.toLocaleString()} / {MAX_BODY_TEXT_OCTETS.toLocaleString()} bytes · JSON{' '}
        {jsonBytes.toLocaleString()} / {MAX_BODY_JSON_OCTETS.toLocaleString()} bytes
      </p>
    </div>
  )
}

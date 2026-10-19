import { describe, expect, it, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Extension } from '@tiptap/react'
import { editorJsonToDoc } from '../../lib/creations/bodyDocument.ts'

function LiteraryEnter(literary: boolean) {
  return Extension.create({
    name: 'literaryEnter',
    addKeyboardShortcuts(): Record<string, () => boolean> {
      const shiftEnter = () => this.editor.commands.setHardBreak()
      if (!literary) return { 'Shift-Enter': shiftEnter }
      return {
        Enter: () => {
          const { empty, $from } = this.editor.state.selection
          const parent = $from.parent
          if (empty && parent.content.size === 0) return this.editor.commands.splitBlock()
          return this.editor.commands.setHardBreak()
        },
        'Shift-Enter': shiftEnter,
      }
    },
  })
}

function EditorProbe({ literary, run }: { literary: boolean; run: (editor: NonNullable<ReturnType<typeof useEditor>>) => void }) {
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
      LiteraryEnter(literary),
    ],
    content: '<p></p>',
  })

  useEffect(() => {
    if (!editor) return
    run(editor)
  }, [editor, literary, run])

  return null
}

describe('TipTap starter-kit output matches rich schema', () => {
  afterEach(() => {
    // editors destroyed with unmount
  })

  it('accepts every toolbar command and enter variant', async () => {
    const failures: string[] = []

    function assertJson(label: string, json: unknown) {
      const doc = editorJsonToDoc(json)
      if (!doc) failures.push(label)
    }

    render(
      <EditorProbe
        literary={false}
        run={(editor) => {
          queueMicrotask(() => {
            editor.chain().focus().insertContent('Hello').run()
            assertJson('initial', editor.getJSON())
            editor.chain().focus().toggleBold().run()
            assertJson('bold', editor.getJSON())
            editor.chain().focus().toggleItalic().run()
            assertJson('italic', editor.getJSON())
            editor.chain().focus().toggleHeading({ level: 2 }).run()
            assertJson('h2', editor.getJSON())
            editor.chain().focus().setHardBreak().run()
            assertJson('hardBreak in h2', editor.getJSON())
            editor.chain().focus().toggleHeading({ level: 3 }).run()
            assertJson('h3', editor.getJSON())
            editor.chain().focus().setParagraph().run()
            assertJson('paragraph', editor.getJSON())
            editor.chain().focus().undo().run()
            assertJson('undo', editor.getJSON())
            editor.chain().focus().redo().run()
            assertJson('redo', editor.getJSON())
          })
        }}
      />,
    )

    await waitFor(() => expect(failures).toEqual([]), { timeout: 3000 })
  })

  it('accepts literary Enter sequences', async () => {
    const failures: string[] = []
    render(
      <EditorProbe
        literary
        run={(editor) => {
          editor.chain().focus().insertContent('Line 1').setHardBreak().insertContent('Line 2').run()
          const doc = editorJsonToDoc(editor.getJSON())
          if (!doc) failures.push('literary hard breaks')
          editor.chain().focus().splitBlock().run()
          const doc2 = editorJsonToDoc(editor.getJSON())
          if (!doc2) failures.push('literary split block')
        }}
      />,
    )
    await waitFor(() => expect(failures).toEqual([]))
  })
})

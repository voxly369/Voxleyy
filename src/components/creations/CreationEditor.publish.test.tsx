import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'
import { CreationEditor } from './CreationEditor.tsx'

function renderEditor(ui: ReactElement) {
  return render(<ModalStackProvider>{ui}</ModalStackProvider>)
}

vi.mock('../../lib/auth/auth-context.ts', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    profile: { username: 'writer', display_name: 'Writer', avatar_url: null, verified: false },
  }),
}))

vi.mock('../../lib/shell/useToast.ts', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('./LazyRichTextEditor.tsx', () => ({
  LazyRichTextEditor: () => <div data-testid="rich-editor" />,
}))

function editorStub(overrides: Partial<ReturnType<typeof baseEditor>> = {}) {
  return { ...baseEditor(), ...overrides }
}

function baseEditor() {
  return {
    creationId: null as string | null,
    creationStatus: 'draft' as const,
    creationAudience: 'public' as const,
    form: { title: '', body: '', caption: '', tags: [] as string[] },
    quoteStyle: { background: '#111', color: '#eee', size: 'medium' as const },
    usesRichEditor: false,
    richDoc: { format: 'rich' as const, blocks: [] },
    literaryLineBreaks: true,
    statusLabel: '',
    tagWarning: null as string | null,
    autosave: { ui: 'idle' as const },
    buildPreviewBodyJson: () => ({}),
    onEdit: vi.fn(),
    onBlur: vi.fn(),
    onAudienceChange: vi.fn(),
    onQuoteStyleChange: vi.fn(),
    onRichDocumentChange: vi.fn(),
    onRichStructureFailure: vi.fn(),
    saveDraftNow: vi.fn(async () => true),
    retrySave: vi.fn(),
    reloadRemote: vi.fn(),
    overwriteRemote: vi.fn(),
  }
}

describe('CreationEditor publish control', () => {
  it('always shows Publish disabled with a reason before draft exists', () => {
    renderEditor(
      <CreationEditor
        creationType="poem"
        editor={editorStub()}
        coverUrl={null}
        onCoverUrlChange={() => {}}
        onOpenPublish={vi.fn()}
      />,
    )
    const publish = screen.getAllByRole('button', { name: 'Publish' })[0]
    expect(publish).toBeDisabled()
    expect(screen.getAllByText(/draft before you publish/i)[0]).toBeInTheDocument()
  })

  it('enables Publish when draft exists and content is valid', () => {
    const editor = editorStub({
      creationId: 'draft-1',
      form: { title: 'Title', body: 'Line one', caption: '', tags: [] },
    })
    renderEditor(
      <CreationEditor
        creationType="poem"
        editor={editor}
        coverUrl={null}
        onCoverUrlChange={() => {}}
        onOpenPublish={vi.fn()}
      />,
    )
    const buttons = screen.getAllByRole('button', { name: 'Publish' })
    expect(buttons.some((button) => !(button as HTMLButtonElement).disabled)).toBe(true)
  })
})

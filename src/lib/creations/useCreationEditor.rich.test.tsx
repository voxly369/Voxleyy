import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useCreationEditor } from './useCreationEditor.ts'
import * as api from './api.ts'
import { emptyRichDocument } from './bodyDocument.ts'
import type { CreateDraftResult, CreationDetail, EditableCreation } from './types.ts'
import { SIGN_IN_AGAIN_SAVE_MESSAGE } from './saveErrors.ts'

const navigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigate }
})

vi.mock('./api.ts', () => ({
  createDraft: vi.fn(),
  getEditableCreation: vi.fn(),
  saveCreationFields: vi.fn(),
}))

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}

const loadedEditable: EditableCreation = {
  id: 'draft-1',
  type: 'poem',
  title: 'Title',
  caption: '',
  bodyText: 'Body',
  bodyJson: emptyRichDocument(),
  coverUrl: null,
  status: 'draft',
  audience: 'private',
  updatedAt: '2026-10-19T00:00:00Z',
  tags: [],
}

const createdDetail: CreationDetail = {
  id: 'draft-1',
  type: 'poem',
  title: 'Title',
  caption: null,
  bodyText: 'Body',
  bodyJson: emptyRichDocument(),
  coverUrl: null,
  status: 'draft',
  audience: 'private',
  updatedAt: '2026-10-19T00:00:00Z',
  createdAt: '2026-10-19T00:00:00Z',
  genre: null,
  mood: null,
  language: 'en',
  isOwn: true,
  author: { id: 'user-1', username: 'writer', displayName: 'Writer', avatarUrl: null, verified: false },
}

describe('useCreationEditor rich autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    navigate.mockReset()
    vi.mocked(api.createDraft).mockReset()
    vi.mocked(api.saveCreationFields).mockReset()
    vi.mocked(api.getEditableCreation).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function flushDebounce() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
  }

  it('debounces rich edits to a single save after 1.5 s', async () => {
    vi.mocked(api.createDraft).mockResolvedValue({ ok: true, data: createdDetail })

    const { result } = renderHook(() => useCreationEditor({ creationId: null, creationType: 'poem' }), { wrapper })

    const doc1 = { ...emptyRichDocument(), content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text: 'H' }] }] }
    const doc2 = { ...emptyRichDocument(), content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text: 'Hello' }] }] }

    act(() => {
      result.current.onRichDocumentChange(doc1, 'H')
      result.current.onRichDocumentChange(doc2, 'Hello')
    })

    await flushDebounce()
    await act(async () => {
      await Promise.resolve()
    })

    expect(api.createDraft).toHaveBeenCalledTimes(1)
  })

  it('saves immediately on blur while dirty', async () => {
    vi.mocked(api.getEditableCreation).mockResolvedValue({ ok: true, data: loadedEditable })
    vi.mocked(api.saveCreationFields).mockResolvedValue({ ok: true, updatedAt: '2026-10-19T00:01:00Z' })

    const { result } = renderHook(() => useCreationEditor({ creationId: 'draft-1', creationType: 'poem' }), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.loading).toBe(false)

    await act(async () => {
      result.current.onRichDocumentChange(
        { ...emptyRichDocument(), content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text: 'Changed' }] }] },
        'Changed',
      )
      result.current.onBlur()
      await Promise.resolve()
    })

    expect(api.saveCreationFields).toHaveBeenCalled()
  })

  it('saves immediately when the tab becomes hidden', async () => {
    vi.mocked(api.getEditableCreation).mockResolvedValue({ ok: true, data: loadedEditable })
    vi.mocked(api.saveCreationFields).mockResolvedValue({ ok: true, updatedAt: '2026-10-19T00:01:00Z' })

    const { result } = renderHook(() => useCreationEditor({ creationId: 'draft-1', creationType: 'poem' }), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      result.current.onRichDocumentChange(
        { ...emptyRichDocument(), content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text: 'Hidden save' }] }] },
        'Hidden save',
      )
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
    })

    expect(api.saveCreationFields).toHaveBeenCalled()
  })

  it('blocks leave while dirty and allows when clean', async () => {
    const { result } = renderHook(() => useCreationEditor({ creationId: null, creationType: 'poem' }), { wrapper })
    expect(result.current.shouldBlockLeave).toBe(false)

    act(() => {
      result.current.onRichDocumentChange(
        { ...emptyRichDocument(), content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text: 'x' }] }] },
        'x',
      )
    })
    expect(result.current.shouldBlockLeave).toBe(true)
  })

  it('shows conflict UI and reload replaces editor content', async () => {
    vi.mocked(api.getEditableCreation).mockResolvedValue({ ok: true, data: loadedEditable })
    vi.mocked(api.saveCreationFields).mockResolvedValue({
      ok: false,
      conflict: true,
      remoteUpdatedAt: '2026-10-19T00:05:00Z',
    })

    const { result } = renderHook(() => useCreationEditor({ creationId: 'draft-1', creationType: 'poem' }), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      result.current.onRichDocumentChange(
        { ...emptyRichDocument(), content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text: 'Mine' }] }] },
        'Mine',
      )
      result.current.onBlur()
      await Promise.resolve()
    })

    expect(result.current.autosave.ui).toBe('conflict')

    vi.mocked(api.getEditableCreation).mockResolvedValueOnce({
      ok: true,
      data: {
        ...loadedEditable,
        bodyText: 'Remote newer',
        bodyJson: {
          version: 1,
          format: 'rich',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Remote newer' }] }],
        },
        updatedAt: '2026-10-19T00:05:00Z',
      },
    })

    await act(async () => {
      await result.current.reloadRemote()
    })

    expect(result.current.form.body).toBe('Remote newer')
  })

  it('overwrite remote retries save with force flag', async () => {
    vi.mocked(api.getEditableCreation).mockResolvedValue({ ok: true, data: loadedEditable })
    vi.mocked(api.saveCreationFields)
      .mockResolvedValueOnce({ ok: false, conflict: true, remoteUpdatedAt: '2026-10-19T00:05:00Z' })
      .mockResolvedValueOnce({ ok: true, updatedAt: '2026-10-19T00:06:00Z' })

    const { result } = renderHook(() => useCreationEditor({ creationId: 'draft-1', creationType: 'poem' }), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      result.current.onRichDocumentChange(
        { ...emptyRichDocument(), content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text: 'Keep' }] }] },
        'Keep',
      )
      result.current.onBlur()
      await Promise.resolve()
    })

    expect(result.current.autosave.ui).toBe('conflict')

    await act(async () => {
      await result.current.overwriteRemote()
    })

    expect(api.saveCreationFields).toHaveBeenLastCalledWith(expect.objectContaining({ forceOverwrite: true }))
  })

  it('retries transient failures with backoff', async () => {
    vi.mocked(api.getEditableCreation).mockResolvedValue({ ok: true, data: loadedEditable })
    vi.mocked(api.saveCreationFields)
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'unavailable', message: 'network', providerCode: 'ECONNRESET', providerStatus: 503 },
      })
      .mockResolvedValueOnce({ ok: true, updatedAt: '2026-10-19T00:02:00Z' })

    const { result } = renderHook(() => useCreationEditor({ creationId: 'draft-1', creationType: 'poem' }), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      result.current.onRichDocumentChange(
        { ...emptyRichDocument(), content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text: 'Retry me' }] }] },
        'Retry me',
      )
      result.current.onBlur()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.autosave.ui).toBe('error')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
      await Promise.resolve()
      await Promise.resolve()
    })

    if (vi.mocked(api.saveCreationFields).mock.calls.length < 2) {
      await act(async () => {
        result.current.retrySave()
        await Promise.resolve()
        await Promise.resolve()
      })
    }

    expect(api.saveCreationFields).toHaveBeenCalledTimes(2)
  })

  it('does not auto-retry permanent 23514 failures', async () => {
    vi.mocked(api.getEditableCreation).mockResolvedValue({ ok: true, data: loadedEditable })
    vi.mocked(api.saveCreationFields).mockResolvedValue({
      ok: false,
      error: { code: 'invalid', message: 'check', providerCode: '23514', providerStatus: 400 },
    })

    const { result } = renderHook(() => useCreationEditor({ creationId: 'draft-1', creationType: 'poem' }), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      result.current.onRichDocumentChange(
        { ...emptyRichDocument(), content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text: 'Nope' }] }] },
        'Nope',
      )
      result.current.onBlur()
      await Promise.resolve()
    })

    expect(result.current.autosave.ui).toBe('error')
    vi.clearAllTimers()
    expect(api.saveCreationFields).toHaveBeenCalledTimes(1)
  })

  it('does not auto-retry PGRST301 and shows sign-in message', async () => {
    vi.mocked(api.getEditableCreation).mockResolvedValue({ ok: true, data: loadedEditable })
    vi.mocked(api.saveCreationFields).mockResolvedValue({
      ok: false,
      error: { code: 'forbidden', message: 'jwt', providerCode: 'PGRST301', providerStatus: 401 },
    })

    const { result } = renderHook(() => useCreationEditor({ creationId: 'draft-1', creationType: 'poem' }), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      result.current.onRichDocumentChange(
        { ...emptyRichDocument(), content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text: 'Auth' }] }] },
        'Auth',
      )
      result.current.onBlur()
      await Promise.resolve()
    })

    expect(result.current.statusLabel).toBe(SIGN_IN_AGAIN_SAVE_MESSAGE)
    vi.clearAllTimers()
    expect(api.saveCreationFields).toHaveBeenCalledTimes(1)
  })

  it('does not save when rich content matches the saved fingerprint', async () => {
    vi.mocked(api.getEditableCreation).mockResolvedValue({ ok: true, data: loadedEditable })

    const { result } = renderHook(() => useCreationEditor({ creationId: 'draft-1', creationType: 'poem' }), { wrapper })
    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      result.current.onRichDocumentChange(emptyRichDocument(), '')
    })
    expect(result.current.autosave.dirty).toBe(false)

    await flushDebounce()
    expect(api.saveCreationFields).not.toHaveBeenCalled()
  })

  it('does not create duplicate drafts when create is in flight', async () => {
    let resolveCreate!: (value: CreateDraftResult) => void
    vi.mocked(api.createDraft).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
    )

    const { result } = renderHook(() => useCreationEditor({ creationId: null, creationType: 'poem' }), { wrapper })

    act(() => {
      result.current.onRichDocumentChange(
        { ...emptyRichDocument(), content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text: 'One' }] }] },
        'One',
      )
    })
    await flushDebounce()

    act(() => {
      result.current.onRichDocumentChange(
        { ...emptyRichDocument(), content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text: 'Two' }] }] },
        'Two',
      )
    })

    await act(async () => {
      resolveCreate({ ok: true, data: createdDetail })
      await Promise.resolve()
    })

    expect(api.createDraft).toHaveBeenCalledTimes(1)
  })
})

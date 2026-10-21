import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddToCollectionModal } from './AddToCollectionModal.tsx'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'

vi.mock('../../lib/library/listLibrary.ts', () => ({
  listCollections: vi.fn(async () => ({
    ok: true,
    collections: [{ id: 'col-1', name: 'Favourites', createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
  })),
}))

vi.mock('../../lib/library/collectionsApi.ts', () => ({
  createCollection: vi.fn(),
  addToCollection: vi.fn(),
}))

function renderModal(open = true) {
  const onClose = vi.fn()
  render(
    <ModalStackProvider>
      <AddToCollectionModal open={open} creationId="00000000-0000-0000-0000-000000000001" onClose={onClose} />
    </ModalStackProvider>,
  )
  return { onClose }
}

describe('AddToCollectionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('lists existing collections and adds on pick', async () => {
    const { addToCollection } = await import('../../lib/library/collectionsApi.ts')
    vi.mocked(addToCollection).mockResolvedValueOnce({ ok: true })
    const user = userEvent.setup()
    const { onClose } = renderModal()
    await user.click(await screen.findByRole('button', { name: 'Favourites' }))
    expect(addToCollection).toHaveBeenCalledWith('col-1', '00000000-0000-0000-0000-000000000001')
    expect(onClose).toHaveBeenCalled()
  })

  it('creates a collection and adds the post', async () => {
    const { createCollection, addToCollection } = await import('../../lib/library/collectionsApi.ts')
    vi.mocked(createCollection).mockResolvedValueOnce({ ok: true, id: 'col-new' })
    vi.mocked(addToCollection).mockResolvedValueOnce({ ok: true })
    const user = userEvent.setup()
    renderModal()
    await user.type(screen.getByLabelText(/New collection/i), 'Essays')
    await user.click(screen.getByRole('button', { name: 'Create and add' }))
    expect(createCollection).toHaveBeenCalled()
    expect(addToCollection).toHaveBeenCalledWith('col-new', '00000000-0000-0000-0000-000000000001')
  })

  it('shows validation error for empty name', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: 'Create and add' }))
    expect(await screen.findByText(/Name is required/i)).toBeInTheDocument()
  })

  it('shows API error state', async () => {
    const { addToCollection } = await import('../../lib/library/collectionsApi.ts')
    vi.mocked(addToCollection).mockResolvedValueOnce({
      ok: false,
      error: { code: 'unavailable', message: 'We could not add this to the collection.' },
    })
    const user = userEvent.setup()
    renderModal()
    await user.click(await screen.findByRole('button', { name: 'Favourites' }))
    expect(await screen.findByText(/could not add/i)).toBeInTheDocument()
  })

  it('shows collection limit message from create', async () => {
    const { createCollection } = await import('../../lib/library/collectionsApi.ts')
    vi.mocked(createCollection).mockResolvedValueOnce({
      ok: false,
      error: { code: 'unavailable', message: 'Collection limit reached (50 collections).' },
    })
    const user = userEvent.setup()
    renderModal()
    await user.type(screen.getByLabelText(/New collection/i), 'Shelf')
    await user.click(screen.getByRole('button', { name: 'Create and add' }))
    expect(await screen.findByText(/Collection limit reached/i)).toBeInTheDocument()
  })
})

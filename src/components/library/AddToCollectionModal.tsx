import { useEffect, useId, useState } from 'react'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import { addToCollection, createCollection } from '../../lib/library/collectionsApi.ts'
import { listCollections } from '../../lib/library/listLibrary.ts'
import type { ReaderCollection } from '../../lib/library/types.ts'
import { validateCollectionName } from '../../lib/library/collectionName.ts'

type AddToCollectionModalProps = {
  open: boolean
  creationId: string
  onClose: () => void
}

export function AddToCollectionModal({ open, creationId, onClose }: AddToCollectionModalProps) {
  const nameId = useId()
  const [collections, setCollections] = useState<ReaderCollection[]>([])
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    void listCollections().then((result) => {
      if (result.ok) setCollections(result.collections)
    })
  }, [open])

  async function onCreateAndAdd() {
    const validation = validateCollectionName(newName)
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    const created = await createCollection(newName)
    if (!created.ok) {
      setError(created.error.message)
      setBusy(false)
      return
    }
    const added = await addToCollection(created.id, creationId)
    setBusy(false)
    if (!added.ok) {
      setError(added.error.message)
      return
    }
    onClose()
  }

  async function onPick(collectionId: string) {
    setBusy(true)
    const result = await addToCollection(collectionId, creationId)
    setBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} className="w-full max-w-md rounded-2xl border border-line bg-surface p-4 shadow-lg">
      <h2 className="font-serif text-xl text-ink">Add to collection</h2>
      {error ? <p className="mt-2 text-sm text-coral">{error}</p> : null}
      <ul className="mt-4 flex max-h-60 flex-col gap-2 overflow-y-auto">
        {collections.map((collection) => (
          <li key={collection.id}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onPick(collection.id)}
              className={`flex min-h-11 w-full items-center rounded-xl border border-line bg-raised px-3 text-left text-ink ${focusRing}`}
            >
              {collection.name}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
        <label htmlFor={nameId} className="text-sm font-medium text-ink">
          New collection
        </label>
        <input
          id={nameId}
          value={newName}
          maxLength={60}
          onChange={(e) => setNewName(e.target.value)}
          className={`min-h-11 rounded-xl border border-line bg-bg px-3 text-ink ${focusRing}`}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void onCreateAndAdd()}
          className={`min-h-11 rounded-xl bg-coral px-4 font-semibold text-white ${focusRing}`}
        >
          Create and add
        </button>
      </div>
      <button type="button" onClick={onClose} className={`mt-3 min-h-11 text-sm text-muted ${focusRing}`}>
        Close
      </button>
    </Modal>
  )
}

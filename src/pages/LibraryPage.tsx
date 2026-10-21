import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LibraryItemCard } from '../components/library/LibraryItemCard.tsx'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { ConfirmDialog } from '../components/states/ConfirmDialog.tsx'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import {
  clearReadingHistory,
  listCollectionItems,
  listCollections,
  listContinueReading,
  listLibrarySaved,
  listReadingHistory,
  removeHistoryItem,
  removeSaved,
} from '../lib/library/listLibrary.ts'
import { createCollection, deleteCollection, renameCollection, removeFromCollection } from '../lib/library/collectionsApi.ts'
import { onLibrarySavesChanged } from '../lib/library/saveEvents.ts'
import type { LibraryItem, LibrarySavedCursor, ReaderCollection } from '../lib/library/types.ts'
import { validateCollectionName } from '../lib/library/collectionName.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'
import { LibraryBooksShelf } from '../components/books/LibraryBooksShelf.tsx'
import { listLibraryBooks } from '../lib/books/booksApi.ts'
import type { LibraryBookRow } from '../lib/books/bookSchema.ts'

import { LibraryHighlightsTab } from '../components/library/LibraryHighlightsTab.tsx'
import { getCreationById } from '../lib/creations/api.ts'
import {
  disableOfflineReadingForCreation,
  enableOfflineReadingForWork,
} from '../lib/reader/offlineReadingActions.ts'
import { listOfflinePackages } from '../lib/reader/offlineReadingStore.ts'

const TABS = ['continue', 'saved', 'history', 'highlights', 'collections', 'books', 'purchased'] as const
type LibraryTab = (typeof TABS)[number]

function parseTab(value: string | null): LibraryTab {
  if (value && TABS.includes(value as LibraryTab)) return value as LibraryTab
  return 'continue'
}

export default function LibraryPage() {
  useDocumentTitle('Library')
  const [params, setParams] = useSearchParams()
  const tab = parseTab(params.get('tab'))

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [continueItems, setContinueItems] = useState<LibraryItem[]>([])
  const [savedItems, setSavedItems] = useState<LibraryItem[]>([])
  const [savedCursor, setSavedCursor] = useState<LibrarySavedCursor | null>(null)
  const [historyItems, setHistoryItems] = useState<LibraryItem[]>([])
  const [collections, setCollections] = useState<ReaderCollection[]>([])
  const [activeCollection, setActiveCollection] = useState<string | null>(null)
  const [collectionItems, setCollectionItems] = useState<LibraryItem[]>([])
  const [confirmClearHistory, setConfirmClearHistory] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [collectionError, setCollectionError] = useState<string | null>(null)
  const [offlineIds, setOfflineIds] = useState<Set<string>>(() => new Set())
  const [offlineBusyId, setOfflineBusyId] = useState<string | null>(null)
  const [libraryBooks, setLibraryBooks] = useState<LibraryBookRow[]>([])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [cont, saved, hist, cols, books] = await Promise.all([
      listContinueReading(),
      listLibrarySaved(null),
      listReadingHistory(),
      listCollections(),
      listLibraryBooks(),
    ])
    setLoading(false)
    if (!cont.ok || !saved.ok || !hist.ok || !cols.ok || !books.ok) {
      setError(
        (!cont.ok && cont.error.message) ||
          (!saved.ok && saved.error.message) ||
          (!hist.ok && hist.error.message) ||
          (!cols.ok && cols.error.message) ||
          (!books.ok && books.error.message) ||
          'Library did not load.',
      )
      return
    }
    setContinueItems(cont.items)
    setSavedItems(saved.items)
    setSavedCursor(saved.nextCursor)
    setHistoryItems(hist.items)
    setCollections(cols.collections)
    setLibraryBooks(books.data)
  }, [])

  useEffect(() => {
    void reload()
    void listOfflinePackages().then((pkgs) => setOfflineIds(new Set(pkgs.map((p) => p.creationId))))
    return onLibrarySavesChanged(() => void reload())
  }, [reload])

  useEffect(() => {
    if (!activeCollection) return
    void listCollectionItems(activeCollection).then((result) => {
      if (result.ok) setCollectionItems(result.items)
    })
  }, [activeCollection])

  function setTab(next: LibraryTab) {
    setParams({ tab: next })
    setActiveCollection(null)
  }

  async function loadMoreSaved() {
    if (!savedCursor) return
    const result = await listLibrarySaved(savedCursor)
    if (!result.ok) return
    setSavedItems((prev) => [...prev, ...result.items])
    setSavedCursor(result.nextCursor)
  }

  return (
    <PageContainer variant="wide" className="flex flex-col gap-6 py-6 md:py-8">
      <PageHeader title="Library" />
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Library sections">
        {(
          [
            ['continue', 'Continue reading'],
            ['saved', 'Saved'],
            ['history', 'History'],
            ['highlights', 'Highlights'],
            ['collections', 'Collections'],
            ['books', 'Books'],
            ['purchased', 'Purchased'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium ${
              tab === id ? 'bg-coral font-semibold text-[#1a100a]' : 'border border-line bg-surface text-ink'
            } ${focusRing}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <Skeleton variant="text-lines" lines={4} /> : null}
      {!loading && error ? <ErrorState title="Library did not load" message={error} onRetry={() => void reload()} /> : null}

      {!loading && !error && tab === 'continue' ? (
        continueItems.length === 0 ? (
          <EmptyState title="Nothing in progress" message="Open a long-form post and tap Read to start." />
        ) : (
          <div className="flex flex-col gap-3">
            {continueItems.map((item) => (
              <LibraryItemCard key={item.creationId} item={item} progressLabel={`${item.percent ?? 0}% read`} />
            ))}
          </div>
        )
      ) : null}

      {!loading && !error && tab === 'saved' ? (
        savedItems.length === 0 ? (
          <EmptyState title="Nothing saved yet" message="Save posts from your feed to find them here." />
        ) : (
          <div className="flex flex-col gap-3">
            {savedItems.map((item) => (
              <LibraryItemCard
                key={item.creationId}
                item={item}
                showOfflineToggle
                offlineSaved={offlineIds.has(item.creationId)}
                offlineBusy={offlineBusyId === item.creationId}
                onOfflineToggle={(enabled) => {
                  void (async () => {
                    setOfflineBusyId(item.creationId)
                    if (enabled) {
                      const detail = await getCreationById(item.creationId)
                      if (detail.ok) {
                        const result = await enableOfflineReadingForWork(detail.data, null)
                        if (result.ok) setOfflineIds((prev) => new Set(prev).add(item.creationId))
                      }
                    } else {
                      await disableOfflineReadingForCreation(item.creationId)
                      setOfflineIds((prev) => {
                        const next = new Set(prev)
                        next.delete(item.creationId)
                        return next
                      })
                    }
                    setOfflineBusyId(null)
                  })()
                }}
                onRemove={() =>
                  void removeSaved(item.creationId).then(() => {
                    setOfflineIds((prev) => {
                      const next = new Set(prev)
                      next.delete(item.creationId)
                      return next
                    })
                    return reload()
                  })
                }
              />
            ))}
            {savedCursor ? (
              <button type="button" onClick={() => void loadMoreSaved()} className={`min-h-11 text-sm font-medium text-coral ${focusRing}`}>
                Load more
              </button>
            ) : null}
          </div>
        )
      ) : null}

      {!loading && !error && tab === 'history' ? (
        <>
          {historyItems.length === 0 ? (
            <EmptyState title="No reading history" message="Works you read will appear here." />
          ) : (
            <div className="flex flex-col gap-3">
              {historyItems.map((item) => (
                <LibraryItemCard
                  key={item.creationId}
                  item={item}
                  progressLabel={item.completed ? 'Finished' : `${item.percent ?? 0}% read`}
                  onRemove={() => void removeHistoryItem(item.creationId).then(() => reload())}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setConfirmClearHistory(true)}
            className={`min-h-11 text-sm font-medium text-coral ${focusRing}`}
          >
            Clear history
          </button>
          <ConfirmDialog
            open={confirmClearHistory}
            title="Clear reading history?"
            message="This removes your reading progress for all posts. It cannot be undone."
            confirmLabel="Clear history"
            onConfirm={() => {
              setConfirmClearHistory(false)
              void clearReadingHistory().then(() => reload())
            }}
            onCancel={() => setConfirmClearHistory(false)}
          />
        </>
      ) : null}

      {!loading && !error && tab === 'highlights' ? <LibraryHighlightsTab /> : null}

      {!loading && !error && tab === 'collections' ? (
        activeCollection ? (
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => setActiveCollection(null)} className={`min-h-11 text-left text-sm text-coral ${focusRing}`}>
              ← All collections
            </button>
            {collectionItems.length === 0 ? (
              <EmptyState title="Collection is empty" message="Add saved posts from a post page." />
            ) : (
              collectionItems.map((item) => (
                <LibraryItemCard
                  key={item.creationId}
                  item={item}
                  onRemove={() =>
                    void removeFromCollection(activeCollection, item.creationId).then(() =>
                      listCollectionItems(activeCollection).then((r) => r.ok && setCollectionItems(r.items)),
                    )
                  }
                />
              ))
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newCollectionName}
                maxLength={60}
                placeholder="New collection name"
                onChange={(e) => setNewCollectionName(e.target.value)}
                className={`min-h-11 flex-1 rounded-xl border border-line bg-surface px-3 ${focusRing}`}
              />
              <button
                type="button"
                onClick={() => {
                  const err = validateCollectionName(newCollectionName)
                  if (err) {
                    setCollectionError(err)
                    return
                  }
                  void createCollection(newCollectionName).then((result) => {
                    if (!result.ok) setCollectionError(result.error.message)
                    else {
                      setNewCollectionName('')
                      setCollectionError(null)
                      void reload()
                    }
                  })
                }}
                className={`min-h-11 rounded-xl bg-coral px-4 font-semibold text-[#1a100a] ${focusRing}`}
              >
                Create
              </button>
            </div>
            {collectionError ? <p className="text-sm text-coral">{collectionError}</p> : null}
            {collections.length === 0 ? (
              <EmptyState title="No collections yet" message="Create a collection to organise saved posts." />
            ) : (
              collections.map((collection) => (
                <article key={collection.id} className="rounded-2xl border border-line bg-surface p-4">
                  <button
                    type="button"
                    onClick={() => setActiveCollection(collection.id)}
                    className={`min-h-11 w-full text-left font-medium text-ink ${focusRing}`}
                  >
                    {collection.name}
                  </button>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`min-h-11 rounded-lg px-3 text-sm text-muted ${focusRing}`}
                      onClick={() => {
                        const name = window.prompt('Rename collection', collection.name)
                        if (!name) return
                        void renameCollection(collection.id, name).then(() => reload())
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className={`min-h-11 rounded-lg px-3 text-sm text-coral ${focusRing}`}
                      onClick={() => void deleteCollection(collection.id).then(() => reload())}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )
      ) : null}

      {!loading && !error && tab === 'books' ? (
        libraryBooks.length === 0 ? (
          <EmptyState title="No books yet" message="Free books you add and purchases will show up here." />
        ) : (
          <LibraryBooksShelf books={libraryBooks} />
        )
      ) : null}

      {!loading && !error && tab === 'purchased' ? (
        <EmptyState
          title="Everything you buy will appear here"
          message="Browse Discover to find writers and work to support."
          action={
            <Link to="/discover" className={`inline-flex min-h-11 items-center font-medium text-coral ${focusRing}`}>
              Go to Discover
            </Link>
          }
        />
      ) : null}
    </PageContainer>
  )
}

import { useEffect, useId, useState } from 'react'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import { searchDmSharePosts } from '../../lib/messages/api.ts'
import type { DmSharePostHit } from '../../lib/messages/types.ts'

type SharePostPickerProps = {
  open: boolean
  onClose: () => void
  onSelect: (post: DmSharePostHit) => void
}

export function SharePostPicker({ open, onClose, onSelect }: SharePostPickerProps) {
  const titleId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DmSharePostHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setError(null)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      void searchDmSharePosts(query).then((result) => {
        if (cancelled) return
        setLoading(false)
        if (!result.ok) {
          setError(result.error.message)
          setResults([])
          return
        }
        setResults(result.data)
      })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, query])

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      className="flex max-h-[85dvh] w-full max-w-[32rem] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lg"
    >
      <header className="border-b border-line px-4 py-3">
        <h2 id={titleId} className="text-lg font-semibold text-ink">Share a post</h2>
        <p className="mt-1 text-sm text-muted">Search posts you can share in this conversation.</p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <label htmlFor="share-post-search" className="sr-only">Search posts</label>
        <input
          id="share-post-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search posts"
          data-testid="share-post-search"
          className={`min-h-11 w-full rounded-2xl border border-line bg-bg px-3 text-base ${focusRing}`}
        />
        {loading ? <p className="text-sm text-muted">Searching…</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-coral">{error}</p>
        ) : null}
        <ul className="min-h-0 flex-1 overflow-y-auto" data-testid="share-post-results">
          {!loading && results.length === 0 ? (
            <li className="text-sm text-muted">No posts found.</li>
          ) : (
            results.map((post) => {
              const label = post.title?.trim() || post.caption?.trim() || 'Untitled post'
              return (
                <li key={post.id} className="border-b border-line last:border-0">
                  <button
                    type="button"
                    data-testid="share-post-option"
                    onClick={() => {
                      onSelect(post)
                      onClose()
                    }}
                    className={`flex min-h-11 w-full flex-col items-start gap-0.5 px-1 py-2 text-left ${focusRing}`}
                  >
                    <span className="font-medium text-ink">{label}</span>
                    <span className="text-sm text-muted">@{post.authorUsername}</span>
                    {post.excerpt ? (
                      <span className="line-clamp-2 text-sm text-muted">{post.excerpt}</span>
                    ) : null}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </Modal>
  )
}

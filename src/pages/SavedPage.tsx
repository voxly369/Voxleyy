import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PostCard } from '../components/feed/PostCard.tsx'
import { CommentsSheet } from '../components/engagement/CommentsSheet.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { listSaved, type SavedCursor } from '../lib/engagement/listSaved.ts'
import type { FeedPost } from '../lib/feed/types.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function SavedPage() {
  useDocumentTitle('Saved')
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [_cursor, setCursor] = useState<SavedCursor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commentsPost, setCommentsPost] = useState<FeedPost | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      const result = await listSaved(null)
      if (!active) return
      setLoading(false)
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setError(null)
      setPosts(result.data.posts)
      setCursor(result.data.nextCursor)
    })()
    return () => {
      active = false
    }
  }, [attempt])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-8">
      <PageHeader title="Saved" />
      <Link to="/library" className="text-sm text-coral">
        Back to Library
      </Link>
      {loading ? (
        <Skeleton />
      ) : error ? (
        <ErrorState title="Saved did not load" message={error} onRetry={() => setAttempt((n) => n + 1)} />
      ) : posts.length === 0 ? (
        <EmptyState title="Nothing saved yet" message="Save posts from your feed to find them here." />
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onCommentClick={setCommentsPost}
              onPostUpdate={(postId, patch) =>
                setPosts((prev) => prev.map((item) => (item.id === postId ? { ...item, ...patch } : item)))
              }
            />
          ))}
        </div>
      )}
      {commentsPost ? (
        <CommentsSheet open creationId={commentsPost.id} onClose={() => setCommentsPost(null)} />
      ) : null}
    </div>
  )
}

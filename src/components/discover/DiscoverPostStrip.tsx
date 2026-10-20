import { PostCard } from '../feed/PostCard.tsx'
import type { FeedPost } from '../../lib/feed/types.ts'

type DiscoverPostStripProps = {
  posts: FeedPost[]
  onPostUpdate: (postId: string, patch: Partial<FeedPost>) => void
  layout?: 'scroll' | 'grid'
}

export function DiscoverPostStrip({ posts, onPostUpdate, layout = 'scroll' }: DiscoverPostStripProps) {
  if (posts.length === 0) return null
  if (layout === 'grid') {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onCommentClick={() => undefined} onPostUpdate={onPostUpdate} />
        ))}
      </div>
    )
  }
  return (
    <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0">
      {posts.map((post) => (
        <div key={post.id} className="w-[min(100%,22rem)] shrink-0">
          <PostCard post={post} onCommentClick={() => undefined} onPostUpdate={onPostUpdate} />
        </div>
      ))}
    </div>
  )
}

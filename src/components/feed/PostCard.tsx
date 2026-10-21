import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CoverFrame } from '../creations/CoverFrame.tsx'
import { LiteraryBodyView } from '../creations/LiteraryBodyView.tsx'
import { bodyExcerpt } from '../../lib/creations/excerpt.ts'
import { literaryPreviewExcerpt } from '../../lib/creations/literaryDisplay.ts'
import { quoteStyleFromJson } from '../../lib/creations/bodyDocument.ts'
import { QuoteCardView } from '../creations/QuoteCardView.tsx'
import { creationTypeLabel } from '../../lib/creations/creationTypeLabel.ts'
import type { FeedPost } from '../../lib/feed/types.ts'
import { VerifiedBadge } from '../profile/VerifiedBadge.tsx'
import { EngagementBar } from '../engagement/EngagementBar.tsx'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'
import { focusRing } from '../shell/navItems.ts'
import { toggleLike } from '../../lib/engagement/toggleLike.ts'
import { tagPagePath } from '../../lib/discover/tagLink.ts'

type PostCardProps = {
  post: FeedPost
  onCommentClick: (post: FeedPost) => void
  onPostUpdate: (postId: string, patch: Partial<FeedPost>) => void
}

export function PostCard({ post, onCommentClick, onPostUpdate }: PostCardProps) {
  const lastTap = useRef(0)
  const [pulseLike, setPulseLike] = useState(false)

  async function doubleTapLike() {
    if (post.likedByViewer) return
    setPulseLike(true)
    window.setTimeout(() => setPulseLike(false), 200)
    const result = await toggleLike(post.id, false)
    if (result.ok && result.liked) {
      onPostUpdate(post.id, {
        likedByViewer: true,
        likeCount: post.likeCount + Math.max(0, result.likeCountDelta),
      })
    }
  }

  function onCardClick() {
    const now = Date.now()
    if (now - lastTap.current < 320) {
      void doubleTapLike()
    }
    lastTap.current = now
  }

  const previewSource = post.bodyExcerpt ?? ''
  const { excerpt, truncated: excerptTruncated } = bodyExcerpt(previewSource)
  const isQuote = post.type === 'quote_card'
  const isPoem = post.type === 'poem' || post.type === 'lyric' || post.type === 'script'
  const poemPreview = isPoem ? literaryPreviewExcerpt(null, previewSource, 8) : null
  const showReadMore =
    post.bodyTruncated || excerptTruncated || (poemPreview?.truncated ?? false)
  const quoteText = (previewSource || post.caption || post.title || '').trim() || 'Quote'

  return (
    <article className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <header className="mb-3 flex items-center gap-3">
        <Link to={`/u/${post.author.username}`} className={`inline-flex min-h-11 min-w-11 items-center justify-center ${focusRing}`}>
          <ImageWithFallback
            src={post.author.avatarUrl ?? undefined}
            alt=""
            label={post.author.displayName.charAt(0) || post.author.username.charAt(0)}
            className="size-11 rounded-full"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to={`/u/${post.author.username}`}
            className={`inline-flex min-h-11 max-w-full items-center gap-1 font-medium text-ink ${focusRing}`}
          >
            <span className="truncate">{post.author.displayName || post.author.username}</span>
            {post.author.verified ? <VerifiedBadge /> : null}
          </Link>
          <Link
            to={`/u/${post.author.username}`}
            className={`inline-flex min-h-11 items-center text-sm text-muted ${focusRing}`}
          >
            @{post.author.username}
          </Link>
        </div>
        <span className="text-xs uppercase tracking-wide text-muted">{creationTypeLabel(post.type)}</span>
      </header>

      <Link
        to={`/c/${post.id}`}
        onClick={onCardClick}
        className={`block ${pulseLike ? 'motion-safe:scale-[0.99] motion-reduce:scale-100' : ''} ${focusRing}`}
      >
        {isQuote ? (
          <>
            <QuoteCardView text={quoteText} style={quoteStyleFromJson(null)} handle={post.author.username} />
            {showReadMore ? <span className="mt-2 block text-base text-coral">Read more</span> : null}
          </>
        ) : (
          <>
            {post.coverUrl ? <CoverFrame src={post.coverUrl} className="mb-3" /> : null}
            {post.title?.trim() ? <h2 className="font-serif text-xl text-ink">{post.title.trim()}</h2> : null}
            {post.caption?.trim() ? <p className="mt-1 text-sm text-muted">{post.caption.trim()}</p> : null}
            {isPoem && poemPreview ? (
              <div className="mt-1 flex flex-col gap-1">
                <LiteraryBodyView lines={poemPreview.lines} className="text-base" />
                {showReadMore ? <span className="text-coral">Read more</span> : null}
              </div>
            ) : excerpt ? (
              <p className="mt-3 text-base text-ink">
                {excerpt}
                {showReadMore ? <span className="text-coral"> Read more</span> : null}
              </p>
            ) : null}
          </>
        )}
      </Link>

      {post.tags.length > 0 ? (
        <p className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
          {post.tags.map((tag) => (
            <Link
              key={tag}
              to={tagPagePath(tag)}
              className={`rounded-full bg-bg px-2 py-1 ${focusRing}`}
            >
              #{tag}
            </Link>
          ))}
        </p>
      ) : null}

      <div className="mt-3">
        <EngagementBar
          creationId={post.id}
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          saveCount={post.saveCount}
          liked={post.likedByViewer}
          saved={post.savedByViewer}
          onCommentClick={() => onCommentClick(post)}
          onCountsChange={(patch) => onPostUpdate(post.id, patch)}
        />
      </div>
    </article>
  )
}

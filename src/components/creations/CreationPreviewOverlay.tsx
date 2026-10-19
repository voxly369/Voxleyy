import { useId } from 'react'
import { quoteStyleFromJson } from '../../lib/creations/bodyDocument.ts'
import type { CreationType } from '../../lib/creations/creationTypes.ts'
import type { Json } from '../../lib/database.types.ts'
import { PostCard } from '../feed/PostCard.tsx'
import type { FeedPost } from '../../lib/feed/types.ts'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import { QuoteCardView } from './QuoteCardView.tsx'
import { RichTextView } from './RichTextView.tsx'

type CreationPreviewOverlayProps = {
  open: boolean
  onClose: () => void
  creationType: CreationType
  title: string
  caption: string
  body: string
  bodyJson: Json
  coverUrl: string | null
  tags: string[]
  author: { username: string; displayName: string; avatarUrl: string | null; verified: boolean }
}

export function CreationPreviewOverlay({
  open,
  onClose,
  creationType,
  title,
  caption,
  body,
  bodyJson,
  coverUrl,
  tags,
  author,
}: CreationPreviewOverlayProps) {
  const titleId = useId()

  const previewPost: FeedPost = {
    id: 'preview',
    type: creationType,
    title: title.trim() || null,
    caption: caption.trim() || null,
    status: 'draft',
    audience: 'private',
    coverUrl,
    createdAt: '1970-01-01T00:00:00.000Z',
    bodyExcerpt: body,
    bodyTruncated: false,
    publishedAt: '1970-01-01T00:00:00.000Z',
    likeCount: 0,
    commentCount: 0,
    saveCount: 0,
    tags,
    likedByViewer: false,
    savedByViewer: false,
    author: { id: 'preview', ...author },
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      hideBackdrop
      labelledBy={titleId}
      containerClassName="fixed inset-0 flex flex-col p-0"
      className="flex h-full w-full flex-col bg-bg outline-none"
    >
      <header className="flex items-center gap-3 border-b border-line px-5 py-4">
        <button type="button" onClick={onClose} className={`min-h-11 rounded-2xl px-3 font-medium ${focusRing}`}>
          Back
        </button>
        <h2 id={titleId} className="font-serif text-xl text-ink">
          Preview
        </h2>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <p className="mb-4 text-sm text-muted">This is how readers will see your work when it is published.</p>
        <PostCard post={previewPost} onCommentClick={() => undefined} onPostUpdate={() => undefined} />
        {creationType === 'quote_card' ? (
          <div className="mt-6">
            <QuoteCardView text={body} style={quoteStyleFromJson(bodyJson)} handle={author.username} />
          </div>
        ) : (
          <RichTextView bodyJson={bodyJson} bodyText={body} creationType={creationType} className="mt-6" />
        )}
      </div>
    </Modal>
  )
}

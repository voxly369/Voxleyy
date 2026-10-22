import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ConversationList } from '../components/messages/ConversationList.tsx'
import { DmWriterSearch } from '../components/messages/DmWriterSearch.tsx'
import { ConversationThread } from '../components/messages/ConversationThread.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { useMessages } from '../lib/messages/useMessages.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function MessagesPage() {
  useDocumentTitle('Messages')
  const { conversationId } = useParams()
  const [searchParams] = useSearchParams()
  const shareCreationId = searchParams.get('share')
  const {
    conversations,
    conversationsLoading,
    conversationsError,
    hasMoreConversations,
    loadMoreConversations,
    refresh,
  } = useMessages()
  const [search, setSearch] = useState('')

  const activeConversation = useMemo(
    () => conversations.find((row) => row.conversationId === conversationId) ?? null,
    [conversations, conversationId],
  )

  const showThreadMobile = Boolean(conversationId)
  const showListMobile = !conversationId

  return (
    <div
      className="mx-auto flex min-h-[calc(100dvh-var(--nav-h)-2rem)] w-full max-w-none flex-col py-4 md:min-h-[calc(100dvh-2rem)] md:py-6"
      data-testid="messages-page"
      style={{ maxWidth: 'calc(100vw - var(--rail-width))' }}
    >
      <div className="px-4 md:px-6">
        <PageHeader title="Messages" />
        {!conversationId ? (
          <p className="mt-2 text-sm text-muted">
            <Link to="/discover/search" className={`text-coral underline ${focusRing}`}>
              Find writers
            </Link>{' '}
            to start a conversation.
          </p>
        ) : null}
      </div>
      <div className="mt-4 flex min-h-0 flex-1 border-t border-line md:mx-4 md:rounded-2xl md:border md:bg-surface">
        <aside
          className={`${showListMobile ? 'flex' : 'hidden'} min-h-0 w-full flex-col md:flex md:w-80 md:shrink-0 md:border-r md:border-line`}
          data-testid="messages-list-pane"
        >
          <DmWriterSearch />
          <ConversationList
            rows={conversations}
            activeId={conversationId ?? null}
            search={search}
            onSearchChange={setSearch}
            loading={conversationsLoading}
            error={conversationsError}
            hasMore={hasMoreConversations}
            onLoadMore={() => void loadMoreConversations()}
          />
        </aside>
        <section
          className={`${showThreadMobile ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-1 flex-col md:flex`}
          data-testid="messages-thread-pane"
        >
          {conversationId ? (
            <ConversationThread
              conversation={activeConversation}
              conversationId={conversationId}
              showBackLink
              sharedCreationId={shareCreationId}
              onSent={() => void refresh()}
            />
          ) : (
            <div className="hidden flex-1 items-center justify-center p-6 md:flex">
              <EmptyState title="Select a conversation" message="Choose a thread from the list or message a writer from their profile." />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

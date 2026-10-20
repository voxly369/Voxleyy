import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EngagementBar } from './EngagementBar.tsx'

vi.mock('../../lib/engagement/toggleLike.ts', () => ({ toggleLike: vi.fn() }))
vi.mock('../../lib/engagement/toggleSave.ts', () => ({ toggleSave: vi.fn() }))

describe('EngagementBar', () => {
  it('shows singular count labels', () => {
    render(
      <EngagementBar
        creationId="c1"
        likeCount={1}
        commentCount={1}
        saveCount={1}
        liked={false}
        saved={false}
        onCommentClick={() => {}}
      />,
    )
    expect(screen.getByText('1 like')).toBeInTheDocument()
    expect(screen.getByText('1 comment')).toBeInTheDocument()
    expect(screen.getByText('1 save')).toBeInTheDocument()
  })
})

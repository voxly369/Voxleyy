import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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

  it('keeps all three stats on one row at 375px width', () => {
    const { container } = render(
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
    const row = container.firstElementChild as HTMLElement
    expect(row.className).toMatch(/flex-nowrap/)
    const scoped = within(row)
    expect(scoped.getByText('1 like')).toBeInTheDocument()
    expect(scoped.getByText('1 comment')).toBeInTheDocument()
    expect(scoped.getByText('1 save')).toBeInTheDocument()
  })
})

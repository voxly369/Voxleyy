import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FeedSwitcher } from './FeedSwitcher.tsx'

describe('FeedSwitcher', () => {
  afterEach(() => {
    cleanup()
  })

  it('hides the For You tab while SHOW_FOR_YOU_FEED_TAB is false', () => {
    render(<FeedSwitcher active="home" onChange={() => {}} />)
    expect(screen.queryByRole('tab', { name: /For You/i })).toBeNull()
    expect(screen.getByRole('tab', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Following' })).toBeInTheDocument()
  })
})

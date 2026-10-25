import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DiscoverWriterCard } from './DiscoverWriterCard.tsx'

vi.mock('./DiscoverFollowButton.tsx', () => ({
  DiscoverFollowButton: () => (
    <button type="button" className="min-h-11">
      Follow
    </button>
  ),
}))

const writer = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'readerone',
  displayName: 'Reader One',
  avatarUrl: null,
  verified: false,
  country: 'ZA',
}

function renderCard(variant: 'featured' | 'rising') {
  return render(
    <MemoryRouter>
      <DiscoverWriterCard writer={writer} variant={variant} />
    </MemoryRouter>,
  )
}

function assertTouchClasses(link: HTMLElement) {
  expect(link.className).toMatch(/\bmin-h-11\b/)
  expect(link.className).toMatch(/\bmin-w-11\b/)
}

describe('DiscoverWriterCard touch targets', () => {
  afterEach(() => cleanup())
  it('every link in featured card meets minimum touch classes', () => {
    renderCard('featured')
    const card = screen.getByTestId('discover-writer-card')
    const links = card.querySelectorAll('a')
    expect(links.length).toBeGreaterThanOrEqual(2)
    links.forEach((link) => assertTouchClasses(link as HTMLElement))
  })

  it('every link in rising card meets minimum touch classes', () => {
    renderCard('rising')
    const card = screen.getByTestId('discover-writer-card')
    const links = card.querySelectorAll('a')
    expect(links.length).toBeGreaterThanOrEqual(2)
    links.forEach((link) => assertTouchClasses(link as HTMLElement))
  })

  it('does not nest links inside profile links', () => {
    renderCard('featured')
    const profileLinks = screen.getAllByTestId('discover-writer-profile-link')
    for (const profile of profileLinks) {
      expect(profile.querySelector('a')).toBeNull()
    }
  })
})

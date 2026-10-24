import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProfileAnalyticsTab } from './ProfileAnalyticsTab.tsx'

describe('ProfileAnalyticsTab', () => {
  afterEach(() => cleanup())

  it('shows empty state', () => {
    render(<ProfileAnalyticsTab data={null} loading={false} error={null} />)
    expect(screen.getByText(/No analytics yet/i)).toBeInTheDocument()
  })

  it('shows last-7 views aligned with dashboard-style totals', () => {
    render(
      <MemoryRouter>
        <ProfileAnalyticsTab
          loading={false}
          error={null}
          data={{
            last7: { views: 40, likes: 10, saves: 2, comments: 4, followers: 3 },
            last30: { views: 40, likes: 10, saves: 2, comments: 4, followers: 3 },
            bestPiece: null,
          }}
        />
      </MemoryRouter>,
    )
    const table = screen.getByTestId('analytics-table')
    expect(table).toHaveTextContent('40')
    expect(table).toHaveTextContent('Views')
  })

  it('shows chart and table when populated', () => {
    render(
      <MemoryRouter>
      <ProfileAnalyticsTab
        loading={false}
        error={null}
        data={{
          last7: { views: 4, likes: 2, saves: 1, comments: 0, followers: 1 },
          last30: { views: 20, likes: 8, saves: 3, comments: 2, followers: 4 },
          bestPiece: { id: 'c1', title: 'Best', views: 10, likes: 5 },
          daily: [{ date: '2026-03-01', views: 4, likes: 2 }],
        }}
      />
      </MemoryRouter>,
    )
    expect(screen.getAllByTestId('analytics-chart')[0]).toBeInTheDocument()
    expect(screen.getByTestId('analytics-table')).toBeInTheDocument()
    expect(screen.getByText('Best piece')).toBeInTheDocument()
  })
})

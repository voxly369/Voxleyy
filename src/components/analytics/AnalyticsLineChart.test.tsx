import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnalyticsLineChart } from './AnalyticsLineChart.tsx'
import { AnalyticsBarChart } from './AnalyticsBarChart.tsx'

describe('AnalyticsLineChart', () => {
  it('renders populated series with accessible summary', () => {
    render(
      <AnalyticsLineChart
        label="Signups"
        points={[
          { day: '2026-01-01', value: 2 },
          { day: '2026-01-02', value: 4 },
        ]}
        testId="chart-signups"
      />,
    )
    const chart = screen.getByTestId('chart-signups')
    expect(chart.querySelector('polyline')).not.toBeNull()
    expect(chart).toHaveTextContent('Signups')
  })

  it('renders empty state without polyline', () => {
    render(<AnalyticsLineChart label="Signups" points={[]} testId="chart-empty" />)
    expect(screen.getByTestId('chart-empty').querySelector('polyline')).toBeNull()
  })
})

describe('AnalyticsBarChart', () => {
  it('renders populated bars', () => {
    render(
      <AnalyticsBarChart
        label="By country"
        raw={[
          { label: 'ZA', value: 3 },
          { label: 'GB', value: 1 },
        ]}
        testId="chart-bars"
      />,
    )
    expect(screen.getByTestId('chart-bars')).toHaveTextContent('ZA')
  })

  it('renders empty chart without bars', () => {
    render(<AnalyticsBarChart label="By country" raw={[]} testId="chart-bars-empty" />)
    expect(screen.getByTestId('chart-bars-empty').querySelector('rect')).toBeNull()
  })
})

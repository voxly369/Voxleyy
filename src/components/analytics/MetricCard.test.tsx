import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricCard } from './MetricCard.tsx'
import { AvailableWhenCard } from './AvailableWhenCard.tsx'

describe('MetricCard', () => {
  it('renders label and value', () => {
    render(<MetricCard label="Users" value={42} testId="metric-users" />)
    expect(screen.getByTestId('metric-users')).toHaveTextContent('Users')
    expect(screen.getByTestId('metric-users')).toHaveTextContent('42')
  })
})

describe('AvailableWhenCard', () => {
  it('shows available when label', () => {
    render(
      <AvailableWhenCard
        title="Revenue"
        whenLabel="Available when selling launches"
        bullets={['No placeholder revenue']}
        testId="revenue-card"
      />,
    )
    expect(screen.getByTestId('revenue-card')).toHaveTextContent('Available when selling launches')
  })
})

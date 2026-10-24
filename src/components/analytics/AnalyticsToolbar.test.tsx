import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnalyticsToolbar } from './AnalyticsToolbar.tsx'
import { rangeFromPreset } from '../../lib/analytics/dateRange.ts'

describe('AnalyticsToolbar', () => {
  afterEach(() => cleanup())

  it('shows Refresh now and Export CSV and calls handlers', async () => {
    const onRefresh = vi.fn()
    const onExport = vi.fn()
    render(
      <AnalyticsToolbar
        range={rangeFromPreset('30')}
        country=""
        role=""
        onRangeChange={() => {}}
        onCountryChange={() => {}}
        onRoleChange={() => {}}
        onRefresh={onRefresh}
        onExport={onExport}
      />,
    )
    await userEvent.click(screen.getByTestId('analytics-refresh'))
    await userEvent.click(screen.getByTestId('analytics-export'))
    expect(onRefresh).toHaveBeenCalled()
    expect(onExport).toHaveBeenCalled()
  })

  it('shows busy labels when refresh and export are in flight', () => {
    render(
      <AnalyticsToolbar
        range={rangeFromPreset('7')}
        country=""
        role=""
        onRangeChange={() => {}}
        onCountryChange={() => {}}
        onRoleChange={() => {}}
        onRefresh={() => {}}
        onExport={() => {}}
        refreshBusy
        exportBusy
      />,
    )
    expect(screen.getByTestId('analytics-refresh')).toHaveTextContent('Refreshing…')
    expect(screen.getByTestId('analytics-export')).toHaveTextContent('Exporting…')
  })

  it('shows filter validation error', () => {
    render(
      <AnalyticsToolbar
        range={rangeFromPreset('30')}
        country="BAD"
        role=""
        onRangeChange={() => {}}
        onCountryChange={() => {}}
        onRoleChange={() => {}}
        filterError="Country must be a two-letter code."
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Country must be a two-letter code.')
  })
})

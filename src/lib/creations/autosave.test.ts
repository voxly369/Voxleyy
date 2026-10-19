import { describe, expect, it } from 'vitest'
import {
  autosaveReducer,
  initialAutosaveModel,
  retryDelayMs,
  shouldBlockNavigation,
  shouldRunQueuedSave,
} from './autosave.ts'

describe('autosave state machine', () => {
  it('marks dirty on edit and schedules via debounce event', () => {
    const edited = autosaveReducer(initialAutosaveModel, { type: 'edit' })
    expect(edited.dirty).toBe(true)
    const saving = autosaveReducer(edited, { type: 'debounce_elapsed' })
    expect(saving.ui).toBe('saving')
    expect(saving.saveInFlight).toBe(true)
  })

  it('queues another save while one is in flight', () => {
    const inFlight = { ...initialAutosaveModel, saveInFlight: true, dirty: true }
    const queued = autosaveReducer(inFlight, { type: 'edit' })
    expect(queued.queued).toBe(true)
    expect(shouldRunQueuedSave({ ...queued, saveInFlight: false })).toBe(true)
  })

  it('handles conflict and resolution paths', () => {
    const conflict = autosaveReducer(initialAutosaveModel, {
      type: 'save_conflict',
      remoteUpdatedAt: '2026-10-18T12:00:00Z',
    })
    expect(conflict.ui).toBe('conflict')
    const overwrite = autosaveReducer(conflict, { type: 'resolve_overwrite' })
    expect(overwrite.ui).toBe('saving')
  })

  it('blocks navigation when dirty or saving', () => {
    expect(shouldBlockNavigation(initialAutosaveModel)).toBe(false)
    expect(shouldBlockNavigation(autosaveReducer(initialAutosaveModel, { type: 'edit' }))).toBe(true)
  })

  it('backs off retries', () => {
    expect(retryDelayMs(1)).toBe(500)
    expect(retryDelayMs(4)).toBeGreaterThan(2000)
  })
})

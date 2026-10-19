import { describe, expect, it } from 'vitest'
import {
  autosaveReducer,
  autosaveStatusLabel,
  initialAutosaveModel,
  MAX_AUTO_RETRIES,
  retryDelayMs,
  shouldAutoRetry,
  shouldBlockNavigation,
  shouldRunQueuedSave,
} from './autosave.ts'

describe('autosave state machine', () => {
  it('marks dirty on edit and schedules via debounce event', () => {
    const edited = autosaveReducer(initialAutosaveModel, { type: 'edit' })
    expect(edited.dirty).toBe(true)
    expect(edited.editVersion).toBe(1)
    const saving = autosaveReducer(edited, { type: 'debounce_elapsed' })
    expect(saving.ui).toBe('saving')
    expect(saving.saveInFlight).toBe(true)
    expect(saving.savingVersion).toBe(1)
  })

  it('stays dirty and queues save when edits happen during an in-flight save', () => {
    let model = autosaveReducer(initialAutosaveModel, { type: 'edit' })
    model = autosaveReducer(model, { type: 'debounce_elapsed' })
    model = autosaveReducer(model, { type: 'edit' })
    expect(model.editVersion).toBe(2)
    expect(model.queued).toBe(true)
    model = autosaveReducer(model, {
      type: 'save_success',
      savedAt: '2026-10-19T00:00:00Z',
    })
    expect(model.dirty).toBe(true)
    expect(model.queued).toBe(true)
    expect(model.saveInFlight).toBe(false)
    expect(autosaveStatusLabel(model)).toBe('Unsaved changes')
  })

  it('cleans up when no edits happen during save', () => {
    let model = autosaveReducer(initialAutosaveModel, { type: 'edit' })
    model = autosaveReducer(model, { type: 'debounce_elapsed' })
    model = autosaveReducer(model, {
      type: 'save_success',
      savedAt: '2026-10-19T00:00:00Z',
    })
    expect(model.dirty).toBe(false)
    expect(model.ui).toBe('saved')
    expect(autosaveStatusLabel(model)).toMatch(/Saved at/)
  })

  it('handles several edits during one save', () => {
    let model = autosaveReducer(initialAutosaveModel, { type: 'edit' })
    model = autosaveReducer(model, { type: 'debounce_elapsed' })
    model = autosaveReducer(model, { type: 'edit' })
    model = autosaveReducer(model, { type: 'edit' })
    expect(model.editVersion).toBe(3)
    model = autosaveReducer(model, { type: 'save_success', savedAt: '2026-10-19T00:00:00Z' })
    expect(model.dirty).toBe(true)
    expect(shouldRunQueuedSave(model)).toBe(true)
  })

  it('queues another save while one is in flight', () => {
    const inFlight = { ...initialAutosaveModel, saveInFlight: true, dirty: true, editVersion: 1 }
    const queued = autosaveReducer(inFlight, { type: 'edit' })
    expect(queued.queued).toBe(true)
    expect(shouldRunQueuedSave({ ...queued, saveInFlight: false })).toBe(true)
  })

  it('blocks navigation when dirty or saving', () => {
    expect(shouldBlockNavigation(initialAutosaveModel)).toBe(false)
    expect(shouldBlockNavigation(autosaveReducer(initialAutosaveModel, { type: 'edit' }))).toBe(true)
  })

  it('backs off retries and caps automatic retries', () => {
    expect(retryDelayMs(1)).toBe(500)
    expect(MAX_AUTO_RETRIES).toBe(5)
    const exhausted = { ...initialAutosaveModel, ui: 'error' as const, retryCount: MAX_AUTO_RETRIES }
    expect(shouldAutoRetry(exhausted)).toBe(false)
  })

  it('keeps permanent errors visible without auto retry', () => {
    const errored = autosaveReducer(initialAutosaveModel, { type: 'save_permanent_error' })
    expect(errored.ui).toBe('error')
    expect(shouldAutoRetry(errored)).toBe(false)
    expect(autosaveStatusLabel(errored)).toBe('Not saved. Retry')
  })

  it('clears dirty when reverting to the saved fingerprint', () => {
    let model = autosaveReducer(initialAutosaveModel, { type: 'edit' })
    model = autosaveReducer(model, { type: 'revert_to_clean' })
    expect(model.dirty).toBe(false)
  })
})

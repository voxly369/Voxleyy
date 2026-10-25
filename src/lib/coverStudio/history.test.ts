import { describe, expect, it } from 'vitest'
import {
  historyCanRedo,
  historyCanUndo,
  historyInit,
  historyPush,
  historyRedo,
  historyUndo,
} from './history.ts'

describe('history', () => {
  it('undo and redo traverse states', () => {
    let state = historyInit(0)
    state = historyPush(state, 1)
    state = historyPush(state, 2)
    expect(state.present).toBe(2)
    expect(historyCanUndo(state)).toBe(true)
    state = historyUndo(state)
    expect(state.present).toBe(1)
    expect(historyCanRedo(state)).toBe(true)
    state = historyRedo(state)
    expect(state.present).toBe(2)
  })

  it('push clears future', () => {
    let state = historyInit('a')
    state = historyPush(state, 'b')
    state = historyUndo(state)
    state = historyPush(state, 'c')
    expect(state.future).toHaveLength(0)
    expect(state.present).toBe('c')
  })
})

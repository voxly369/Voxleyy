export type HistoryState<T> = {
  past: T[]
  present: T
  future: T[]
}

const MAX_STEPS = 100

export function historyInit<T>(present: T): HistoryState<T> {
  return { past: [], present, future: [] }
}

export function historyPush<T>(state: HistoryState<T>, next: T): HistoryState<T> {
  const past = [...state.past, state.present].slice(-MAX_STEPS)
  return { past, present: next, future: [] }
}

export function historyUndo<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.past.length === 0) return state
  const past = [...state.past]
  const previous = past.pop()!
  return {
    past,
    present: previous,
    future: [state.present, ...state.future],
  }
}

export function historyRedo<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.future.length === 0) return state
  const [next, ...future] = state.future
  return {
    past: [...state.past, state.present].slice(-MAX_STEPS),
    present: next,
    future,
  }
}

export function historyCanUndo<T>(state: HistoryState<T>): boolean {
  return state.past.length > 0
}

export function historyCanRedo<T>(state: HistoryState<T>): boolean {
  return state.future.length > 0
}

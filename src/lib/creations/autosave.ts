export type SaveUiState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict'

export type AutosaveModel = {
  ui: SaveUiState
  dirty: boolean
  lastSavedAt: string | null
  saveInFlight: boolean
  queued: boolean
  retryCount: number
  conflictRemoteUpdatedAt: string | null
}

export const initialAutosaveModel: AutosaveModel = {
  ui: 'idle',
  dirty: false,
  lastSavedAt: null,
  saveInFlight: false,
  queued: false,
  retryCount: 0,
  conflictRemoteUpdatedAt: null,
}

export type AutosaveEvent =
  | { type: 'edit' }
  | { type: 'debounce_elapsed' }
  | { type: 'blur' }
  | { type: 'tab_hidden' }
  | { type: 'save_start' }
  | { type: 'save_success'; savedAt: string }
  | { type: 'save_network_error' }
  | { type: 'save_conflict'; remoteUpdatedAt: string }
  | { type: 'retry' }
  | { type: 'resolve_load_remote' }
  | { type: 'resolve_overwrite' }

export function shouldTriggerSave(event: AutosaveEvent): boolean {
  return event.type === 'debounce_elapsed' || event.type === 'blur' || event.type === 'tab_hidden'
}

export function shouldBlockNavigation(model: AutosaveModel): boolean {
  return model.dirty || model.saveInFlight || model.ui === 'saving'
}

export function autosaveReducer(model: AutosaveModel, event: AutosaveEvent): AutosaveModel {
  switch (event.type) {
    case 'edit':
      return {
        ...model,
        dirty: true,
        ui: model.ui === 'conflict' ? model.ui : model.ui === 'error' ? 'error' : 'idle',
        queued: model.saveInFlight,
      }
    case 'debounce_elapsed':
    case 'blur':
    case 'tab_hidden':
      if (!model.dirty) return model
      if (model.saveInFlight) return { ...model, queued: true }
      return { ...model, ui: 'saving', saveInFlight: true, queued: false }
    case 'save_start':
      return { ...model, ui: 'saving', saveInFlight: true }
    case 'save_success':
      return {
        ui: 'saved',
        dirty: false,
        lastSavedAt: event.savedAt,
        saveInFlight: false,
        queued: false,
        retryCount: 0,
        conflictRemoteUpdatedAt: null,
      }
    case 'save_network_error':
      return {
        ...model,
        ui: 'error',
        saveInFlight: false,
        retryCount: model.retryCount + 1,
      }
    case 'save_conflict':
      return {
        ...model,
        ui: 'conflict',
        saveInFlight: false,
        conflictRemoteUpdatedAt: event.remoteUpdatedAt,
      }
    case 'retry':
      if (model.saveInFlight) return { ...model, queued: true }
      return { ...model, ui: 'saving', saveInFlight: true }
    case 'resolve_load_remote':
      return {
        ...initialAutosaveModel,
        lastSavedAt: model.lastSavedAt,
      }
    case 'resolve_overwrite':
      return {
        ...model,
        ui: 'saving',
        saveInFlight: true,
        conflictRemoteUpdatedAt: null,
      }
    default:
      return model
  }
}

export function autosaveStatusLabel(model: AutosaveModel, now = new Date()): string {
  switch (model.ui) {
    case 'saving':
      return 'Saving…'
    case 'saved':
      if (!model.lastSavedAt) return 'Saved'
      return `Saved at ${formatClock(model.lastSavedAt, now)}`
    case 'error':
      return 'Not saved. Retry'
    case 'conflict':
      return 'Newer version exists'
    default:
      return model.dirty ? 'Unsaved changes' : ''
  }
}

function formatClock(iso: string, now: Date): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(
    Number.isNaN(date.getTime()) ? now : date,
  )
}

export function retryDelayMs(retryCount: number): number {
  return Math.min(8000, 500 * 2 ** Math.max(0, retryCount - 1))
}

export function shouldRunQueuedSave(model: AutosaveModel): boolean {
  return model.queued && !model.saveInFlight && model.dirty
}

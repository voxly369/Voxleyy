export type SaveUiState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict'

export type AutosaveModel = {
  ui: SaveUiState
  dirty: boolean
  editVersion: number
  savedVersion: number
  savingVersion: number | null
  lastSavedAt: string | null
  saveInFlight: boolean
  queued: boolean
  retryCount: number
  conflictRemoteUpdatedAt: string | null
}

export const initialAutosaveModel: AutosaveModel = {
  ui: 'idle',
  dirty: false,
  editVersion: 0,
  savedVersion: 0,
  savingVersion: null,
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
  | { type: 'save_permanent_error' }
  | { type: 'save_conflict'; remoteUpdatedAt: string }
  | { type: 'retry' }
  | { type: 'resolve_load_remote' }
  | { type: 'resolve_overwrite' }
  | { type: 'hydrate'; savedAt: string }

export function shouldTriggerSave(event: AutosaveEvent): boolean {
  return event.type === 'debounce_elapsed' || event.type === 'blur' || event.type === 'tab_hidden'
}

export function shouldBlockNavigation(model: AutosaveModel): boolean {
  return model.dirty || model.saveInFlight || model.ui === 'saving'
}

function beginSave(model: AutosaveModel): AutosaveModel {
  if (!model.dirty) return model
  if (model.saveInFlight) return { ...model, queued: true }
  return {
    ...model,
    ui: 'saving',
    saveInFlight: true,
    savingVersion: model.editVersion,
    queued: false,
  }
}

export function autosaveReducer(model: AutosaveModel, event: AutosaveEvent): AutosaveModel {
  switch (event.type) {
    case 'edit':
      return {
        ...model,
        editVersion: model.editVersion + 1,
        dirty: true,
        ui: model.ui === 'conflict' ? model.ui : model.ui === 'error' ? 'error' : 'idle',
        queued: model.saveInFlight ? true : model.queued,
      }
    case 'debounce_elapsed':
    case 'blur':
    case 'tab_hidden':
      return beginSave(model)
    case 'save_start':
      return {
        ...model,
        ui: 'saving',
        saveInFlight: true,
        savingVersion: model.savingVersion ?? model.editVersion,
      }
    case 'save_success': {
      const caughtUp = model.savingVersion !== null && model.editVersion === model.savingVersion
      if (caughtUp) {
        return {
          ui: 'saved',
          dirty: false,
          editVersion: model.editVersion,
          savedVersion: model.editVersion,
          savingVersion: null,
          lastSavedAt: event.savedAt,
          saveInFlight: false,
          queued: false,
          retryCount: 0,
          conflictRemoteUpdatedAt: null,
        }
      }
      return {
        ...model,
        ui: 'idle',
        dirty: true,
        savingVersion: null,
        saveInFlight: false,
        queued: true,
        retryCount: 0,
        conflictRemoteUpdatedAt: null,
      }
    }
    case 'save_network_error':
      return {
        ...model,
        ui: 'error',
        saveInFlight: false,
        savingVersion: null,
        retryCount: model.retryCount + 1,
      }
    case 'save_permanent_error':
      return {
        ...model,
        ui: 'error',
        saveInFlight: false,
        savingVersion: null,
      }
    case 'save_conflict':
      return {
        ...model,
        ui: 'conflict',
        saveInFlight: false,
        savingVersion: null,
        conflictRemoteUpdatedAt: event.remoteUpdatedAt,
      }
    case 'retry':
      if (model.saveInFlight) return { ...model, queued: true }
      return beginSave({ ...model, ui: 'error' })
    case 'resolve_load_remote':
      return {
        ...initialAutosaveModel,
        lastSavedAt: model.lastSavedAt,
        savedVersion: model.editVersion,
      }
    case 'resolve_overwrite':
      return beginSave({ ...model, conflictRemoteUpdatedAt: null, ui: 'idle' })
    case 'hydrate':
      return {
        ...initialAutosaveModel,
        editVersion: 1,
        savedVersion: 1,
        lastSavedAt: event.savedAt,
      }
    default:
      return model
  }
}

export function autosaveStatusLabel(model: AutosaveModel, now = new Date()): string {
  if (model.saveInFlight || model.ui === 'saving') return 'Saving…'
  if (model.dirty) {
    if (model.ui === 'error') return 'Not saved. Retry'
    if (model.ui === 'conflict') return 'Newer version exists'
    return 'Unsaved changes'
  }
  if (model.ui === 'error') return 'Not saved. Retry'
  if (model.ui === 'conflict') return 'Newer version exists'
  if (model.ui === 'saved') {
    if (!model.lastSavedAt) return 'Saved'
    return `Saved at ${formatClock(model.lastSavedAt, now)}`
  }
  return ''
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

export const MAX_AUTO_RETRIES = 5

export function shouldRunQueuedSave(model: AutosaveModel): boolean {
  return model.queued && !model.saveInFlight && model.dirty
}

export function shouldAutoRetry(model: AutosaveModel): boolean {
  return model.ui === 'error' && model.retryCount > 0 && model.retryCount < MAX_AUTO_RETRIES
}

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  autosaveReducer,
  autosaveStatusLabel,
  initialAutosaveModel,
  retryDelayMs,
  shouldAutoRetry,
  shouldBlockNavigation,
  shouldRunQueuedSave,
} from './autosave.ts'
import { bodyJsonFromText, hasEditorContent } from './bodyDocument.ts'
import { createDraft, getEditableCreation, saveCreationFields } from './api.ts'
import type { CreationType } from './creationTypes.ts'
import type { Audience, PublishStatus } from './types.ts'
import { isTransientSaveError } from './saveErrors.ts'
import type { CreationFailure } from './types.ts'

const DEBOUNCE_MS = 1500

export type EditorForm = {
  title: string
  body: string
  tags: string[]
}

type UseCreationEditorArgs = {
  creationId: string | null
  creationType: CreationType
}

function isPermanentSaveFailure(result: CreationFailure): boolean {
  if (result.error.code === 'invalid' || result.error.code === 'forbidden') return true
  return !isTransientSaveError({ message: result.error.message })
}

export function useCreationEditor({ creationId, creationType }: UseCreationEditorArgs) {
  const navigate = useNavigate()
  const [autosave, dispatchAutosave] = useReducer(autosaveReducer, initialAutosaveModel)
  const [form, setForm] = useReducer(
    (state: EditorForm, patch: Partial<EditorForm>) => ({ ...state, ...patch }),
    { title: '', body: '', tags: [] },
  )
  const [loadError, setLoadError] = useReducer((_s: string | null, v: string | null) => v, null)
  const [loading, setLoading] = useReducer((_s: boolean, v: boolean) => v, Boolean(creationId))
  const [coverUrl, setCoverUrl] = useReducer((_s: string | null, v: string | null) => v, null)
  const [creationStatus, setCreationStatus] = useState<PublishStatus>('draft')
  const [creationAudience, setCreationAudience] = useState<Audience>('private')
  const [tagWarning, setTagWarning] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const [activeId, setActiveId] = useState<string | null>(creationId)
  const idRef = useRef<string | null>(creationId)
  const updatedAtRef = useRef<string | null>(null)
  const formRef = useRef(form)
  const debounceRef = useRef<number | null>(null)
  const retryTimerRef = useRef<number | null>(null)
  const savingRef = useRef(false)
  const autosaveRef = useRef(autosave)

  useEffect(() => {
    formRef.current = form
  }, [form])

  useEffect(() => {
    autosaveRef.current = autosave
  }, [autosave])

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current)
    }
  }, [])

  const applyRemote = useCallback((value: import('./types.ts').EditableCreation) => {
    idRef.current = value.id
    setActiveId(value.id)
    updatedAtRef.current = value.updatedAt
    setCreationStatus(value.status)
    setCreationAudience(value.audience)
    setForm({ title: value.title, body: value.bodyText, tags: value.tags })
    setCoverUrl(value.coverUrl)
    setTagWarning(null)
    setSaveMessage(null)
    dispatchAutosave({ type: 'hydrate', savedAt: value.updatedAt })
  }, [])

  useEffect(() => {
    if (!creationId) {
      setLoading(false)
      return
    }
    let active = true
    void (async () => {
      setLoading(true)
      const result = await getEditableCreation(creationId)
      if (!active) return
      setLoading(false)
      if (!result.ok) {
        setLoadError(result.error.message)
        return
      }
      setLoadError(null)
      idRef.current = result.data.id
      setActiveId(result.data.id)
      applyRemote(result.data)
    })()
    return () => {
      active = false
    }
  }, [creationId, applyRemote])

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }, [])

  const scheduleAutoRetry = useCallback(() => {
    clearRetryTimer()
    const model = autosaveRef.current
    if (!shouldAutoRetry(model)) return
    retryTimerRef.current = window.setTimeout(() => {
      dispatchAutosave({ type: 'retry' })
    }, retryDelayMs(model.retryCount))
  }, [clearRetryTimer])

  const performSave = useCallback(async (forceOverwrite: boolean) => {
    if (savingRef.current) return
    const snapshot = formRef.current
    if (!hasEditorContent(snapshot.title, snapshot.body, snapshot.tags)) return

    savingRef.current = true
    setSaveMessage(null)
    dispatchAutosave({ type: 'save_start' })

    try {
      let id = idRef.current
      if (!id) {
        const created = await createDraft({
          type: creationType,
          title: snapshot.title.trim() || null,
          body_text: snapshot.body,
          body_json: bodyJsonFromText(snapshot.body),
          tags: snapshot.tags,
          audience: 'private',
        })
        if (!created.ok) {
          if (isPermanentSaveFailure(created)) {
            setSaveMessage(created.error.message)
            dispatchAutosave({ type: 'save_permanent_error' })
          } else {
            dispatchAutosave({ type: 'save_network_error' })
            scheduleAutoRetry()
          }
          return
        }
        id = created.data.id
        idRef.current = id
        setActiveId(id)
        updatedAtRef.current = created.data.updatedAt
        setCreationStatus(created.data.status)
        setCreationAudience(created.data.audience)
        if (created.tagError) setTagWarning(created.tagError.message)
        navigate(`/create/${id}`, { replace: true })
        dispatchAutosave({ type: 'save_success', savedAt: created.data.updatedAt })
        return
      }

      const result = await saveCreationFields({
        id,
        expectedUpdatedAt: updatedAtRef.current,
        title: snapshot.title,
        bodyText: snapshot.body,
        tags: snapshot.tags,
        forceOverwrite,
      })

      if ('conflict' in result && result.conflict) {
        dispatchAutosave({ type: 'save_conflict', remoteUpdatedAt: result.remoteUpdatedAt })
        return
      }
      if (!result.ok) {
        if ('conflict' in result) return
        if (isPermanentSaveFailure(result)) {
          setSaveMessage(result.error.message)
          dispatchAutosave({ type: 'save_permanent_error' })
        } else {
          dispatchAutosave({ type: 'save_network_error' })
          scheduleAutoRetry()
        }
        return
      }

      updatedAtRef.current = result.updatedAt
      if (result.tagError) setTagWarning(result.tagError.message)
      else setTagWarning(null)
      dispatchAutosave({ type: 'save_success', savedAt: result.updatedAt })
    } finally {
      savingRef.current = false
    }
  }, [creationType, navigate, scheduleAutoRetry])

  useEffect(() => {
    if (!autosave.saveInFlight || savingRef.current) return
    void performSave(false)
  }, [autosave.saveInFlight, performSave])

  useEffect(() => {
    if (shouldRunQueuedSave(autosave)) {
      dispatchAutosave({ type: 'debounce_elapsed' })
    }
  }, [autosave])

  const scheduleSave = useCallback(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => dispatchAutosave({ type: 'debounce_elapsed' }), DEBOUNCE_MS)
  }, [])

  const onEdit = useCallback(
    (patch: Partial<EditorForm>) => {
      setForm(patch)
      dispatchAutosave({ type: 'edit' })
      scheduleSave()
    },
    [scheduleSave],
  )

  const onBlur = useCallback(() => {
    dispatchAutosave({ type: 'blur' })
  }, [])

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden') dispatchAutosave({ type: 'tab_hidden' })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (shouldBlockNavigation(autosave)) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [autosave])

  const reloadRemote = useCallback(async () => {
    const id = idRef.current
    if (!id) return
    const result = await getEditableCreation(id)
    if (result.ok) {
      applyRemote(result.data)
      dispatchAutosave({ type: 'resolve_load_remote' })
    }
  }, [applyRemote])

  const overwriteRemote = useCallback(async () => {
    dispatchAutosave({ type: 'resolve_overwrite' })
    await performSave(true)
  }, [performSave])

  const retrySave = useCallback(() => {
    clearRetryTimer()
    setSaveMessage(null)
    dispatchAutosave({ type: 'retry' })
  }, [clearRetryTimer])

  const flushPendingSave = useCallback(async (): Promise<boolean> => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
      dispatchAutosave({ type: 'debounce_elapsed' })
    } else if (autosaveRef.current.dirty && !autosaveRef.current.saveInFlight) {
      dispatchAutosave({ type: 'debounce_elapsed' })
    }

    const deadline = Date.now() + 30000
    while (Date.now() < deadline) {
      const model = autosaveRef.current
      if (!model.dirty && !model.saveInFlight && !savingRef.current) return true
      if (model.ui === 'conflict' || (model.ui === 'error' && !shouldAutoRetry(model) && model.retryCount >= 5)) {
        return false
      }
      await new Promise((resolve) => window.setTimeout(resolve, 100))
    }
    return false
  }, [])

  const statusLabel = saveMessage || autosaveStatusLabel(autosave)

  return {
    form,
    onEdit,
    onBlur,
    autosave,
    statusLabel,
    loading,
    loadError,
    reloadRemote,
    overwriteRemote,
    retrySave,
    creationId: activeId,
    creationStatus,
    creationAudience,
    tagWarning,
    getUpdatedAt: () => updatedAtRef.current,
    shouldBlockLeave: shouldBlockNavigation(autosave),
    coverUrl,
    setCoverUrl,
    flushPendingSave,
  }
}

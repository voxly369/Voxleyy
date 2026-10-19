import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  autosaveReducer,
  initialAutosaveModel,
  retryDelayMs,
  shouldBlockNavigation,
  shouldRunQueuedSave,
} from './autosave.ts'
import { bodyJsonFromText, hasEditorContent } from './bodyDocument.ts'
import { createDraft, getEditableCreation, saveCreationFields } from './api.ts'
import type { CreationType } from './creationTypes.ts'
import type { EditableCreation } from './types.ts'

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

  const [activeId, setActiveId] = useState<string | null>(creationId)
  const idRef = useRef<string | null>(creationId)
  const updatedAtRef = useRef<string | null>(null)
  const formRef = useRef(form)
  const debounceRef = useRef<number | null>(null)
  const savingRef = useRef(false)

  useEffect(() => {
    formRef.current = form
  }, [form])

  const applyRemote = useCallback((value: EditableCreation) => {
    idRef.current = value.id
    setActiveId(value.id)
    updatedAtRef.current = value.updatedAt
    setForm({ title: value.title, body: value.bodyText, tags: value.tags })
    setCoverUrl(value.coverUrl)
    dispatchAutosave({ type: 'save_success', savedAt: value.updatedAt })
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

  const performSave = useCallback(async (forceOverwrite: boolean) => {
    if (savingRef.current) return
    const snapshot = formRef.current
    if (!hasEditorContent(snapshot.title, snapshot.body, snapshot.tags)) return

    savingRef.current = true
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
          dispatchAutosave({ type: 'save_network_error' })
          return
        }
        id = created.data.id
        idRef.current = id
        setActiveId(id)
        updatedAtRef.current = created.data.updatedAt
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
        dispatchAutosave({ type: 'save_network_error' })
        window.setTimeout(() => {
          dispatchAutosave({ type: 'retry' })
        }, retryDelayMs(autosave.retryCount + 1))
        return
      }

      updatedAtRef.current = result.updatedAt
      dispatchAutosave({ type: 'save_success', savedAt: result.updatedAt })
    } finally {
      savingRef.current = false
    }
  }, [creationType, navigate, autosave.retryCount])

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
    dispatchAutosave({ type: 'retry' })
  }, [])

  return {
    form,
    onEdit,
    onBlur,
    autosave,
    loading,
    loadError,
    reloadRemote,
    overwriteRemote,
    retrySave,
    creationId: activeId,
    shouldBlockLeave: shouldBlockNavigation(autosave),
    coverUrl,
    setCoverUrl,
  }
}

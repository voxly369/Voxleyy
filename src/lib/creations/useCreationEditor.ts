import type { Json } from '../database.types.ts'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  applyAutosaveEvent,
  autosaveReducer,
  autosaveStatusLabel,
  initialAutosaveModel,
  retryDelayMs,
  shouldAutoRetry,
  shouldBlockNavigation,
  shouldRunQueuedSave,
} from './autosave.ts'
import {
  bodyContentFromJson,
  DEFAULT_QUOTE_CARD_STYLE,
  emptyRichDocument,
  plainToRich,
  hasEditorContent,
  quoteCardBodyJson,
  quoteStyleFromJson,
  richDocumentFingerprint,
  richToPlainText,
  validateRichDocumentSize,
  type QuoteCardStyle,
  type RichBodyDocument,
} from './bodyDocument.ts'
import { isPhase1CreationType, type CreationType } from './creationTypes.ts'
import { literaryPlainFromRich, trimLiteraryRichDocument } from './literaryDisplay.ts'
import { createDraft, getEditableCreation, saveCreationFields } from './api.ts'
import type { Audience, PublishStatus } from './types.ts'
import { isTransientSaveError, saveErrorMessage } from './saveErrors.ts'
import type { CreationFailure } from './types.ts'

const DEBOUNCE_MS = 1500

export type EditorForm = {
  title: string
  body: string
  caption: string
  tags: string[]
}

type UseCreationEditorArgs = {
  creationId: string | null
  creationType: CreationType
  /** First line / body seed when opening a new draft (e.g. Word of the Day). */
  seedBody?: string | null
}

function isPermanentSaveFailure(result: CreationFailure): boolean {
  if (result.error.code === 'invalid' || result.error.code === 'forbidden') return true
  return !isTransientSaveError({
    message: result.error.message,
    code: result.error.providerCode,
    status: result.error.providerStatus,
  })
}

function failureMessage(result: CreationFailure): string {
  return saveErrorMessage(
    {
      message: result.error.message,
      code: result.error.providerCode,
      status: result.error.providerStatus,
    },
    result.error.message,
  )
}

function usesRichEditor(type: CreationType): boolean {
  return isPhase1CreationType(type) && type !== 'quote_card'
}

function isLiteraryType(type: CreationType): boolean {
  return type === 'poem' || type === 'lyric' || type === 'script'
}

function normalizeLiteraryPayload(type: CreationType, body: string, richDoc: RichBodyDocument) {
  if (!isLiteraryType(type)) return { body, richDoc }
  const richDocTrimmed = trimLiteraryRichDocument(richDoc)
  return { body: literaryPlainFromRich(richDocTrimmed), richDoc: richDocTrimmed }
}

function buildBodyJson(type: CreationType, body: string, quoteStyle: QuoteCardStyle, richDoc: RichBodyDocument): Json {
  if (type === 'quote_card') return quoteCardBodyJson(body, quoteStyle) as Json
  if (usesRichEditor(type)) return richDoc as unknown as Json
  return { version: 1, format: 'plain', text: body } as Json
}

export function useCreationEditor({ creationId, creationType, seedBody }: UseCreationEditorArgs) {
  const navigate = useNavigate()
  const [autosave, dispatchAutosave] = useReducer(autosaveReducer, initialAutosaveModel)
  const [form, setForm] = useReducer(
    (state: EditorForm, patch: Partial<EditorForm>) => ({ ...state, ...patch }),
    { title: '', body: '', caption: '', tags: [] },
  )
  const [loadError, setLoadError] = useReducer((_s: string | null, v: string | null) => v, null)
  const [loading, setLoading] = useReducer((_s: boolean, v: boolean) => v, Boolean(creationId))
  const [coverUrl, setCoverUrl] = useReducer((_s: string | null, v: string | null) => v, null)
  const [creationStatus, setCreationStatus] = useState<PublishStatus>('draft')
  const [creationAudience, setCreationAudience] = useState<Audience>('private')
  const [creationMood, setCreationMood] = useState<string | null>(null)
  const [creationLanguage, setCreationLanguage] = useState('en')
  const [quoteStyle, setQuoteStyle] = useState<QuoteCardStyle>(DEFAULT_QUOTE_CARD_STYLE)
  const [richDoc, setRichDoc] = useState<RichBodyDocument>(() => emptyRichDocument())
  const [tagWarning, setTagWarning] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const [activeId, setActiveId] = useState<string | null>(creationId)
  const idRef = useRef<string | null>(creationId)
  const updatedAtRef = useRef<string | null>(null)
  const formRef = useRef(form)
  const audienceRef = useRef(creationAudience)
  const quoteStyleRef = useRef(quoteStyle)
  const richDocRef = useRef(richDoc)
  const savedFingerprintRef = useRef<string>(richDocumentFingerprint(emptyRichDocument()))
  const debounceRef = useRef<number | null>(null)
  const retryTimerRef = useRef<number | null>(null)
  const savingRef = useRef(false)
  const autosaveRef = useRef(autosave)
  const seedAppliedRef = useRef(false)

  useEffect(() => {
    formRef.current = form
  }, [form])

  useEffect(() => {
    audienceRef.current = creationAudience
  }, [creationAudience])

  useEffect(() => {
    quoteStyleRef.current = quoteStyle
  }, [quoteStyle])

  useEffect(() => {
    richDocRef.current = richDoc
  }, [richDoc])

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
    setCreationMood(value.mood)
    setCreationLanguage(value.language?.trim().toLowerCase() || 'en')
    const loadedRich = bodyContentFromJson(value.bodyJson, value.bodyText)
    setForm({
      title: value.title,
      body: richToPlainText(loadedRich),
      caption: value.caption,
      tags: value.tags,
    })
    setRichDoc(loadedRich)
    savedFingerprintRef.current = richDocumentFingerprint(loadedRich)
    setQuoteStyle(quoteStyleFromJson(value.bodyJson))
    setCoverUrl(value.coverUrl)
    setTagWarning(null)
    setSaveMessage(null)
    dispatchAutosave({ type: 'hydrate', savedAt: value.updatedAt })
  }, [])

  useEffect(() => {
    if (!creationId && seedBody?.trim() && !seedAppliedRef.current) {
      seedAppliedRef.current = true
      const text = seedBody.trim()
      const rich = usesRichEditor(creationType) ? plainToRich(text) : emptyRichDocument()
      if (usesRichEditor(creationType)) {
        setRichDoc(rich)
        savedFingerprintRef.current = richDocumentFingerprint(rich)
      }
      setForm({ body: text })
      dispatchAutosave({ type: 'edit' })
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => dispatchAutosave({ type: 'debounce_elapsed' }), DEBOUNCE_MS)
    }
  }, [creationId, creationType, seedBody])

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

  const scheduleAutoRetryAfter = useCallback(
    (modelAfterError: ReturnType<typeof applyAutosaveEvent>) => {
      clearRetryTimer()
      if (!shouldAutoRetry(modelAfterError)) return
      retryTimerRef.current = window.setTimeout(() => {
        dispatchAutosave({ type: 'retry' })
      }, retryDelayMs(modelAfterError.retryCount))
    },
    [clearRetryTimer],
  )

  const onTransientSaveFailure = useCallback(() => {
    const modelAfterError = applyAutosaveEvent(autosaveRef.current, { type: 'save_network_error' })
    dispatchAutosave({ type: 'save_network_error' })
    scheduleAutoRetryAfter(modelAfterError)
  }, [scheduleAutoRetryAfter])

  const performSave = useCallback(async (forceOverwrite: boolean) => {
    if (savingRef.current) return
    const snapshot = formRef.current
    const audience = audienceRef.current
    const style = quoteStyleRef.current
    if (!hasEditorContent(snapshot.title, snapshot.body, snapshot.tags, snapshot.caption)) return

    savingRef.current = true
    setSaveMessage(null)
    dispatchAutosave({ type: 'save_start' })

    let richSnapshot = richDocRef.current
    let bodyText = snapshot.body
    if (usesRichEditor(creationType)) {
      const normalized = normalizeLiteraryPayload(creationType, bodyText, richSnapshot)
      bodyText = normalized.body
      richSnapshot = normalized.richDoc
      richDocRef.current = richSnapshot
      formRef.current = { ...formRef.current, body: bodyText }
      const sizeIssue = validateRichDocumentSize(richSnapshot)
      if (!sizeIssue.ok) {
        setSaveMessage(sizeIssue.message)
        dispatchAutosave({ type: 'save_permanent_error' })
        savingRef.current = false
        return
      }
    }
    const bodyJson = buildBodyJson(creationType, bodyText, style, richSnapshot)

    try {
      let id = idRef.current
      if (!id) {
        const created = await createDraft({
          type: creationType,
          title: snapshot.title.trim() || null,
          caption: snapshot.caption.trim() || null,
          body_text: bodyText,
          body_json: bodyJson,
          tags: snapshot.tags,
          audience,
        })
        if (!created.ok) {
          if (isPermanentSaveFailure(created)) {
            setSaveMessage(failureMessage(created))
            dispatchAutosave({ type: 'save_permanent_error' })
          } else {
            onTransientSaveFailure()
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
        savedFingerprintRef.current = richDocumentFingerprint(richSnapshot)
        dispatchAutosave({ type: 'save_success', savedAt: created.data.updatedAt })
        return
      }

      const result = await saveCreationFields({
        id,
        expectedUpdatedAt: updatedAtRef.current,
        title: snapshot.title,
        caption: snapshot.caption,
        bodyText,
        bodyJson,
        audience,
        tags: snapshot.tags,
        forceOverwrite,
      })

      if (!result) return

      if ('conflict' in result && result.conflict) {
        dispatchAutosave({ type: 'save_conflict', remoteUpdatedAt: result.remoteUpdatedAt })
        return
      }
      if (!result.ok) {
        if ('conflict' in result) return
        if (isPermanentSaveFailure(result)) {
          setSaveMessage(failureMessage(result))
          dispatchAutosave({ type: 'save_permanent_error' })
        } else {
          onTransientSaveFailure()
        }
        return
      }

      updatedAtRef.current = result.updatedAt
      if (result.tagError) setTagWarning(result.tagError.message)
      else setTagWarning(null)
      savedFingerprintRef.current = richDocumentFingerprint(richSnapshot)
      dispatchAutosave({ type: 'save_success', savedAt: result.updatedAt })
    } finally {
      savingRef.current = false
    }
  }, [creationType, navigate, onTransientSaveFailure])

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

  const onAudienceChange = useCallback(
    (audience: Audience) => {
      setCreationAudience(audience)
      dispatchAutosave({ type: 'edit' })
      scheduleSave()
    },
    [scheduleSave],
  )

  const onRichDocumentChange = useCallback(
    (doc: RichBodyDocument, plain: string) => {
      setRichDoc(doc)
      setForm({ body: plain })
      const fingerprint = richDocumentFingerprint(doc)
      if (fingerprint === savedFingerprintRef.current) {
        dispatchAutosave({ type: 'revert_to_clean' })
        return
      }
      dispatchAutosave({ type: 'edit' })
      scheduleSave()
    },
    [scheduleSave],
  )

  const onRichStructureFailure = useCallback(() => {
    dispatchAutosave({ type: 'edit' })
  }, [])

  const onQuoteStyleChange = useCallback(
    (patch: Partial<QuoteCardStyle>) => {
      setQuoteStyle((current) => ({ ...current, ...patch }))
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

  const saveDraftNow = useCallback(async (): Promise<boolean> => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    dispatchAutosave({ type: 'debounce_elapsed' })
    await performSave(false)
    return !autosaveRef.current.dirty && autosaveRef.current.ui !== 'error' && autosaveRef.current.ui !== 'conflict'
  }, [performSave])

  const statusLabel = saveMessage || autosaveStatusLabel(autosave)

  return {
    form,
    onEdit,
    onBlur,
    onAudienceChange,
    onQuoteStyleChange,
    onRichDocumentChange,
    onRichStructureFailure,
    quoteStyle,
    richDoc,
    autosave,
    statusLabel,
    loading,
    loadError,
    reloadRemote,
    overwriteRemote,
    retrySave,
    creationId: activeId,
    creationType,
    creationStatus,
    creationAudience,
    creationMood,
    creationLanguage,
    tagWarning,
    getUpdatedAt: () => updatedAtRef.current,
    shouldBlockLeave: shouldBlockNavigation(autosave),
    coverUrl,
    setCoverUrl,
    flushPendingSave,
    saveDraftNow,
    buildPreviewBodyJson: () =>
      buildBodyJson(creationType, formRef.current.body, quoteStyleRef.current, richDocRef.current),
    usesRichEditor: usesRichEditor(creationType),
    literaryLineBreaks: creationType === 'poem' || creationType === 'lyric' || creationType === 'script',
  }
}

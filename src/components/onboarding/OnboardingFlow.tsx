import { useCallback, useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../shell/Modal.tsx'
import { accessibleCoralFill, focusRing } from '../shell/navItems.ts'
import { DISCOVER_GENRES } from '../../lib/discover/moodsAndGenres.ts'
import { WRITER_ROLE_OPTIONS, ONBOARDING_STEP_COUNT } from '../../lib/onboarding/constants.ts'
import {
  completeMyOnboarding,
  fetchMyProfilePreferences,
  patchMyProfilePreferences,
  type ProfilePreferencesRow,
} from '../../lib/onboarding/api.ts'
import { clampOnboardingStep, nextOnboardingStep } from '../../lib/onboarding/stepMachine.ts'
import { detectBrowserTimezone, fetchNotificationSettings, updateNotificationSettings } from '../../lib/notifications/api.ts'
import { fetchSuggestedWriters } from '../../lib/shell/rightRailData.ts'
import { filterSuggestedWriters } from '../../lib/onboarding/suggestedWriters.ts'
import { followUser } from '../../lib/profiles/api.ts'
import { supabase } from '../../lib/supabaseClient.ts'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { pickDailyPrompt } from '../../lib/discover/dailyPrompt.ts'
import { useCreateSheet } from '../../lib/shell/useCreateSheet.ts'

const LANGUAGE_OPTIONS = [
  { id: 'en', label: 'English' },
  { id: 'af', label: 'Afrikaans' },
  { id: 'fr', label: 'French' },
  { id: 'es', label: 'Spanish' },
  { id: 'de', label: 'German' },
  { id: 'pt', label: 'Portuguese' },
]

type OnboardingFlowProps = {
  forceOpen?: boolean
  onFinished: () => void
  onCloseForced?: () => void
}

export function OnboardingFlow({ forceOpen, onFinished, onCloseForced }: OnboardingFlowProps) {
  const titleId = useId()
  const { profile } = useAuth()
  const { openCreateSheet } = useCreateSheet()
  const [prefs, setPrefs] = useState<ProfilePreferencesRow | null>(null)
  const [step, setStep] = useState(0)
  const [roles, setRoles] = useState<string[]>([])
  const [genres, setGenres] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>(['en'])
  const [country, setCountry] = useState(profile?.country ?? '')
  const [timezone, setTimezone] = useState(profile?.timezone ?? detectBrowserTimezone() ?? 'UTC')
  const [quietEnabled, setQuietEnabled] = useState(false)
  const [writers, setWriters] = useState<{ id: string; username: string; displayName: string }[]>([])
  const [promptText, setPromptText] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const visible = forceOpen || Boolean(prefs && !prefs.onboarding_completed_at)

  const load = useCallback(async () => {
    const result = await fetchMyProfilePreferences()
    if (!result.ok) return
    setPrefs(result.data)
    setStep(clampOnboardingStep(result.data.onboarding_step))
    setRoles(result.data.writer_roles)
    setGenres(result.data.favorite_genres)
    setLanguages(result.data.languages.length ? result.data.languages : ['en'])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (step !== 5) return
    void (async () => {
      const userId = profile?.id
      if (!userId) return
      const suggested = await fetchSuggestedWriters()
      if (!suggested.ok) {
        setWriters([])
        return
      }
      const { data: follows } = await supabase.from('follows').select('followee_id').eq('follower_id', userId)
      const following = new Set((follows ?? []).map((row) => row.followee_id).filter(Boolean) as string[])
      const { data: blocks } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', userId)
      const blocked = new Set((blocks ?? []).map((row) => row.blocked_id).filter(Boolean) as string[])
      const filtered = filterSuggestedWriters(
        suggested.writers.map((w) => ({
          id: w.id,
          username: w.username,
          displayName: w.displayName,
          followerCount: 0,
        })),
        { selfId: userId, followingIds: following, blockedIds: blocked },
      )
      setWriters(filtered.slice(0, 5))
    })()
  }, [step, profile?.id])

  useEffect(() => {
    if (step !== 6) return
    void supabase.rpc('writing_prompt_for_date').then(({ data }) => {
      if (typeof data === 'string') setPromptText(data)
    })
  }, [step])

  async function persistStep(next: number) {
    setBusy(true)
    setError(null)
    const patch = {
      onboarding_step: next,
      writer_roles: roles,
      favorite_genres: genres,
      languages,
    }
    const result = await patchMyProfilePreferences(patch)
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return false
    }
    setPrefs(result.data)
    setStep(next)
    return true
  }

  async function skip() {
    const next = nextOnboardingStep(step)
    if (next >= ONBOARDING_STEP_COUNT - 1) {
      await finish()
      return
    }
    setStep(next)
    setBusy(true)
    await patchMyProfilePreferences({ onboarding_step: next, writer_roles: roles, favorite_genres: genres, languages })
    setBusy(false)
  }

  async function finish() {
    setBusy(true)
    setError(null)
    if (quietEnabled) {
      const settings = await fetchNotificationSettings()
      if (settings.ok) {
        await updateNotificationSettings({ quiet_enabled: true, quiet_manual: true })
      }
    }
    const result = await completeMyOnboarding(country.trim() || null, timezone.trim() || null)
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    onFinished()
    if (onCloseForced) onCloseForced()
  }

  async function followWriter(id: string) {
    setBusy(true)
    await followUser(id)
    setBusy(false)
  }

  function toggleInList(list: string[], id: string, max: number): string[] {
    if (list.includes(id)) return list.filter((x) => x !== id)
    if (list.length >= max) return list
    return [...list, id]
  }

  if (!visible) return null

  return (
    <Modal
      open
      onClose={() => {
        if (forceOpen && onCloseForced) onCloseForced()
      }}
      closeOnEscape={!forceOpen}
      labelledBy={titleId}
      className="w-full max-w-lg"
    >
      <div className="flex max-h-[min(92dvh,720px)] flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-xl" data-testid="onboarding-flow">
        <div className="flex items-center justify-between gap-2">
          <h2 id={titleId} className="font-serif text-2xl text-ink">
            Welcome to Voxly
          </h2>
          <span className="text-xs text-muted" data-testid="onboarding-step-label">
            Step {step + 1} of {ONBOARDING_STEP_COUNT}
          </span>
        </div>

        {step === 0 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm text-muted">What brings you here? Choose all that fit.</legend>
            {WRITER_ROLE_OPTIONS.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={roles.includes(opt.id)}
                  onChange={() => setRoles((r) => toggleInList(r, opt.id, 6))}
                  className="size-4"
                />
                {opt.label}
              </label>
            ))}
          </fieldset>
        ) : null}

        {step === 1 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm text-muted">Favourite genres</legend>
            {DISCOVER_GENRES.map((g) => (
              <label key={g.slug} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={genres.includes(g.slug)}
                  onChange={() => setGenres((r) => toggleInList(r, g.slug, 12))}
                  className="size-4"
                />
                {g.label}
              </label>
            ))}
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm text-muted">Languages you read or write in</legend>
            {LANGUAGE_OPTIONS.map((lang) => (
              <label key={lang.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={languages.includes(lang.id)}
                  onChange={() => setLanguages((r) => toggleInList(r, lang.id, 10))}
                  className="size-4"
                />
                {lang.label}
              </label>
            ))}
          </fieldset>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Country (ISO code)</span>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
                className={`min-h-11 rounded-2xl border border-line bg-bg px-3 ${focusRing}`}
                maxLength={2}
                data-testid="onboarding-country"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Time zone</span>
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={`min-h-11 rounded-2xl border border-line bg-bg px-3 ${focusRing}`}
                data-testid="onboarding-timezone"
              />
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-3 text-sm text-muted">
            <p>Quiet mode holds non-essential notifications while you write or read. You can change this anytime in Settings.</p>
            <label className="flex items-center gap-2 text-ink">
              <input type="checkbox" checked={quietEnabled} onChange={(e) => setQuietEnabled(e.target.checked)} className="size-4" />
              Turn on Quiet mode now
            </label>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="flex flex-col gap-3">
            {writers.length === 0 ? (
              <p className="text-sm text-muted">Writers are still finding their way here — check Discover soon. You can skip this step.</p>
            ) : (
              <>
                <p className="text-sm text-muted">Follow a few voices to warm up your feed.</p>
                <ul className="flex flex-col gap-2">
                  {writers.map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-2 rounded-2xl border border-line px-3 py-2">
                      <span className="text-sm font-medium text-ink">{w.displayName}</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void followWriter(w.id)}
                        className={`min-h-9 rounded-xl px-3 text-xs font-semibold text-white ${accessibleCoralFill} ${focusRing}`}
                      >
                        Follow
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : null}

        {step === 6 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">Today&apos;s writing prompt</p>
            <p className="font-serif text-lg text-ink">{promptText ?? pickDailyPrompt(['Write the opening line of a story only you could tell']) ?? 'Write something true.'}</p>
            <button
              type="button"
              onClick={(event) => openCreateSheet(event.currentTarget)}
              className={`min-h-11 self-start rounded-2xl px-5 text-sm font-semibold text-white ${accessibleCoralFill} ${focusRing}`}
              data-testid="onboarding-open-create"
            >
              Write your first piece
            </button>
            <Link to="/discover" className={`text-sm font-medium text-coral ${focusRing}`}>
              Or explore Discover first
            </Link>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-coral">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-2">
          {step < ONBOARDING_STEP_COUNT - 1 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void persistStep(nextOnboardingStep(step))}
              className={`min-h-11 rounded-2xl px-5 text-sm font-semibold text-white disabled:opacity-60 ${accessibleCoralFill} ${focusRing}`}
              data-testid="onboarding-continue"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void finish()}
              className={`min-h-11 rounded-2xl px-5 text-sm font-semibold text-white disabled:opacity-60 ${accessibleCoralFill} ${focusRing}`}
              data-testid="onboarding-finish"
            >
              Finish
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void skip()}
            className={`min-h-11 rounded-2xl border border-line px-5 text-sm font-semibold ${focusRing}`}
            data-testid="onboarding-skip"
          >
            Skip
          </button>
        </div>
      </div>
    </Modal>
  )
}

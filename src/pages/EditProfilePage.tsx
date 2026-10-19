import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { useBlocker } from 'react-router-dom'
import { ProfileImageField } from '../components/profile/ProfileImageField.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { TextField } from '../components/auth/TextField.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import type { OwnProfile } from '../lib/auth/profile.ts'
import { fieldErrors } from '../lib/auth/schemas.ts'
import { COUNTRIES, LANGUAGES } from '../lib/profiles/countries.ts'
import { profileFormSchema, type ProfileFormValues } from '../lib/profiles/schemas.ts'
import { updateOwnProfile } from '../lib/profiles/api.ts'

function toForm(profile: {
  display_name: string
  bio: string
  website: string | null
  country: string | null
  city: string | null
  city_visible: boolean
  language: string
  who_can_message: string
}): ProfileFormValues {
  const country = profile.country?.trim().toUpperCase() ?? ''
  const language = /^[a-z]{2,8}$/.test(profile.language) ? profile.language : 'en'
  const whoCanMessage = profile.who_can_message === 'followers' ? 'followers' : 'everyone'
  return {
    displayName: profile.display_name,
    bio: profile.bio,
    website: profile.website ?? '',
    city: profile.city ?? '',
    country: /^[A-Z]{2}$/.test(country) ? country : '',
    cityVisible: profile.city_visible,
    language,
    whoCanMessage,
  }
}

function EditProfileForm({
  profile,
  refreshProfile,
}: {
  profile: OwnProfile
  refreshProfile: () => Promise<void>
}) {
  const initial = toForm(profile)
  const [form, setForm] = useState(initial)
  const [savedForm, setSavedForm] = useState(initial)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [bannerUrl, setBannerUrl] = useState(profile.banner_url)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState('')
  const [saved, setSaved] = useState(false)
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(savedForm), [form, savedForm])
  const blocker = useBlocker(dirty && !pending)
  const parsed = form ? profileFormSchema.safeParse(form) : null
  const errors = parsed && !parsed.success ? fieldErrors(parsed.error) : {}

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const countries = COUNTRIES.some((country) => country.code === form.country) || form.country === ''
    ? COUNTRIES
    : [{ code: form.country, name: form.country }, ...COUNTRIES]
  const languages = LANGUAGES.some((language) => language.code === form.language)
    ? LANGUAGES
    : [{ code: form.language, name: form.language }, ...LANGUAGES]

  function update(patch: Partial<ProfileFormValues>) {
    setSaved(false)
    setForm((current) => (current ? { ...current, ...patch } : current))
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!parsed?.success || pending || !dirty) return
    setPending(true)
    setFormError('')
    const result = await updateOwnProfile({
      display_name: parsed.data.displayName,
      bio: parsed.data.bio,
      website: parsed.data.website,
      country: parsed.data.country,
      city: parsed.data.city,
      city_visible: parsed.data.cityVisible,
      language: parsed.data.language,
      who_can_message: parsed.data.whoCanMessage,
    })
    setPending(false)
    if (!result.ok) {
      setFormError(result.error.message)
      return
    }
    const next = toForm({
      display_name: result.data.displayName,
      bio: result.data.bio,
      website: result.data.website,
      country: result.data.country,
      city: result.data.city,
      city_visible: result.data.cityVisible,
      language: result.data.language,
      who_can_message: parsed.data.whoCanMessage,
    })
    setForm(next)
    setSavedForm(next)
    setSaved(true)
    await refreshProfile()
  }

  return (
    <PageContainer variant="wide" className="flex flex-col gap-6 py-8">
      <PageHeader title="Edit profile" />
      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5" noValidate>
        <ProfileImageField
          bucket="banners"
          userId={profile.id}
          label="Banner"
          url={bannerUrl}
          fallbackLabel={profile.display_name || profile.username}
          onChange={(url) => {
            setBannerUrl(url)
            void refreshProfile()
          }}
        />
        <ProfileImageField
          bucket="avatars"
          userId={profile.id}
          label="Avatar"
          url={avatarUrl}
          fallbackLabel={profile.display_name || profile.username}
          onChange={(url) => {
            setAvatarUrl(url)
            void refreshProfile()
          }}
        />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-ink">Username</p>
          <p className="text-base text-ink">@{profile.username}</p>
          <p className="text-sm text-muted">Changing your username arrives later.</p>
        </div>
        <TextField
          id="display-name"
          label="Display name"
          value={form.displayName}
          maxLength={60}
          onChange={(event) => update({ displayName: event.target.value })}
          error={errors.displayName}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="bio" className="text-sm font-medium text-ink">
            Bio
          </label>
          <textarea
            id="bio"
            value={form.bio}
            maxLength={500}
            rows={5}
            onChange={(event) => update({ bio: event.target.value })}
            aria-invalid={errors.bio ? true : undefined}
            aria-describedby={errors.bio ? 'bio-error' : undefined}
            className={`w-full rounded-2xl border border-line bg-bg px-3 py-3 text-base text-ink ${focusRing}`}
          />
          {errors.bio ? (
            <p id="bio-error" role="alert" aria-live="polite" className="text-sm text-coral">
              {errors.bio}
            </p>
          ) : null}
        </div>
        <TextField
          id="website"
          label="Website"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={form.website}
          onChange={(event) => update({ website: event.target.value })}
          error={errors.website}
          hint="Optional. Start with http:// or https://."
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="country" className="text-sm font-medium text-ink">
            Country
          </label>
          <select
            id="country"
            value={form.country}
            onChange={(event) => update({ country: event.target.value })}
            className={`min-h-11 rounded-2xl border border-line bg-bg px-3 text-base text-ink ${focusRing}`}
          >
            <option value="">Not set</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
        <TextField
          id="city"
          label="City"
          value={form.city}
          maxLength={80}
          onChange={(event) => update({ city: event.target.value })}
          error={errors.city}
        />
        <label className="flex min-h-11 items-center gap-3 text-base text-ink" htmlFor="city-visible">
          <input
            id="city-visible"
            type="checkbox"
            checked={form.cityVisible}
            onChange={(event) => update({ cityVisible: event.target.checked })}
            className={`size-5 accent-coral ${focusRing}`}
          />
          Show my city on my profile
        </label>
        <div className="flex flex-col gap-2">
          <label htmlFor="language" className="text-sm font-medium text-ink">
            Preferred language
          </label>
          <select
            id="language"
            value={form.language}
            onChange={(event) => update({ language: event.target.value })}
            className={`min-h-11 rounded-2xl border border-line bg-bg px-3 text-base text-ink ${focusRing}`}
          >
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="who-can-message" className="text-sm font-medium text-ink">
            Who can message you
          </label>
          <select
            id="who-can-message"
            value={form.whoCanMessage}
            onChange={(event) =>
              update({ whoCanMessage: event.target.value === 'followers' ? 'followers' : 'everyone' })
            }
            className={`min-h-11 rounded-2xl border border-line bg-bg px-3 text-base text-ink ${focusRing}`}
          >
            <option value="everyone">Everyone</option>
            <option value="followers">Followers only</option>
          </select>
        </div>
        <p role="alert" aria-live="polite" className="min-h-5 text-sm text-coral">
          {formError}
        </p>
        <p role="status" aria-live="polite" className="min-h-5 text-sm text-ink">
          {saved ? 'Profile saved.' : ''}
        </p>
        <button
          type="submit"
          disabled={!dirty || !parsed?.success || pending}
          className={`inline-flex min-h-11 items-center justify-center self-start rounded-2xl bg-coral px-5 text-base font-semibold text-white disabled:opacity-60 ${focusRing}`}
        >
          {pending ? 'Please wait…' : 'Save'}
        </button>
      </form>
      {blocker.state === 'blocked' ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="unsaved-title"
            className="w-full max-w-md rounded-2xl bg-surface p-5"
          >
            <h2 id="unsaved-title" className="text-2xl text-ink">
              Leave without saving?
            </h2>
            <p className="mt-2 text-base text-muted">You have unsaved profile changes.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => blocker.reset()}
                className={`inline-flex min-h-11 items-center rounded-2xl bg-coral px-4 text-base font-semibold text-white ${focusRing}`}
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => blocker.proceed()}
                className={`inline-flex min-h-11 items-center rounded-2xl border border-line px-4 text-base font-semibold text-ink ${focusRing}`}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageContainer>
  )
}

export default function EditProfilePage() {
  const { profile, refreshProfile } = useAuth()
  if (!profile) return null
  return <EditProfileForm key={profile.id} profile={profile} refreshProfile={refreshProfile} />
}

import { useEffect, useState, type FormEvent } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { bookSaleModels, type BookMetadataInput, type BookRecord } from '../../lib/books/bookSchema.ts'
import { validateBookMetadata } from '../../lib/books/bookValidation.ts'
import { LanguagePicker } from '../languages/LanguagePicker.tsx'
import { DEFAULT_CONTENT_LANGUAGE } from '../../lib/languages/defaultLanguage.ts'

type BookBuilderFormProps = {
  book: BookRecord
  disabled?: boolean
  onSave: (input: BookMetadataInput) => Promise<void>
}

export function BookBuilderForm({ book, disabled = false, onSave }: BookBuilderFormProps) {
  const [title, setTitle] = useState(book.title)
  const [subtitle, setSubtitle] = useState(book.subtitle ?? '')
  const [description, setDescription] = useState(book.description)
  const [saleModel, setSaleModel] = useState<BookMetadataInput['saleModel']>(book.saleModel)
  const [priceCents, setPriceCents] = useState(String(book.priceCents))
  const [currency, setCurrency] = useState(book.currency)
  const [rentalDays, setRentalDays] = useState(book.rentalDays ? String(book.rentalDays) : '')
  const [voxlyBookId, setVoxlyBookId] = useState(book.voxlyBookId ?? '')
  const [language, setLanguage] = useState(book.language || DEFAULT_CONTENT_LANGUAGE)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTitle(book.title)
    setSubtitle(book.subtitle ?? '')
    setDescription(book.description)
    setSaleModel(book.saleModel)
    setPriceCents(String(book.priceCents))
    setCurrency(book.currency)
    setRentalDays(book.rentalDays ? String(book.rentalDays) : '')
    setVoxlyBookId(book.voxlyBookId ?? '')
    setLanguage(book.language || DEFAULT_CONTENT_LANGUAGE)
  }, [book])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const payload: BookMetadataInput = {
      title,
      subtitle: subtitle.trim() ? subtitle : null,
      description,
      saleModel,
      priceCents: saleModel === 'free' ? 0 : Math.round(Number(priceCents) || 0),
      currency: currency.trim().toUpperCase(),
      rentalDays: saleModel === 'rental' ? Number(rentalDays) || null : null,
      voxlyBookId: voxlyBookId.trim() ? voxlyBookId : null,
      language: language.trim().toLowerCase() || DEFAULT_CONTENT_LANGUAGE,
    }
    const validated = validateBookMetadata(payload)
    if (!validated.ok) {
      setError(validated.issues[0]?.message ?? 'Check the form.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(validated.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" aria-labelledby="book-builder-form-heading">
      <h2 id="book-builder-form-heading" className="font-serif text-xl text-ink">
        Book details
      </h2>
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled || saving}
          className={`min-h-11 rounded-xl border border-line bg-surface px-3 ${focusRing}`}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Subtitle
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          disabled={disabled || saving}
          className={`min-h-11 rounded-xl border border-line bg-surface px-3 ${focusRing}`}
        />
      </label>
      <LanguagePicker value={language} onChange={setLanguage} disabled={disabled || saving} testId="book-language-picker" />
      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          disabled={disabled || saving}
          className={`rounded-xl border border-line bg-surface px-3 py-2 ${focusRing}`}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Sale model
        <select
          value={saleModel}
          onChange={(e) => setSaleModel(e.target.value as BookMetadataInput['saleModel'])}
          disabled={disabled || saving}
          className={`min-h-11 rounded-xl border border-line bg-surface px-3 ${focusRing}`}
        >
          {bookSaleModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </label>
      {saleModel !== 'free' ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Price (cents)
            <input
              inputMode="numeric"
              value={priceCents}
              onChange={(e) => setPriceCents(e.target.value.replace(/\D/g, ''))}
              disabled={disabled || saving}
              className={`min-h-11 rounded-xl border border-line bg-surface px-3 ${focusRing}`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Currency
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              maxLength={3}
              disabled={disabled || saving}
              className={`min-h-11 rounded-xl border border-line bg-surface px-3 ${focusRing}`}
            />
          </label>
        </>
      ) : null}
      {saleModel === 'rental' ? (
        <label className="flex flex-col gap-1 text-sm">
          Rental days
          <input
            inputMode="numeric"
            value={rentalDays}
            onChange={(e) => setRentalDays(e.target.value.replace(/\D/g, ''))}
            disabled={disabled || saving}
            className={`min-h-11 rounded-xl border border-line bg-surface px-3 ${focusRing}`}
          />
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        Voxly Book ID
        <input
          value={voxlyBookId}
          onChange={(e) => setVoxlyBookId(e.target.value)}
          aria-label="Voxly Book ID"
          disabled={disabled || saving}
          className={`min-h-11 rounded-xl border border-line bg-surface px-3 ${focusRing}`}
        />
      </label>
      {error ? <p className="text-sm text-coral">{error}</p> : null}
      <button
        type="submit"
        disabled={disabled || saving}
        className={`min-h-11 w-full rounded-xl bg-coral font-semibold text-[#1a100a] disabled:opacity-60 sm:w-auto sm:px-6 ${focusRing}`}
      >
        {saving ? 'Saving…' : 'Save details'}
      </button>
    </form>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CoverFrame } from '../components/creations/CoverFrame.tsx'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import { uploadCreationCover } from '../lib/creations/coverUpload.ts'
import { fetchBookById, saveBookMetadata } from '../lib/books/booksApi.ts'
import type { BookRecord } from '../lib/books/bookSchema.ts'
import {
  COVER_LAYOUT_PRESETS,
  coverBoxStyle,
  coverLayoutPreset,
  type CoverLayoutPresetId,
} from '../lib/books/coverStudioLayout.ts'
import { averageImageRgb, parseHexColor, suggestCoverTextColor } from '../lib/books/coverStudioContrast.ts'
import { COVER_EXPORT_HEIGHT, COVER_EXPORT_WIDTH, renderBookCoverPng } from '../lib/books/coverExport.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'
import { useToast } from '../lib/shell/useToast.ts'

export default function CoverStudioPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [book, setBook] = useState<BookRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [layoutId, setLayoutId] = useState<CoverLayoutPresetId>('classic_center')
  const [textColor, setTextColor] = useState<'#ffffff' | '#1a100a'>('#ffffff')
  const [uploadBusy, setUploadBusy] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useDocumentTitle(book?.title ? `Cover · ${book.title}` : 'Cover studio')

  useEffect(() => {
    void fetchBookById(id).then((result) => {
      if (!result.ok) setError(result.error.message)
      else setBook(result.data)
    })
  }, [id])

  useEffect(() => {
    if (!book?.coverUrl || !canvasRef.current) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = 32
      canvas.height = 18
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      setTextColor(suggestCoverTextColor(averageImageRgb(pixels)))
    }
    img.src = book.coverUrl
  }, [book?.coverUrl])

  async function onPickCover(file: File | null) {
    if (!file || !book || !profile?.id) return
    setUploadBusy(true)
    const blob = file.type === 'image/webp' ? file : file
    const result = await uploadCreationCover(profile.id, book.id, blob, `book-${book.id}-cover.webp`)
    setUploadBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setBook({ ...book, coverUrl: result.data })
  }

  if (error && !book) return <ErrorState title="Cover studio" message={error} onRetry={() => window.location.reload()} />
  if (!book) {
    return (
      <PageContainer variant="editor" className="py-8">
        <Skeleton />
      </PageContainer>
    )
  }

  const layout = coverLayoutPreset(layoutId)
  const authorName = book.author?.displayName || book.author?.username || profile?.display_name || 'Author'
  const fallbackBg = parseHexColor('#3d2c24') ?? { r: 61, g: 44, b: 36 }

  return (
    <PageContainer variant="editor" className="flex flex-col gap-6 py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageHeader title="Cover studio" />
        <button
          type="button"
          onClick={() => navigate(`/books/${book.id}/builder`)}
          className={`min-h-11 text-sm font-medium text-coral ${focusRing}`}
        >
          Done
        </button>
      </div>
      <Link to={`/books/${book.id}/builder`} className={`text-sm text-coral ${focusRing}`}>
        ← Back to builder
      </Link>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-line bg-[#3d2c24]">
          {book.coverUrl ? <CoverFrame src={book.coverUrl} alt="" label="" className="aspect-[2/3] rounded-none" /> : null}
          <div className="pointer-events-none absolute inset-0">
            {layout.boxes.map((box) => {
              const style = coverBoxStyle(box)
              const value =
                box.role === 'title' ? book.title : box.role === 'subtitle' ? book.subtitle ?? '' : authorName
              if (!value) return null
              return (
                <span
                  key={box.role}
                  className="absolute font-serif leading-tight drop-shadow"
                  style={{ ...style, color: textColor }}
                >
                  {value}
                </span>
              )
            })}
          </div>
          {!book.coverUrl ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Upload a cover image</div>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Layout
            <select
              value={layoutId}
              onChange={(e) => setLayoutId(e.target.value as CoverLayoutPresetId)}
              className={`min-h-11 rounded-xl border border-line bg-surface px-3 ${focusRing}`}
            >
              {COVER_LAYOUT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Cover image
            <input
              type="file"
              accept="image/*"
              disabled={uploadBusy}
              onChange={(e) => void onPickCover(e.target.files?.[0] ?? null)}
              className={`min-h-11 rounded-xl border border-line bg-surface px-3 py-2 ${focusRing}`}
            />
          </label>
          <p className="text-sm text-muted">
            Suggested text colour: {textColor === '#ffffff' ? 'Light' : 'Dark'} (from cover contrast)
          </p>
          <canvas ref={canvasRef} className="sr-only" aria-hidden />
          <Link to={`/books/${book.id}`} className={`text-sm text-coral ${focusRing}`}>
            Preview book page
          </Link>
          <button
            type="button"
            disabled={exportBusy || uploadBusy}
            data-testid="cover-export-png"
            onClick={() => {
              setExportBusy(true)
              void renderBookCoverPng({
                book,
                authorName,
                coverUrl: book.coverUrl,
                layoutId,
                textColor,
                fallbackRgb: fallbackBg,
              })
                .then(async (blob) => {
                  const file = new File([blob], `book-${book.id}-cover.png`, { type: 'image/png' })
                  if (!profile?.id) return
                  const uploaded = await uploadCreationCover(profile.id, book.id, file, file.name)
                  if (!uploaded.ok) showToast(uploaded.error.message)
                  else {
                    setBook({ ...book, coverUrl: uploaded.data })
                    showToast('Cover exported and uploaded')
                  }
                })
                .catch(() => showToast('Could not export cover.'))
                .finally(() => setExportBusy(false))
            }}
            className={`min-h-11 self-start rounded-xl bg-coral px-4 text-sm font-semibold text-[#1a100a] disabled:opacity-50 ${focusRing}`}
          >
            Export {COVER_EXPORT_WIDTH}×{COVER_EXPORT_HEIGHT} PNG
          </button>
          <button
            type="button"
            disabled={uploadBusy}
            onClick={() =>
              void saveBookMetadata(book.id, {
                title: book.title,
                subtitle: book.subtitle,
                description: book.description,
                saleModel: book.saleModel,
                priceCents: book.priceCents,
                currency: book.currency,
                rentalDays: book.rentalDays,
                isbnInternal: book.isbnInternal,
                language: book.language,
              })
            }
            className={`min-h-11 self-start rounded-xl border border-line px-4 text-sm ${focusRing}`}
          >
            Save metadata
          </button>
          <span className="sr-only">Fallback swatch {JSON.stringify(fallbackBg)}</span>
        </div>
      </div>
    </PageContainer>
  )
}

import { useRef, useState } from 'react'
import { focusRing } from '../components/shell/navItems.ts'
import { ManuscriptImportConfirm } from '../components/books/ManuscriptImportConfirm.tsx'
import { importDocxFile, importPdfFile, importPlainTextFile, type ImportedChapter } from '../lib/books/importManuscript.ts'
import { assertManuscriptFileSize, MANUSCRIPT_FILE_TOO_LARGE } from '../lib/books/manuscriptImportLimits.ts'

type ManuscriptImportFlowProps = {
  open: boolean
  busy?: boolean
  onClose: () => void
  onImport: (chapters: ImportedChapter[]) => Promise<void>
}

export function ManuscriptImportFlow({ open, busy = false, onClose, onImport }: ManuscriptImportFlowProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportedChapter[] | null>(null)
  const [importing, setImporting] = useState(false)

  if (!open) return null

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setError(null)
    setPreview(null)
    try {
      assertManuscriptFileSize(file.size)
    } catch (sizeError) {
      setError(sizeError instanceof Error ? sizeError.message : MANUSCRIPT_FILE_TOO_LARGE)
      return
    }
    setImporting(true)
    try {
      const lower = file.name.toLowerCase()
      let chapters: ImportedChapter[]
      if (lower.endsWith('.docx')) chapters = await importDocxFile(file)
      else if (lower.endsWith('.pdf')) chapters = await importPdfFile(file)
      else chapters = await importPlainTextFile(file)
      if (chapters.length === 0) {
        setError('No text found in this file.')
        return
      }
      setPreview(chapters)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'We could not read this file. Try .txt, .docx, or .pdf.'
      setError(message)
      setPreview(null)
    } finally {
      setImporting(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function resetPreview() {
    setPreview(null)
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1a100a]/50 p-4 sm:items-center" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manuscript-import-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-surface p-4"
      >
        <h2 id="manuscript-import-title" className="font-serif text-xl text-ink">
          Import manuscript
        </h2>
        {!preview ? (
          <>
            <p className="text-sm text-muted">Upload a .txt, .docx, or .pdf file (max 10 MB). Chapter breaks are detected from headings.</p>
            <input
              ref={inputRef}
              id="manuscript-file-input"
              type="file"
              accept=".txt,.docx,.pdf,text/plain,application/pdf"
              className="sr-only"
              data-testid="manuscript-file-input"
              aria-label="Manuscript file"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <button
              type="button"
              disabled={busy || importing}
              onClick={() => inputRef.current?.click()}
              className={`min-h-11 rounded-xl border border-line px-4 text-sm font-medium ${focusRing}`}
            >
              {importing ? 'Reading file…' : 'Choose file'}
            </button>
          </>
        ) : (
          <ManuscriptImportConfirm
            chapters={preview}
            busy={busy || importing}
            onChaptersChange={setPreview}
            onCancel={resetPreview}
            onConfirm={() => void onImport(preview).then(onClose)}
          />
        )}
        {error ? (
          <p className="text-sm text-coral" role="alert">
            {error}
          </p>
        ) : null}
        {!preview ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onClose} className={`min-h-11 rounded-xl px-4 text-sm ${focusRing}`}>
              Cancel
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

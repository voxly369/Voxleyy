import { useRef, useState } from 'react'
import { focusRing } from '../components/shell/navItems.ts'
import { importDocxFile, importPdfFile, importPlainTextFile, type ImportedChapter } from '../lib/books/importManuscript.ts'

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
    setImporting(true)
    try {
      const lower = file.name.toLowerCase()
      let chapters: ImportedChapter[]
      if (lower.endsWith('.docx')) chapters = await importDocxFile(file)
      else if (lower.endsWith('.pdf')) chapters = await importPdfFile(file)
      else chapters = await importPlainTextFile(file)
      if (chapters.length === 0) {
        setError('No text found in this file.')
        setPreview(null)
        return
      }
      setPreview(chapters)
    } catch {
      setError('We could not read this file. Try .txt, .docx, or .pdf.')
      setPreview(null)
    } finally {
      setImporting(false)
    }
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
        <p className="text-sm text-muted">Upload a .txt, .docx, or .pdf file. Chapter breaks are detected from headings.</p>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.docx,.pdf,text/plain,application/pdf"
          className="sr-only"
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
        {preview ? (
          <div className="rounded-xl bg-bg p-3 text-sm">
            <p className="font-medium text-ink">{preview.length} chapters detected</p>
            <ul className="mt-2 flex flex-col gap-1 text-muted">
              {preview.slice(0, 5).map((ch) => (
                <li key={ch.title}>{ch.title}</li>
              ))}
              {preview.length > 5 ? <li>…and {preview.length - 5} more</li> : null}
            </ul>
          </div>
        ) : null}
        {error ? <p className="text-sm text-coral">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!preview || busy || importing}
            onClick={() => preview && void onImport(preview).then(onClose)}
            className={`min-h-11 rounded-xl bg-coral px-4 font-semibold text-[#1a100a] disabled:opacity-50 ${focusRing}`}
          >
            Import chapters
          </button>
          <button type="button" onClick={onClose} className={`min-h-11 rounded-xl px-4 text-sm ${focusRing}`}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

import { lazy, Suspense } from 'react'
import type { RichBodyDocument } from '../../lib/creations/bodyDocument.ts'
import { Skeleton } from '../states/Skeleton.tsx'

const RichTextEditor = lazy(() =>
  import('./RichTextEditor.tsx').then((module) => ({ default: module.RichTextEditor })),
)

type LazyRichTextEditorProps = {
  document: RichBodyDocument
  literaryLineBreaks: boolean
  onChange: (doc: RichBodyDocument, plainText: string) => void
  onBlur: () => void
}

export function LazyRichTextEditor(props: LazyRichTextEditorProps) {
  return (
    <Suspense fallback={<Skeleton variant="text-lines" lines={10} />}>
      <RichTextEditor {...props} />
    </Suspense>
  )
}

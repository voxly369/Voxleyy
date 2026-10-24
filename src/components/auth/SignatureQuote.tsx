import { SIGNATURE_QUOTE } from '../../config/brand.ts'

export function SignatureQuote() {
  return (
    <figure className="max-w-md text-sm leading-relaxed text-muted" data-testid="signature-quote">
      <blockquote className="italic">&ldquo;{SIGNATURE_QUOTE.text}&rdquo;</blockquote>
      <figcaption className="mt-1 text-xs not-italic">&mdash; {SIGNATURE_QUOTE.attribution}</figcaption>
    </figure>
  )
}

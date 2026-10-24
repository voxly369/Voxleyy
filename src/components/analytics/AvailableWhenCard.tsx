type AvailableWhenCardProps = {
  title: string
  whenLabel: string
  bullets: string[]
  testId?: string
}

export function AvailableWhenCard({ title, whenLabel, bullets, testId }: AvailableWhenCardProps) {
  return (
    <article className="rounded-2xl border border-dashed border-line bg-bg p-4" data-testid={testId}>
      <h3 className="font-serif text-lg text-ink">{title}</h3>
      <p className="mt-2 text-sm font-semibold text-muted">{whenLabel}</p>
      <ul className="mt-3 list-disc pl-5 text-sm text-muted">
        {bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  )
}

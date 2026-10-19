import { passwordChecklist } from '../../lib/auth/passwords.ts'

export function PasswordChecklist({ password }: { password: string }) {
  const items = passwordChecklist(password)

  return (
    <ul aria-label="Password requirements" className="flex flex-col gap-1 text-sm">
      {items.map((item) => (
        <li key={item.id} className={item.met ? 'text-ink' : 'text-muted'}>
          <span aria-hidden="true">{item.met ? '✓ ' : '○ '}</span>
          <span className="sr-only">{item.met ? 'Done. ' : 'Not yet. '}</span>
          {item.label}
        </li>
      ))}
    </ul>
  )
}

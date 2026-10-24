import { focusRing } from '../shell/navItems.ts'

type SubmitButtonProps = {
  children: string
  disabled?: boolean
  pending?: boolean
  'data-testid'?: string
}

export function SubmitButton({ children, disabled, pending, 'data-testid': testId }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending ? true : undefined}
      data-testid={testId}
      className={`inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-coral px-5 text-base font-semibold text-white disabled:opacity-60 ${focusRing}`}
    >
      {pending ? 'Please wait…' : children}
    </button>
  )
}

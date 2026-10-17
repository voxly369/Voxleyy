import { focusRing } from '../shell/navItems.ts'

type SubmitButtonProps = {
  children: string
  disabled?: boolean
  pending?: boolean
}

export function SubmitButton({ children, disabled, pending }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending ? true : undefined}
      className={`inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-coral px-5 text-base font-semibold text-white disabled:opacity-60 ${focusRing}`}
    >
      {pending ? 'Please wait…' : children}
    </button>
  )
}

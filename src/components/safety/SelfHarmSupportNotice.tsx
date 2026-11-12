import { focusRing } from '../shell/navItems.ts'

export function SelfHarmSupportNotice() {
  return (
    <aside
      className="rounded-2xl border border-line bg-raised/40 p-4"
      role="note"
      data-testid="self-harm-support-notice"
      aria-labelledby="self-harm-support-heading"
    >
      <h2 id="self-harm-support-heading" className="font-serif text-lg text-ink">
        You are not alone
      </h2>
      <p className="mt-2 text-sm text-ink">
        If you or someone you know needs support, these South African lines are free and confidential.
      </p>
      <ul className="mt-3 flex flex-col gap-2 text-sm text-ink">
        <li>
          <span className="font-medium">SADAG</span>{' '}
          <a href="tel:0800567567" className={`text-coral underline ${focusRing}`}>
            0800 567 567
          </a>
        </li>
        <li>
          <span className="font-medium">Emergencies</span>{' '}
          <a href="tel:10111" className={`text-coral underline ${focusRing}`}>
            10111
          </a>
          {' or '}
          <a href="tel:112" className={`text-coral underline ${focusRing}`}>
            112
          </a>
        </li>
      </ul>
    </aside>
  )
}

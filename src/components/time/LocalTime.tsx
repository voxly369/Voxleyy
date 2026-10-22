import { useEffect, useMemo, useState } from 'react'

type LocalTimeProps = {
  timezone: string
  className?: string
}

function friendlyZoneLabel(timezone: string, at: Date): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      timeZoneName: 'longGeneric',
    }).formatToParts(at)
    const name = parts.find((part) => part.type === 'timeZoneName')?.value
    return name?.trim() || 'Local time'
  } catch {
    return 'Local time'
  }
}

export function LocalTime({ timezone, className = '' }: LocalTimeProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  const timeText = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
      }).format(now)
    } catch {
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(now)
    }
  }, [now, timezone])

  const zoneLabel = useMemo(() => friendlyZoneLabel(timezone, now), [now, timezone])

  return (
    <p className={`text-sm text-muted ${className}`} data-testid="profile-local-time">
      <time dateTime={now.toISOString()}>{timeText}</time>
      <span className="sr-only">{` ${zoneLabel}`}</span>
    </p>
  )
}

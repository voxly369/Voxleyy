import { Link } from 'react-router-dom'
import { segmentMentionText } from '../../lib/engagement/mentions.ts'
import { focusRing } from '../shell/navItems.ts'

type MentionTextProps = {
  text: string
  knownUsernames: ReadonlySet<string>
}

export function MentionText({ text, knownUsernames }: MentionTextProps) {
  const segments = segmentMentionText(text)
  return (
    <span className="whitespace-pre-wrap break-words text-sm text-ink">
      {segments.map((segment, index) => {
        if (segment.kind === 'text') {
          return <span key={index}>{segment.value}</span>
        }
        if (knownUsernames.has(segment.username)) {
          return (
            <Link
              key={index}
              to={`/u/${segment.username}`}
              className={`font-medium text-coral ${focusRing}`}
            >
              {segment.value}
            </Link>
          )
        }
        return <span key={index}>{segment.value}</span>
      })}
    </span>
  )
}

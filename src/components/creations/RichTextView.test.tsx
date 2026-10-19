import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RichTextView } from './RichTextView.tsx'

describe('RichTextView', () => {
  it('renders hostile markup as visible text', () => {
    const hostile = '<img src=x onerror=alert(1)>'
    render(<RichTextView bodyJson={{ version: 1, format: 'plain', text: hostile }} bodyText={hostile} creationType="essay" />)
    expect(screen.getByText(hostile)).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })

  it('falls back to plain body_text when body_json is invalid', () => {
    render(<RichTextView bodyJson={{ version: 1, format: 'rich', content: [{ type: 'evil' }] }} bodyText="Plain fallback" creationType="essay" />)
    expect(screen.getByText('Plain fallback')).toBeInTheDocument()
  })
})

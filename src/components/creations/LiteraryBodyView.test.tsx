import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LiteraryBodyView } from './LiteraryBodyView.tsx'

describe('LiteraryBodyView', () => {
  it('renders stanza gaps without paragraph spacing between tight lines', () => {
    render(<LiteraryBodyView bodyJson={null} bodyText={'Line one\nLine two\n\nStanza two'} />)
    expect(screen.getByText('Line one')).toBeInTheDocument()
    expect(screen.getByText('Line two')).toBeInTheDocument()
    expect(screen.getByText('Stanza two')).toBeInTheDocument()
  })
})

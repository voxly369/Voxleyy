import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CreateTypePicker } from './CreateTypePicker.tsx'
import { BUILT_CREATE_PICKER_TYPES } from '../../config/productFlags.ts'
import { CREATION_TYPE_CARDS } from '../../lib/creations/creationTypes.ts'

describe('CreateTypePicker', () => {
  it('lists only built create types', () => {
    render(
      <MemoryRouter>
        <CreateTypePicker showIntro={false} />
      </MemoryRouter>,
    )
    const expectedLabels = BUILT_CREATE_PICKER_TYPES.map(
      (type) => CREATION_TYPE_CARDS.find((c) => c.type === type)!.name,
    )
    for (const label of expectedLabels) {
      expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeVisible()
    }
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()
    expect(screen.queryByText('Recitation video')).not.toBeInTheDocument()
    expect(screen.queryByText('Collab post')).not.toBeInTheDocument()
    expect(screen.queryByText('Poem')).not.toBeInTheDocument()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ModalStackProvider } from '../lib/shell/modalStack.tsx'
import CreationPage from './CreationPage.tsx'

vi.mock('../lib/auth/auth-context.ts', () => ({
  useAuth: () => ({ profile: { id: 'viewer-1' } }),
}))

vi.mock('../lib/languages/useViewerContentLanguages.ts', () => ({
  useViewerContentLanguages: () => [],
}))

vi.mock('../lib/views/recordView.ts', () => ({
  recordCreationView: vi.fn(),
}))

vi.mock('../lib/supabaseClient.ts', () => ({
  supabase: {
    auth: { getSession: vi.fn(async () => ({ data: { session: null } })) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null }),
        }),
      }),
    }),
  },
}))

vi.mock('../lib/creations/api.ts', () => ({
  getCreationById: vi.fn(),
  publishCreation: vi.fn(),
  saveCreationFields: vi.fn(),
  deleteCreation: vi.fn(),
  unpublishCreation: vi.fn(),
  fetchProfileRole: vi.fn(),
}))

import { getCreationById } from '../lib/creations/api.ts'

describe('CreationPage self-harm support', () => {
  it('renders support notice for self-harm topic posts', async () => {
    vi.mocked(getCreationById).mockResolvedValue({
      ok: true,
      data: {
        id: 'post-1',
        type: 'written_post',
        title: 'Honest piece',
        caption: null,
        bodyText: 'Body',
        bodyJson: null,
        coverUrl: null,
        status: 'published',
        audience: 'public',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        genre: null,
        mood: null,
        language: 'en',
        isOwn: false,
        isRemoved: false,
        removedReason: null,
        autoHiddenAt: null,
        autoHideModerationActionId: null,
        containsSexualContent: false,
        isMatureContent: false,
        isSelfHarmTopic: true,
        containsSelfHarmMethods: false,
        author: {
          id: 'a1',
          username: 'writer',
          displayName: 'Writer',
          avatarUrl: null,
          verified: false,
        },
      },
    })

    render(
      <ModalStackProvider>
        <MemoryRouter initialEntries={['/c/post-1']}>
          <Routes>
            <Route path="/c/:id" element={<CreationPage />} />
          </Routes>
        </MemoryRouter>
      </ModalStackProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('self-harm-support-notice')).toBeInTheDocument()
    })
    expect(screen.getByText(/SADAG/i)).toBeInTheDocument()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CoverStudioToolbar } from './CoverStudioToolbar.tsx'

describe('CoverStudioToolbar', () => {
  it('fires undo and export actions', async () => {
    const user = userEvent.setup()
    const onUndo = vi.fn()
    const onExport = vi.fn()
    render(
      <CoverStudioToolbar
        canUndo
        canRedo={false}
        showGrid={false}
        showSafeArea
        saveLabel="Saved"
        exportBusy={false}
        canGroup={false}
        canUngroup={false}
        canAlign
        onUndo={onUndo}
        onRedo={() => {}}
        onToggleGrid={() => {}}
        onToggleSafeArea={() => {}}
        onGroup={() => {}}
        onUngroup={() => {}}
        onAlignCenter={() => {}}
        onExport={onExport}
        onImportFinished={() => {}}
      />,
    )
    await user.click(screen.getByTestId('cover-undo'))
    await user.click(screen.getByTestId('cover-export-png'))
    expect(onUndo).toHaveBeenCalled()
    expect(onExport).toHaveBeenCalled()
  })
})

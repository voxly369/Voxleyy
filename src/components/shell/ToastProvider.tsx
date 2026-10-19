import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ToastContext, type ToastAction, type ToastContextValue } from '../../lib/shell/toastContext.ts'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; action?: ToastAction } | null>(null)

  const showToast = useCallback((message: string, action?: ToastAction) => {
    setToast({ message, action })
    window.setTimeout(() => setToast(null), 5000)
  }, [])

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          role="status"
          className="fixed bottom-[calc(var(--nav-h)+1rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex max-w-[min(100%-2rem,24rem)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lg lg:bottom-8"
        >
          <p className="flex-1 text-sm text-ink">{toast.message}</p>
          {toast.action ? (
            <button type="button" onClick={toast.action.onClick} className="text-sm font-semibold text-coral">
              {toast.action.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </ToastContext.Provider>
  )
}

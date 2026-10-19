import { createContext } from 'react'

export type ToastAction = { label: string; onClick: () => void }

export type ToastContextValue = {
  showToast: (message: string, action?: ToastAction) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

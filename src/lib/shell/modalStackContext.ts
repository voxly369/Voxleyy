import { createContext } from 'react'

export const VOXLY_APP_ROOT_ID = 'voxly-app-root'

export type ModalRegistration = {
  id: string
  panel: HTMLElement | null
  onClose: () => void
  closeOnEscape: boolean
}

export type ModalStackContextValue = {
  register: (entry: ModalRegistration) => void
  unregister: (id: string) => void
  isTop: (id: string) => boolean
  depth: (id: string) => number
}

export const ModalStackContext = createContext<ModalStackContextValue | null>(null)

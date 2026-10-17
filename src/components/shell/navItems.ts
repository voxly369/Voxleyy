import type { ComponentType } from 'react'
import { DiscoverIcon } from '../icons/DiscoverIcon.tsx'
import { HomeIcon } from '../icons/HomeIcon.tsx'
import { MessagesIcon } from '../icons/MessagesIcon.tsx'
import { PlusIcon } from '../icons/PlusIcon.tsx'
import { ProfileIcon } from '../icons/ProfileIcon.tsx'
import { SettingsIcon } from '../icons/SettingsIcon.tsx'

export type NavIcon = ComponentType<{ filled?: boolean; className?: string }>

export type NavItem = {
  to: string
  label: string
  icon: NavIcon
  end?: boolean
  create?: boolean
}

export const navItems: readonly NavItem[] = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/discover', label: 'Discover', icon: DiscoverIcon },
  { to: '/create', label: 'Create', icon: PlusIcon, create: true },
  { to: '/messages', label: 'Messages', icon: MessagesIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
  { to: '/profile', label: 'Profile', icon: ProfileIcon },
]

export const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral'

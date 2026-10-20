import type { ComponentType } from 'react'
import { DiscoverIcon } from '../icons/DiscoverIcon.tsx'
import { HomeIcon } from '../icons/HomeIcon.tsx'
import { MessagesIcon } from '../icons/MessagesIcon.tsx'
import { PlusIcon } from '../icons/PlusIcon.tsx'
import { ProfileIcon } from '../icons/ProfileIcon.tsx'
export type NavIcon = ComponentType<{ filled?: boolean; className?: string }>

export type NavItem = {
  to: string
  label: string
  icon: NavIcon
  end?: boolean
  create?: boolean
}

export function railNavItems(username: string): readonly NavItem[] {
  return [
    { to: '/', label: 'Home', icon: HomeIcon, end: true },
    { to: '/discover', label: 'Discover', icon: DiscoverIcon },
    { to: '/messages', label: 'Messages', icon: MessagesIcon },
    { to: '/create', label: 'Create', icon: PlusIcon, create: true },
    { to: `/u/${username}`, label: 'Profile', icon: ProfileIcon, end: true },
  ]
}

/** Mobile bottom bar: Home, Discover, Create (+), Messages, Profile. */
export function bottomNavItems(username: string): readonly NavItem[] {
  return [
    { to: '/', label: 'Home', icon: HomeIcon, end: true },
    { to: '/discover', label: 'Discover', icon: DiscoverIcon },
    { to: '/create', label: 'Create', icon: PlusIcon, create: true },
    { to: '/messages', label: 'Messages', icon: MessagesIcon },
    { to: `/u/${username}`, label: 'Profile', icon: ProfileIcon, end: true },
  ]
}

/** @deprecated Use railNavItems or bottomNavItems. */
export function primaryNavItems(username: string): readonly NavItem[] {
  return bottomNavItems(username)
}

export const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral'

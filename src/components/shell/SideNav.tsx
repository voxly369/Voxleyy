import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { focusRing, primaryNavItems } from './navItems.ts'

export function SideNav() {
  const { profile } = useAuth()
  const navItems = primaryNavItems(profile?.username ?? '')

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface px-4 py-6 lg:flex"
    >
      <Link to="/" className={`rounded-xl px-2 font-serif text-3xl text-ink ${focusRing}`}>
        Voxly
      </Link>
      <ul className="mt-8 flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  item.create
                    ? `flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-coral px-4 font-semibold text-white ${isActive ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''} ${focusRing}`
                    : `flex min-h-11 items-center gap-3 rounded-2xl px-3 ${isActive ? 'bg-raised font-semibold text-coral' : 'font-medium text-muted'} ${focusRing}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon filled={isActive} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'
import {
  LayoutDashboard, Users, ClipboardList, Calendar, Bell,
  Package, FileText, CreditCard, AlertTriangle, ClipboardCheck,
  Settings, Menu, X, LogOut
} from 'lucide-react'

const navItems = [
  { to: '/',            label: 'Dashboard',     icon: LayoutDashboard, roles: null },
  { to: '/calciatori',  label: 'Calciatori',    icon: Users,           roles: ['admin'] },
  { to: '/presenze',    label: 'Presenze',       icon: ClipboardList,   roles: null },
  { to: '/calendario',  label: 'Calendario',    icon: Calendar,        roles: null },
  { to: '/convocazioni',label: 'Convocazioni',  icon: Bell,            roles: null },
  { to: '/materiale',   label: 'Materiale',     icon: Package,         roles: null },
  { to: '/documenti',   label: 'Documenti',     icon: FileText,        roles: null },
  { to: '/cedolini',    label: 'Cedolini',      icon: CreditCard,      roles: ['admin','mister','player_paid'] },
  { to: '/sanzioni',    label: 'Sanzioni',      icon: AlertTriangle,   roles: ['admin'] },
  { to: '/distinta',    label: 'Distinta Gara', icon: ClipboardCheck,  roles: ['admin'] },
  { to: '/impostazioni',label: 'Impostazioni',  icon: Settings,        roles: null },
]

export default function Layout() {
  const { profile, signOut, isAdmin, isMister, isPaid, isVolunteer } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const role = profile?.role
  const initials = `${profile?.nome?.[0] || ''}${profile?.cognome?.[0] || ''}`.toUpperCase()

  const filtered = navItems.filter(item =>
    !item.roles || item.roles.includes(role)
  )

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-[#1E1E1E] border-r border-[#2A2A2A]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#2A2A2A]">
        <div className="w-9 h-9 rounded-full bg-[#C00000] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">SC</div>
        <div>
          <div className="text-white font-semibold text-sm leading-tight">SoccerClub</div>
          <div className="text-[#6B7280] text-xs leading-tight">ASD Castelmauro 1986</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {filtered.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-[#C00000] text-white font-medium'
                : 'text-[#6B7280] hover:text-white hover:bg-[#2A2A2A]'
            )}>
            <Icon size={17}/> {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-[#2A2A2A] p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#C00000]/20 text-[#C00000] flex items-center justify-center text-xs font-bold flex-shrink-0">
            {initials || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{profile?.nome} {profile?.cognome}</div>
            <div className="text-[#6B7280] text-xs truncate">{profile?.role}</div>
          </div>
          <button onClick={handleLogout} className="text-[#6B7280] hover:text-white transition-colors">
            <LogOut size={15}/>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#121212] overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-60 flex-shrink-0">
        <Sidebar/>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)}/>
          <div className="absolute left-0 top-0 bottom-0 w-60 z-50">
            <Sidebar/>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-[#1E1E1E] border-b border-[#2A2A2A] flex items-center px-4 gap-3 flex-shrink-0">
          <button className="md:hidden text-[#6B7280] hover:text-white" onClick={() => setOpen(!open)}>
            {open ? <X size={20}/> : <Menu size={20}/>}
          </button>
          <div className="flex-1"/>
          <span className="text-sm text-[#6B7280]">{profile?.nome} {profile?.cognome}</span>
          <div className="w-8 h-8 rounded-full bg-[#C00000]/20 text-[#C00000] flex items-center justify-center text-xs font-bold">
            {initials || '?'}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet/>
        </main>
      </div>
    </div>
  )
}

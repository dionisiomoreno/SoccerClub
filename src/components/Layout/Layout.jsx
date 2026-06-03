import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'
import {
  LayoutDashboard, Users, ClipboardList, Calendar, Bell,
  Package, FileText, CreditCard, AlertTriangle, ClipboardCheck,
  Settings, Menu, X, LogOut, ChevronRight
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
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const role = profile?.role
  const initials = `${profile?.nome?.[0] || ''}${profile?.cognome?.[0] || ''}`.toUpperCase()

  const filtered = navItems.filter(item => !item.roles || item.roles.includes(role))

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{background:'#2f4050'}}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 bg-[#1ab394]">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">SC</div>
        <div>
          <div className="text-white font-bold text-sm leading-tight">SoccerClub</div>
          <div className="text-white/70 text-xs leading-tight">ASD Castelmauro 1986</div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 bg-[#293846] flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#1ab394] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initials || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-medium truncate">{profile?.nome} {profile?.cognome}</div>
          <div className="text-white/50 text-xs truncate">{profile?.role}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        <div className="px-4 py-2">
          <span className="text-white/30 text-xs uppercase tracking-wider font-semibold">Menu</span>
        </div>
        {filtered.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative',
              isActive
                ? 'bg-[#293846] text-white border-l-4 border-[#1ab394]'
                : 'text-white/60 hover:text-white hover:bg-[#293846]/50 border-l-4 border-transparent'
            )}>
            <Icon size={16}/>
            <span>{label}</span>
            <ChevronRight size={12} className="ml-auto opacity-40"/>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-white/60 hover:text-white hover:bg-[#293846]/50 rounded text-sm transition-colors">
          <LogOut size={15}/>
          <span>Disconnetti</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#f3f3f4] overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-56 flex-shrink-0 shadow-nav">
        <Sidebar/>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)}/>
          <div className="absolute left-0 top-0 bottom-0 w-56 z-50">
            <Sidebar/>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-[#e7eaec] flex items-center px-4 gap-3 flex-shrink-0 shadow-nav">
          <button className="md:hidden text-[#999] hover:text-[#676a6c]" onClick={() => setOpen(!open)}>
            {open ? <X size={20}/> : <Menu size={20}/>}
          </button>
          {/* Breadcrumb */}
          <div className="flex-1">
            <span className="text-sm text-[#999]">Benvenuto in <strong className="text-[#676a6c]">SoccerClub</strong></span>
          </div>
          {/* User */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#676a6c] hidden sm:block">{profile?.nome} {profile?.cognome}</span>
            <div className="w-8 h-8 rounded-full bg-[#1ab394] flex items-center justify-center text-white text-xs font-bold">
              {initials || '?'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet/>
        </main>
      </div>
    </div>
  )
}

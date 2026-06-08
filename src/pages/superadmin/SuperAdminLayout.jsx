import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'
import {
  LayoutDashboard, Building2, CreditCard, LogOut, Menu, X, Shield
} from 'lucide-react'

const navItems = [
  { to: '/superadmin',         label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/superadmin/clubs',   label: 'Squadre',    icon: Building2 },
  { to: '/superadmin/licenses',label: 'Licenze',    icon: CreditCard },
]

export default function SuperAdminLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleLogout() { await signOut(); navigate('/login') }

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-[#1a1a2e]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 bg-[#e94560]">
        <Shield size={20} className="text-white flex-shrink-0"/>
        <div>
          <div className="text-white font-bold text-sm leading-tight">SoccerClub</div>
          <div className="text-white/70 text-xs">Super Admin</div>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-3 bg-black/20 flex items-center gap-3 border-b border-white/10">
        <div className="w-8 h-8 rounded-full bg-[#e94560] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          SA
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-medium truncate">{profile?.nome} {profile?.cognome}</div>
          <div className="text-white/50 text-xs">Super Admin</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-4',
              isActive
                ? 'bg-black/20 text-white border-[#e94560]'
                : 'text-white/60 hover:text-white hover:bg-black/10 border-transparent'
            )}>
            <Icon size={16}/>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-white/60 hover:text-white hover:bg-black/20 rounded text-sm">
          <LogOut size={15}/><span>Disconnetti</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#f3f3f4] overflow-hidden">
      <div className="hidden md:block w-56 flex-shrink-0"><Sidebar/></div>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)}/>
          <div className="absolute left-0 top-0 bottom-0 w-56 z-50"><Sidebar/></div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-[#e7eaec] flex items-center px-4 gap-3">
          <button className="md:hidden text-[#999]" onClick={() => setOpen(!open)}>
            {open ? <X size={20}/> : <Menu size={20}/>}
          </button>
          <div className="flex-1">
            <span className="text-xs font-semibold px-2 py-1 rounded bg-[#e94560]/10 text-[#e94560]">
              🛡️ Super Admin Panel
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#676a6c] hidden sm:block">{profile?.email}</span>
            <div className="w-8 h-8 rounded-full bg-[#e94560] flex items-center justify-center text-white text-xs font-bold">
              SA
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet/>
        </main>
      </div>
    </div>
  )
}

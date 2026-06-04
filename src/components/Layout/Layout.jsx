import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import clsx from 'clsx'
import {
  LayoutDashboard, Users, ClipboardList, Calendar, Bell,
  Package, FileText, CreditCard, AlertTriangle, ClipboardCheck,
  Settings, Menu, X, LogOut, ChevronRight, Check, Trash2,
  Baby, Wallet, ShoppingBag, Megaphone, MessageCircle, UserCog
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

const navItems = [
  // Prima Squadra
  { to: '/',             label: 'Dashboard',      icon: LayoutDashboard, roles: null,                          section: 'Prima Squadra' },
  { to: '/calciatori',   label: 'Calciatori',     icon: Users,           roles: ['admin'],                     section: null },
  { to: '/presenze',     label: 'Presenze',        icon: ClipboardList,   roles: null,                          section: null },
  { to: '/calendario',   label: 'Calendario',     icon: Calendar,        roles: null,                          section: null },
  { to: '/convocazioni', label: 'Convocazioni',   icon: Bell,            roles: null,                          section: null },
  { to: '/materiale',    label: 'Materiale',      icon: Package,         roles: null,                          section: null },
  { to: '/documenti',    label: 'Documenti',      icon: FileText,        roles: null,                          section: null },
  { to: '/cedolini',     label: 'Cedolini',       icon: CreditCard,      roles: ['admin','mister','player_paid'], section: null },
  { to: '/sanzioni',     label: 'Sanzioni',       icon: AlertTriangle,   roles: ['admin'],                     section: null },
  { to: '/mister',       label: 'Mister',         icon: UserCog,         roles: ['admin'],                     section: null },
  { to: '/distinta',     label: 'Distinta Gara',  icon: ClipboardCheck,  roles: ['admin'],                     section: null },
  // Scuola Calcio
  { to: '/sc/atleti',    label: 'Atleti',         icon: Baby,            roles: ['admin','segreteria'],        section: 'Scuola Calcio' },
  { to: '/sc/pagamenti', label: 'Pagamenti',      icon: Wallet,          roles: ['admin','segreteria'],        section: null },
  { to: '/sc/magazzino', label: 'Magazzino',      icon: ShoppingBag,     roles: ['admin','segreteria'],        section: null },
  { to: '/sc/bacheca',   label: 'Bacheca',        icon: Megaphone,       roles: ['admin','segreteria','mister'], section: null },
  { to: '/sc/chat',      label: 'Chat',           icon: MessageCircle,   roles: null,                          section: null },
  // Comune
  { to: '/impostazioni', label: 'Impostazioni',   icon: Settings,        roles: null,                          section: 'Generale' },
]

const TYPE_ICONS = {
  payslip_generated: '💰',
  request_approved: '✅',
  request_rejected: '❌',
  match_time_changed: '🕐',
  callup_published: '📋',
}

function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    loadNotifications()
    const channel = supabase.channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        payload => setNotifications(prev => [payload.new, ...prev]))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [userId])

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function loadNotifications() {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
    setNotifications(data || [])
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function deleteNotification(id) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const unread = notifications.filter(n => !n.read).length

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative p-2 text-[#999] hover:text-[#676a6c] transition-colors">
        <Bell size={18}/>
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#ed5565] text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-[#e7eaec] rounded shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e7eaec]">
            <h3 className="text-sm font-bold text-[#2f4050]">Notifiche</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#1ab394] hover:underline flex items-center gap-1">
                <Check size={12}/> Tutte lette
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center text-[#999] py-8 text-sm">Nessuna notifica</div>
            ) : notifications.map(n => (
              <div key={n.id} className={clsx('flex items-start gap-3 px-4 py-3 border-b border-[#e7eaec] hover:bg-gray-50', !n.read && 'bg-[#1ab394]/5')}>
                <span className="text-lg flex-shrink-0">{TYPE_ICONS[n.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm', !n.read ? 'text-[#2f4050] font-medium' : 'text-[#676a6c]')}>{n.message}</p>
                  <p className="text-xs text-[#999] mt-0.5">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: it })}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {!n.read && <button onClick={() => markRead(n.id)} className="text-[#999] hover:text-[#1ab394]"><Check size={13}/></button>}
                  <button onClick={() => deleteNotification(n.id)} className="text-[#999] hover:text-red-500"><Trash2 size={13}/></button>
                </div>
              </div>
            ))}
          </div>
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-[#e7eaec]">
              <button onClick={() => { setNotifications([]); supabase.from('notifications').delete().eq('user_id', userId) }}
                className="text-xs text-[#999] hover:text-red-500 w-full text-center">Elimina tutte</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const role = profile?.role
  const initials = `${profile?.nome?.[0] || ''}${profile?.cognome?.[0] || ''}`.toUpperCase()
  const filtered = navItems.filter(item => !item.roles || item.roles.includes(role))

  async function handleLogout() { await signOut(); navigate('/login') }

  const Sidebar = () => {
    let lastSection = null
    return (
      <div className="flex flex-col h-full" style={{ background: '#2f4050' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 bg-[#1ab394]">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">SC</div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">SoccerClub</div>
            <div className="text-white/70 text-xs leading-tight">ASD Castelmauro 1986</div>
          </div>
        </div>

        {/* User */}
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
          {filtered.map(({ to, label, icon: Icon, section }) => {
            const showSection = section && section !== lastSection
            if (showSection) lastSection = section
            return (
              <div key={to}>
                {showSection && (
                  <div className="px-4 pt-4 pb-1">
                    <span className="text-white/30 text-xs uppercase tracking-wider font-semibold">{section}</span>
                  </div>
                )}
                <NavLink to={to} end={to === '/'}
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
              </div>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-white/60 hover:text-white hover:bg-[#293846]/50 rounded text-sm transition-colors">
            <LogOut size={15}/><span>Disconnetti</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#f3f3f4] overflow-hidden">
      <div className="hidden md:block w-56 flex-shrink-0 shadow-nav"><Sidebar/></div>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)}/>
          <div className="absolute left-0 top-0 bottom-0 w-56 z-50"><Sidebar/></div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-[#e7eaec] flex items-center px-4 gap-3 flex-shrink-0">
          <button className="md:hidden text-[#999] hover:text-[#676a6c]" onClick={() => setOpen(!open)}>
            {open ? <X size={20}/> : <Menu size={20}/>}
          </button>
          <div className="flex-1">
            <span className="text-sm text-[#999]">Benvenuto in <strong className="text-[#676a6c]">SoccerClub</strong></span>
          </div>
          {profile?.id && <NotificationBell userId={profile.id}/>}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#676a6c] hidden sm:block">{profile?.nome} {profile?.cognome}</span>
            <div className="w-8 h-8 rounded-full bg-[#1ab394] flex items-center justify-center text-white text-xs font-bold">
              {initials || '?'}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6"><Outlet/></main>
      </div>
    </div>
  )
}

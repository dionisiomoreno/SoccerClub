import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
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

const ROLE_LABELS = {
  admin: 'Società',
  mister: 'Mister',
  player_paid: 'Calciatore',
  player_volunteer: 'Volontario',
  segreteria: 'Segreteria'
}

const NAV_PRIMA_SQUADRA = [
  { to: '/',             label: 'Dashboard',      icon: LayoutDashboard, roles: null },
  { to: '/calciatori',   label: 'Calciatori',     icon: Users,           roles: ['admin'] },
  { to: '/presenze',     label: 'Presenze',       icon: ClipboardList,   roles: null },
  { to: '/calendario',   label: 'Calendario',     icon: Calendar,        roles: null },
  { to: '/convocazioni', label: 'Convocazioni',   icon: Bell,            roles: null },
  { to: '/materiale',    label: 'Materiale',      icon: Package,         roles: null },
  { to: '/documenti',    label: 'Documenti',      icon: FileText,        roles: null },
  { to: '/cedolini',     label: 'Cedolini',       icon: CreditCard,      roles: ['admin','mister','player_paid'] },
  { to: '/sanzioni',     label: 'Sanzioni',       icon: AlertTriangle,   roles: ['admin'] },
  { to: '/mister',       label: 'Mister',         icon: UserCog,         roles: ['admin'] },
  { to: '/distinta',     label: 'Distinta Gara',  icon: ClipboardCheck,  roles: ['admin'] },
  { to: '/chat',         label: 'Chat Squadra',   icon: MessageCircle,   roles: null },
  { to: '/impostazioni', label: 'Impostazioni',   icon: Settings,        roles: null },
]

const NAV_SCUOLA_CALCIO = [
  { to: '/sc/atleti',    label: 'Atleti',         icon: Baby,            roles: ['admin','segreteria'] },
  { to: '/sc/pagamenti', label: 'Pagamenti',      icon: Wallet,          roles: ['admin','segreteria'] },
  { to: '/sc/magazzino', label: 'Magazzino',      icon: ShoppingBag,     roles: ['admin','segreteria'] },
  { to: '/sc/bacheca',   label: 'Bacheca',        icon: Megaphone,       roles: ['admin','segreteria','mister'] },
  { to: '/sc/chat',      label: 'Chat',           icon: MessageCircle,   roles: null },
  { to: '/impostazioni', label: 'Impostazioni',   icon: Settings,        roles: ['admin'] },
]

const TYPE_ICONS = {
  payslip_generated: '💰',
  request_approved: '✅',
  request_rejected: '❌',
  match_time_changed: '🕐',
  callup_published: '📋',
  new_announcement: '📢',
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
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [modules, setModules] = useState({ modulo_prima_squadra: true, modulo_scuola_calcio: false })
  const [mode, setMode] = useState(location.pathname.startsWith('/sc/') ? 'sc' : 'ps')

  useEffect(() => {
    supabase.from('team_settings').select('modulo_prima_squadra, modulo_scuola_calcio').single()
      .then(({ data }) => {
        if (data) {
          setModules(data)
          if (!data.modulo_prima_squadra && data.modulo_scuola_calcio) {
            setMode('sc')
            if (!location.pathname.startsWith('/sc/')) navigate('/sc/atleti')
          }
          if (data.modulo_prima_squadra && !data.modulo_scuola_calcio) {
            setMode('ps')
            if (location.pathname.startsWith('/sc/')) navigate('/')
          }
        }
      })
  }, [])

  useEffect(() => {
    if (location.pathname === '/impostazioni') return
    setMode(location.pathname.startsWith('/sc/') ? 'sc' : 'ps')
  }, [location.pathname])

  const role = profile?.role
  const initials = `${profile?.nome?.[0] || ''}${profile?.cognome?.[0] || ''}`.toUpperCase()
  const navItems = mode === 'sc' ? NAV_SCUOLA_CALCIO : NAV_PRIMA_SQUADRA
  const filtered = navItems.filter(item => !item.roles || item.roles.includes(role))

  async function handleLogout() { await signOut(); navigate('/login') }

  function switchMode(newMode) {
    setMode(newMode)
    setOpen(false)
    if (newMode === 'sc') navigate('/sc/atleti')
    else navigate('/')
  }

  const bothEnabled = modules.modulo_prima_squadra && modules.modulo_scuola_calcio

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{ background: mode === 'sc' ? '#2c3e50' : '#2f4050' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4" style={{ background: mode === 'sc' ? '#27ae60' : '#1ab394' }}>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {mode === 'sc' ? '🏫' : 'SC'}
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-tight">SoccerClub</div>
          <div className="text-white/70 text-xs leading-tight">
            {mode === 'sc' ? 'Scuola Calcio' : 'Prima Squadra'}
          </div>
        </div>
      </div>

      {/* Selettore modalità */}
      {bothEnabled && (
        <div className="p-2 bg-black/20">
          <div className="flex rounded-lg overflow-hidden">
            <button onClick={() => switchMode('ps')}
              className={clsx('flex-1 py-1.5 text-xs font-semibold transition-colors',
                mode === 'ps' ? 'bg-[#1ab394] text-white' : 'text-white/50 hover:text-white/80')}>
              ⚽ Prima Squadra
            </button>
            <button onClick={() => switchMode('sc')}
              className={clsx('flex-1 py-1.5 text-xs font-semibold transition-colors',
                mode === 'sc' ? 'bg-[#27ae60] text-white' : 'text-white/50 hover:text-white/80')}>
              🏫 Scuola Calcio
            </button>
          </div>
        </div>
      )}

      {/* User */}
      <div className="px-4 py-3 bg-black/20 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: mode === 'sc' ? '#27ae60' : '#1ab394' }}>
          {initials || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-medium truncate">{profile?.nome} {profile?.cognome}</div>
          <div className="text-white/50 text-xs truncate">
            {ROLE_LABELS[profile?.role] || profile?.role}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        <div className="px-4 py-2">
          <span className="text-white/30 text-xs uppercase tracking-wider font-semibold">
            {mode === 'sc' ? 'Scuola Calcio' : 'Prima Squadra'}
          </span>
        </div>
        {filtered.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative',
              isActive
                ? clsx('bg-black/20 text-white border-l-4', mode === 'sc' ? 'border-[#27ae60]' : 'border-[#1ab394]')
                : 'text-white/60 hover:text-white hover:bg-black/10 border-l-4 border-transparent'
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
          className="flex items-center gap-2 w-full px-3 py-2 text-white/60 hover:text-white hover:bg-black/20 rounded text-sm transition-colors">
          <LogOut size={15}/><span>Disconnetti</span>
        </button>
      </div>
    </div>
  )

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
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-1 rounded"
              style={{ background: mode === 'sc' ? '#27ae6015' : '#1ab39415', color: mode === 'sc' ? '#27ae60' : '#1ab394' }}>
              {mode === 'sc' ? '🏫 Scuola Calcio' : '⚽ Prima Squadra'}
            </span>
          </div>
          {profile?.id && <NotificationBell userId={profile.id}/>}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#676a6c] hidden sm:block">{profile?.nome} {profile?.cognome}</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: mode === 'sc' ? '#27ae60' : '#1ab394' }}>
              {initials || '?'}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6"><Outlet/></main>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import clsx from 'clsx'
import {
  LayoutDashboard, Users, ClipboardList, Calendar, Bell,
  Package, FileText, CreditCard, AlertTriangle, ClipboardCheck,
  Settings, Menu, X, LogOut, Check, Trash2,
  Baby, Wallet, ShoppingBag, Megaphone, MessageCircle, UserCog,
  Dumbbell, BookOpen, Upload
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { useTheme } from '../../context/ThemeContext'

const ROLE_LABELS = {
  admin: 'Società', mister: 'Mister',
  player_paid: 'Calciatore', player_volunteer: 'Volontario', segreteria: 'Segreteria'
}

const NAV_PRIMA_SQUADRA = [
  { to: '/',             label: 'Dashboard',     icon: LayoutDashboard, roles: null,                             group: null },
  { to: '/calciatori',   label: 'Calciatori',    icon: Users,           roles: ['admin','mister'],               group: 'Squadra' },
  { to: '/mister',       label: 'Mister',        icon: UserCog,         roles: ['admin'],                        group: 'Squadra' },
  { to: '/presenze',     label: 'Presenze',      icon: ClipboardList,   roles: null,                             group: 'Squadra' },
  { to: '/allenamenti',  label: 'Allenamenti',   icon: Dumbbell,        roles: ['admin','mister'],               group: 'Squadra' },
  { to: '/convocazioni', label: 'Convocazioni',  icon: Bell,            roles: null,                             group: 'Squadra' },
  { to: '/calendario',   label: 'Calendario',    icon: Calendar,        roles: null,                             group: 'Gare' },
  { to: '/distinta',     label: 'Distinta Gara', icon: ClipboardCheck,  roles: ['admin'],                        group: 'Gare' },
  { to: '/materiale',    label: 'Materiale',     icon: Package,         roles: null,                             group: 'Gestione' },
  { to: '/documenti',    label: 'Documenti',     icon: FileText,        roles: null,                             group: 'Gestione' },
  { to: '/cedolini',     label: 'Cedolini',      icon: CreditCard,      roles: ['admin','mister','player_paid'], group: 'Economico' },
  { to: '/sanzioni',     label: 'Sanzioni',      icon: AlertTriangle,   roles: ['admin'],                        group: 'Economico' },
  { to: '/contabilita',  label: 'Contabilità',   icon: BookOpen,        roles: ['admin','segreteria'],           group: 'Economico' },
  { to: '/bacheca-ps',   label: 'Bacheca',       icon: Megaphone,       roles: null,                             group: 'Comunicazioni' },
  { to: '/chat',         label: 'Chat Squadra',  icon: MessageCircle,   roles: null,                             group: 'Comunicazioni' },
  { to: '/impostazioni', label: 'Impostazioni',  icon: Settings,        roles: null,                             group: null },
]

const NAV_SCUOLA_CALCIO = [
  { to: '/',               label: 'Dashboard',    icon: LayoutDashboard, roles: null,                              group: null },
  { to: '/sc/atleti',      label: 'Atleti',       icon: Baby,            roles: ['admin','segreteria','mister'],   group: 'Squadra' },
  { to: '/sc/mister',      label: 'Mister SC',    icon: UserCog,         roles: ['admin','segreteria'],            group: 'Squadra' },
  { to: '/sc/presenze',    label: 'Presenze SC',  icon: ClipboardList,   roles: ['admin','segreteria','mister'],   group: 'Squadra' },
  { to: '/sc/allenamenti', label: 'Allenamenti',  icon: Dumbbell,        roles: ['admin','segreteria','mister'],   group: 'Squadra' },
  { to: '/calendario',     label: 'Calendario',   icon: Calendar,        roles: null,                              group: 'Gare' },
  { to: '/sc/magazzino',   label: 'Magazzino',    icon: ShoppingBag,     roles: ['admin','segreteria'],            group: 'Gestione' },
  { to: '/documenti',      label: 'Documenti',    icon: FileText,        roles: null,                              group: 'Gestione' },
  { to: '/sc/pagamenti',   label: 'Pagamenti',    icon: Wallet,          roles: ['admin','segreteria'],            group: 'Economico' },
  { to: '/sc/contabilita', label: 'Contabilità', icon: BookOpen, roles: ['admin','segreteria'], group: 'Economico' },
  { to: '/sc/bacheca',     label: 'Bacheca',      icon: Megaphone,       roles: ['admin','segreteria','mister'],   group: 'Comunicazioni' },
  { to: '/sc/chat',        label: 'Chat',         icon: MessageCircle,   roles: null,                              group: 'Comunicazioni' },
  { to: '/impostazioni',   label: 'Impostazioni', icon: Settings,        roles: ['admin'],                         group: null },
]

const TYPE_ICONS = {
  payslip_generated:'💰', request_approved:'✅', request_rejected:'❌',
  match_time_changed:'🕐', callup_published:'📋', new_announcement:'📢',
}

// Colori distinti per modalità
const THEME = {
  ps: { primary: '#1c3d6b', accent: '#2563eb', bg: '#0f2340', label: '⚽ Prima Squadra' },
  sc: { primary: '#166534', accent: '#16a34a', bg: '#0f3320', label: '🏫 Scuola Calcio'  },
}

function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    loadNotifications()
    const channel = supabase.channel('notifications')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications', filter:`user_id=eq.${userId}` },
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
      <button onClick={() => setOpen(!open)} className="relative p-2 text-[#999] hover:text-[#676a6c]">
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
            {unread > 0 && <button onClick={markAllRead} className="text-xs text-[#1ab394] hover:underline flex items-center gap-1"><Check size={12}/> Tutte lette</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0
              ? <div className="text-center text-[#999] py-8 text-sm">Nessuna notifica</div>
              : notifications.map(n => (
                <div key={n.id} className={clsx('flex items-start gap-3 px-4 py-3 border-b border-[#e7eaec] hover:bg-gray-50', !n.read && 'bg-blue-50/40')}>
                  <span className="text-lg flex-shrink-0">{TYPE_ICONS[n.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm', !n.read ? 'text-[#2f4050] font-medium' : 'text-[#676a6c]')}>{n.message}</p>
                    <p className="text-xs text-[#999] mt-0.5">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: it })}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!n.read && <button onClick={() => markRead(n.id)} className="text-[#999] hover:text-blue-500"><Check size={13}/></button>}
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
  const navigate     = useNavigate()
  const location     = useLocation()
  const logoInputRef = useRef()
  const [open,      setOpen]     = useState(false)
  const [modules,   setModules]  = useState({ modulo_prima_squadra: true, modulo_scuola_calcio: false })
  const [mode,      setMode]     = useState(location.pathname.startsWith('/sc/') ? 'sc' : 'ps')
  const [logoUrl,   setLogoUrl]  = useState(null)
  const [uploading, setUploading]= useState(false)

  const role          = profile?.role
  const isPlayer      = role === 'player_paid' || role === 'player_volunteer'
  const isMister      = role === 'mister'
  const isAdmin       = role === 'admin'
  const canSwitchMode = !isPlayer && !isMister
  const { dark, toggleTheme } = useTheme()

  useEffect(() => {
    supabase.from('team_settings').select('logo_url').single()
      .then(({ data }) => { if (data?.logo_url) setLogoUrl(data.logo_url) })
  }, [])

  useEffect(() => {
    if (!profile) return
    supabase.from('team_settings').select('modulo_prima_squadra, modulo_scuola_calcio').single()
      .then(({ data }) => {
        if (data) {
          setModules(data)
          if (isPlayer || isMister) {
            if (profile?.category_id) { setMode('sc'); if (!location.pathname.startsWith('/sc/')) navigate('/sc/chat') }
            else { setMode('ps'); if (location.pathname.startsWith('/sc/')) navigate('/') }
            return
          }
          if (!data.modulo_prima_squadra && data.modulo_scuola_calcio) { setMode('sc'); if (!location.pathname.startsWith('/sc/')) navigate('/sc/atleti') }
          if (data.modulo_prima_squadra && !data.modulo_scuola_calcio) { setMode('ps'); if (location.pathname.startsWith('/sc/')) navigate('/') }
        }
      })
  }, [profile])

  useEffect(() => {
    const sharedPaths = ['/impostazioni', '/calendario', '/materiale', '/documenti', '/presenze']
    if (sharedPaths.includes(location.pathname)) return
    if (isPlayer || (isMister && profile?.category_id)) return
    if (location.pathname.startsWith('/sc/')) { setMode('sc'); return }
    if (location.pathname !== '/') setMode('ps')
  }, [location.pathname])

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `logos/club.${ext}`
    const { error: upErr } = await supabase.storage.from('soccerclub').upload(path, file, { upsert: true })
    if (upErr) { alert('Errore: ' + upErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('soccerclub').getPublicUrl(path)
    await supabase.from('team_settings').update({ logo_url: publicUrl })
    setLogoUrl(publicUrl)
    setUploading(false)
  }

  const initials    = `${profile?.nome?.[0] || ''}${profile?.cognome?.[0] || ''}`.toUpperCase()
  const navItems    = mode === 'sc' ? NAV_SCUOLA_CALCIO : NAV_PRIMA_SQUADRA
  const filtered    = navItems.filter(item => !item.roles || item.roles.includes(role))
  const bothEnabled = modules.modulo_prima_squadra && modules.modulo_scuola_calcio

  async function handleLogout() { await signOut(); navigate('/login') }
  function switchMode(m) { setMode(m); setOpen(false); navigate(m === 'sc' ? '/sc/atleti' : '/') }

  function groupedNav(items) {
    const result = []
    let cur = undefined
    items.forEach(item => {
      if (item.group !== cur) { cur = item.group; result.push({ label: item.group, items: [item] }) }
      else result[result.length - 1].items.push(item)
    })
    return result
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{ background: theme.bg }}>

{/* ── Logo ── */}
<div className="flex items-center gap-3 px-4 py-4" style={{ background: theme.primary }}>
  <div className="relative flex-shrink-0">
    {logoUrl
      ? <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/40 bg-white">
          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain"/>
        </div>
      : <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg border-2 border-white/20">
          {mode === 'sc' ? '🏫' : 'SC'}
        </div>
    }
          {isAdmin && (
            <>
              <button onClick={() => logoInputRef.current?.click()}
                title="Carica logo"
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 shadow">
                {uploading
                  ? <div className="w-2.5 h-2.5 border border-gray-400 border-t-transparent rounded-full animate-spin"/>
                  : <Upload size={10} className="text-gray-600"/>}
              </button>
              <input ref={logoInputRef} type="file" accept=".png,.jpg,.jpeg,.svg,.webp" className="hidden" onChange={handleLogoUpload}/>
            </>
          )}
        </div>
        <div>
          <div className="text-white font-bold text-base leading-tight">SoccerClub</div>
          <div className="text-white/60 text-xs mt-0.5">
            {mode === 'sc' ? '🏫 Scuola Calcio' : '⚽ Prima Squadra'}
          </div>
        </div>
      </div>

      {/* ── Utente ── */}
      <div className="px-4 py-2.5 flex items-center gap-3 border-b border-white/10" style={{ background: 'rgba(0,0,0,0.25)' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: theme.accent }}>
          {initials || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-medium truncate">{profile?.nome} {profile?.cognome}</div>
          <div className="text-white/40 text-xs">{ROLE_LABELS[profile?.role] || profile?.role}</div>
        </div>
      </div>

      {/* ── Navigazione ── */}
      <nav className="flex-1 overflow-y-auto py-1">
        {groupedNav(filtered).map(({ label, items }, gi) => (
          <div key={gi}>
            {label && (
              <div className="px-4 pt-3 pb-0.5">
                <span className="text-white/20 text-xs uppercase tracking-widest font-semibold">{label}</span>
              </div>
            )}
            {items.map(({ to, label: lbl, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-4 py-2 text-sm transition-all border-l-4',
                  isActive
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/50 hover:text-white hover:bg-white/5 border-transparent'
                )}
                style={({ isActive }) => isActive ? { borderLeftColor: theme.accent } : {}}>
                <Icon size={15}/>
                <span>{lbl}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── Logout ── */}
      <div className="p-3 border-t border-white/10">
        <button onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-white/40 hover:text-white hover:bg-white/10 rounded text-sm transition-colors">
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
        {/* ── Header ── */}
        <header className="h-14 bg-white border-b border-[#e7eaec] flex items-center px-4 gap-3 flex-shrink-0">
          <button className="md:hidden text-[#999]" onClick={() => setOpen(!open)}>
            {open ? <X size={20}/> : <Menu size={20}/>}
          </button>

          {/* Badge modalità */}
          <div className="flex-1">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
              style={{ background: theme.accent }}>
              {theme.label}
            </span>
          </div>

          {/* Switch PS/SC — in alto a destra */}
          {bothEnabled && canSwitchMode && (
            <div className="flex rounded-lg overflow-hidden border border-[#e7eaec]">
              <button onClick={() => switchMode('ps')}
                className={clsx('px-3 py-1.5 text-xs font-semibold transition-colors',
                  mode === 'ps' ? 'text-white' : 'text-[#999] hover:text-[#676a6c] bg-white')}
                style={mode === 'ps' ? { background: THEME.ps.accent } : {}}>
                ⚽ PS
              </button>
              <button onClick={() => switchMode('sc')}
                className={clsx('px-3 py-1.5 text-xs font-semibold transition-colors',
                  mode === 'sc' ? 'text-white' : 'text-[#999] hover:text-[#676a6c] bg-white')}
                style={mode === 'sc' ? { background: THEME.sc.accent } : {}}>
                🏫 SC
              </button>
            </div>
          )}

          {profile?.id && <NotificationBell userId={profile.id}/>}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#676a6c] hidden sm:block">{profile?.nome} {profile?.cognome}</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: theme.accent }}>
              {initials || '?'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6"><Outlet/></main>
      </div>
    </div>
  )
}

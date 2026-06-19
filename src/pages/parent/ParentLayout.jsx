import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import clsx from 'clsx'
import {
  Home, User, CreditCard, FileText, Megaphone,
  ShoppingBag, LogOut, Menu, X, Bell, MessageCircle, Check, Trash2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

const navItems = [
  { to: '/genitore',           label: 'Home',          icon: Home },
  { to: '/genitore/figlio',    label: 'Il mio figlio', icon: User },
  { to: '/genitore/pagamenti', label: 'Pagamenti',     icon: CreditCard },
  { to: '/genitore/documenti', label: 'Documenti',     icon: FileText },
  { to: '/genitore/bacheca',   label: 'Bacheca',       icon: Megaphone },
  { to: '/genitore/kit',       label: 'Richiesta Kit', icon: ShoppingBag },
  { to: '/genitore/chat',      label: 'Chat',          icon: MessageCircle },
]

export default function ParentLayout() {
  const [open, setOpen] = useState(false)
  const [child, setChild] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef()
  const unread = notifications.filter(n => !n.read).length

  useEffect(() => { loadChild(); loadNotifications() }, [profile])

  useEffect(() => {
    function handleClick(e) { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function loadChild() {
    if (!profile?.id) return
    // Trova il genitore collegato a questo utente
    const { data: parent } = await supabase.from('parents').select('*, youth_players(*, categories(nome,colore))').eq('user_id', profile.id).single()
    if (parent?.youth_players) setChild(parent.youth_players)
  }

  async function loadNotifications() {
    if (!profile?.id) return
    const { data } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20)
    setNotifications(data || [])
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function deleteNotification(id) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }
  async function handleLogout() { await signOut(); navigate('/login') }

  const initials = `${profile?.nome?.[0] || ''}${profile?.cognome?.[0] || ''}`.toUpperCase()
  const catColor = child?.categories?.colore || '#27ae60'

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{ background: '#2c3e50' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4" style={{ background: '#27ae60' }}>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">🏫</div>
        <div>
          <div className="text-white font-bold text-sm">SoccerClub</div>
          <div className="text-white/70 text-xs">Area Genitori</div>
        </div>
      </div>

      {/* Info figlio */}
      {child && (
        <div className="px-4 py-3 bg-black/20 border-b border-white/10">
          <div className="text-white/50 text-xs uppercase tracking-wide mb-1">Il tuo figlio/a</div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: catColor }}>
              {(child.nome?.[0]||'')+(child.cognome?.[0]||'')}
            </div>
            <div>
              <div className="text-white text-sm font-medium">{child.nome} {child.cognome}</div>
              <div className="text-white/50 text-xs">{child.categories?.nome}</div>
            </div>
          </div>
        </div>
      )}

      {/* User */}
      <div className="px-4 py-3 bg-black/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#27ae60] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initials || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-medium truncate">{profile?.nome} {profile?.cognome}</div>
          <div className="text-white/50 text-xs">Genitore</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/genitore'}
            onClick={() => setOpen(false)}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-4',
              isActive
                ? 'bg-black/20 text-white border-[#27ae60]'
                : 'text-white/60 hover:text-white hover:bg-black/10 border-transparent'
            )}>
            <Icon size={16}/>
            <span>{label}</span>
            {to === '/genitore/bacheca' && unread > 0 && (
              <span className="ml-auto w-5 h-5 bg-[#ed5565] text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-white/60 hover:text-white hover:bg-black/20 rounded text-sm">
          <LogOut size={15}/><span>Esci</span>
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
            <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: '#27ae6015', color: '#27ae60' }}>
              🏫 Area Genitori
            </span>
          </div>
          {unread > 0 && (
            <div className="relative">
              <Bell size={18} className="text-[#999]"/>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ed5565] text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unread}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#676a6c] hidden sm:block">{profile?.nome} {profile?.cognome}</span>
            <div className="w-8 h-8 rounded-full bg-[#27ae60] flex items-center justify-center text-white text-xs font-bold">
              {initials || '?'}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6"><Outlet/></main>
      </div>
    </div>
  )
}

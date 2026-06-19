import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Send, MessageCircle, ArrowLeft } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

const ROLE_COLORS = {
  admin: 'text-red-500',
  mister: 'text-blue-500',
  segreteria: 'text-purple-500',
  player_paid: 'text-[#1ab394]',
  player_volunteer: 'text-yellow-500',
  parent: 'text-orange-500',
}

export default function SCChat() {
  const { profile } = useAuth()
  const isAdmin      = profile?.role === 'admin'
  const isSegreteria = profile?.role === 'segreteria'
  const isMister     = profile?.role === 'mister'
  const isParent     = profile?.role === 'parent'
  const isPlayer     = profile?.role === 'player_paid' || profile?.role === 'player_volunteer'

  // Mister SC ha category_id, Mister PS no
  const isMisterSC = isMister && !!profile?.category_id
  const isMisterPS = isMister && !profile?.category_id

  const [chats, setChats]           = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages]     = useState([])
  const [text, setText]             = useState('')
  const [loading, setLoading]       = useState(true)
  const [sending, setSending]       = useState(false)
  const bottomRef = useRef()

  useEffect(() => { initChats() }, [])

  useEffect(() => {
    if (!activeChat) return
    loadMessages(activeChat.id)
    const channel = supabase.channel(`sc-chat-${activeChat.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `chat_id=eq.${activeChat.id}`
      }, payload => {
        setMessages(prev => [...prev, payload.new])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [activeChat])

  async function getOrCreateChat(nome) {
    let { data: existing } = await supabase.from('chats').select('*').eq('nome', nome).maybeSingle()
    if (!existing) {
      const { data: created } = await supabase.from('chats').insert([{ tipo: 'gruppo', nome }]).select().single()
      existing = created
    }
    if (existing) {
      const { data: part } = await supabase.from('chat_participants').select('id')
        .eq('chat_id', existing.id).eq('user_id', profile.id).maybeSingle()
      if (!part) {
        await supabase.from('chat_participants').insert([{ chat_id: existing.id, user_id: profile.id }])
      }
      const { count } = await supabase.from('messages').select('id', { count: 'exact' })
        .eq('chat_id', existing.id).eq('letto', false).neq('sender_id', profile.id)
      return { ...existing, unread: count || 0 }
    }
    return null
  }

  async function initChats() {
    setLoading(true)
    const result = []

    // ── Chat GENERALE SC ──
    // Visibile a: Admin, Segreteria, Mister PS, Mister SC, Genitori
    // NON visibile a: calciatori PS (isPlayer senza category_id)
    const canSeeGenerale = isAdmin || isSegreteria || isMister || isParent
    if (canSeeGenerale) {
      const chat = await getOrCreateChat('🌐 Generale SC')
      if (chat) result.push({ ...chat, colore: '#6c757d', label: '🌐 Generale SC' })
    }

    // ── Chat SQUADRA per categoria ──
    if (isMisterSC) {
      // Mister SC → vede solo la chat della sua categoria
      const { data: cat } = await supabase.from('categories').select('*').eq('id', profile.category_id).single()
      if (cat) {
        const chat = await getOrCreateChat(`🏫 Squadra ${cat.nome}`)
        if (chat) result.push({ ...chat, colore: cat.colore, label: `🏫 ${cat.nome}` })
      }
    } else if (isAdmin || isSegreteria || isMisterPS) {
      // Admin, Segreteria e Mister PS vedono tutte le chat squadra
      const { data: cats } = await supabase.from('categories').select('*').order('ordine')
      for (const cat of (cats || [])) {
        const chat = await getOrCreateChat(`🏫 Squadra ${cat.nome}`)
        if (chat) result.push({ ...chat, colore: cat.colore, label: `🏫 ${cat.nome}` })
      }
    } else if (isParent) {
      // Genitore → vede la chat della categoria del figlio
      const { data: parent } = await supabase
        .from('parents')
        .select('youth_players(category_id, categories(nome, colore))')
        .eq('user_id', profile.id)
        .single()
      const cat   = parent?.youth_players?.categories
      const catId = parent?.youth_players?.category_id
      if (cat && catId) {
        const chat = await getOrCreateChat(`🏫 Squadra ${cat.nome}`)
        if (chat) result.push({ ...chat, colore: cat.colore, label: `🏫 ${cat.nome}` })
      }
    }

    setChats(result)
    if (result.length > 0) setActiveChat(result[0])
    setLoading(false)
  }

  async function loadMessages(chatId) {
    const { data } = await supabase.from('messages')
      .select('*, profiles(nome, cognome, role)')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages(data || [])
    await supabase.from('messages').update({ letto: true })
      .eq('chat_id', chatId).neq('sender_id', profile.id)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread: 0 } : c))
  }

  async function sendMessage() {
    if (!text.trim() || !activeChat) return
    setSending(true)
    await supabase.from('messages').insert([{
      chat_id: activeChat.id,
      sender_id: profile.id,
      contenuto: text.trim()
    }])
    setText('')
    setSending(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">

     {/* Sidebar chat */}
      <div className={clsx('w-full md:w-64 flex-shrink-0 border-r border-[#e7eaec] flex-col',
        activeChat ? 'hidden md:flex' : 'flex')}>
        <div className="p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold text-sm">🏫 Chat Scuola Calcio</h2>
          <p className="text-xs text-[#999] mt-0.5">Seleziona una chat</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <button key={chat.id} onClick={() => setActiveChat(chat)}
              className={clsx('w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-[#e7eaec]',
                activeChat?.id === chat.id && 'bg-[#1ab394]/5 border-l-4 border-l-[#1ab394]')}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: chat.colore }}>
                {chat.label.includes('🌐') ? '🌐' : '🏫'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[#2f4050] text-sm font-medium truncate">{chat.label}</div>
                <div className="text-xs text-[#999]">
                  {chat.nome.includes('Generale') ? 'Tutti' : 'Squadra categoria'}
                </div>
              </div>
              {chat.unread > 0 && (
                <span className="w-5 h-5 bg-[#ed5565] text-white text-xs rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  {chat.unread}
                </span>
              )}
            </button>
          ))}
          {chats.length === 0 && (
            <div className="p-4 text-center text-[#999] text-sm">
              Nessuna chat disponibile
            </div>
          )}
        </div>
      </div>

    {/* Area messaggi */}
      <div className={clsx('flex-1 flex-col', !activeChat ? 'hidden md:flex' : 'flex')}>
        {activeChat ? (
          <>
            <div className="p-4 border-b border-[#e7eaec] flex items-center gap-3">
              <button onClick={() => setActiveChat(null)} className="md:hidden text-[#999] hover:text-[#676a6c] flex-shrink-0">
                <ArrowLeft size={18}/>
              </button>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: activeChat.colore }}>
                <MessageCircle size={16}/>
              </div>
              <div>
                <div className="text-[#2f4050] font-bold text-sm">{activeChat.label}</div>
                <div className="text-xs text-[#999]">
                  {activeChat.nome.includes('Generale') ? 'Società · Segreteria · Mister · Genitori' : 'Mister · Genitori categoria'}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle size={32} className="text-[#999] mb-2"/>
                  <p className="text-[#999] text-sm">Nessun messaggio ancora.</p>
                  <p className="text-xs text-[#999]">Sii il primo a scrivere!</p>
                </div>
              ) : messages.map((msg, idx) => {
                const isMe = msg.sender_id === profile.id
                const showName = idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id
                return (
                  <div key={msg.id} className={clsx('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
                    {!isMe && showName && (
                      <div className="w-7 h-7 rounded-full bg-[#1ab394]/20 text-[#1ab394] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                        {(msg.profiles?.nome?.[0] || '') + (msg.profiles?.cognome?.[0] || '')}
                      </div>
                    )}
                    {!isMe && !showName && <div className="w-7 flex-shrink-0"/>}
                    <div className={clsx('max-w-xs lg:max-w-md flex flex-col', isMe ? 'items-end' : 'items-start')}>
                      {showName && !isMe && (
                        <span className={clsx('text-xs font-semibold mb-0.5', ROLE_COLORS[msg.profiles?.role] || 'text-[#999]')}>
                          {msg.profiles?.nome} {msg.profiles?.cognome}
                        </span>
                      )}
                      <div className={clsx('px-3 py-2 rounded-2xl text-sm',
                        isMe ? 'bg-[#1ab394] text-white rounded-tr-sm' : 'bg-gray-100 text-[#2f4050] rounded-tl-sm')}>
                        {msg.contenuto}
                      </div>
                      <span className="text-xs text-[#999] mt-0.5 px-1">
                        {format(new Date(msg.created_at), 'HH:mm', { locale: it })}
                      </span>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef}/>
            </div>

            <div className="p-4 border-t border-[#e7eaec]">
              <div className="flex gap-2 items-end">
                <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey}
                  placeholder="Scrivi un messaggio... (Invio per inviare)"
                  rows={1}
                  className="flex-1 border border-[#e7eaec] rounded-xl px-4 py-2.5 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"
                  style={{ maxHeight: '120px' }}/>
                <button onClick={sendMessage} disabled={!text.trim() || sending}
                  className="w-10 h-10 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white rounded-full flex items-center justify-center flex-shrink-0">
                  <Send size={16}/>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#999] text-sm">
            Seleziona una chat
          </div>
        )}
      </div>
    </div>
  )
}

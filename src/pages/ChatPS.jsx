import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
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
}

// Chat Prima Squadra:
// - "Generale": Società + Calciatori + Mister
// - "Squadra": solo Mister PS + Calciatori (no Società)

export default function ChatPS() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const isSegreteria = profile?.role === 'segreteria'
  const isMister = profile?.role === 'mister'
  const isPlayer = profile?.role === 'player_paid' || profile?.role === 'player_volunteer'

  // Mister SC (ha category_id) non deve vedere questa chat
  const isMisterSC = isMister && !!profile?.category_id

  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef()

  useEffect(() => { initChats() }, [])

  useEffect(() => {
    if (!activeChat) return
    loadMessages(activeChat.id)
    const channel = supabase.channel(`chat-ps-${activeChat.id}`)
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

    // Mister SC non vede le chat PS
    if (isMisterSC) {
      setChats([])
      setLoading(false)
      return
    }

    // Chat GENERALE — Società + Calciatori + Mister PS
    const canSeeGenerale = isAdmin || isSegreteria || isPlayer || (isMister && !isMisterSC)
    if (canSeeGenerale) {
      const chat = await getOrCreateChat('⚽ Prima Squadra')
      if (chat) result.push({ ...chat, colore: '#1ab394', label: '⚽ Prima Squadra' })
    }

    // Chat SQUADRA — solo Mister PS + Calciatori (no Società/Segreteria)
    const canSeeSquadra = isPlayer || (isMister && !isMisterSC)
    if (canSeeSquadra) {
      const chat = await getOrCreateChat('⚽ Squadra PS')
      if (chat) result.push({ ...chat, colore: '#1c84c6', label: '⚽ Squadra' })
    }

    // Admin e Segreteria vedono entrambe le chat
    if (isAdmin || isSegreteria) {
      const chatSquadra = await getOrCreateChat('⚽ Squadra PS')
      if (chatSquadra) result.push({ ...chatSquadra, colore: '#1c84c6', label: '⚽ Squadra' })
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

  if (isMisterSC) return (
    <div className="flex items-center justify-center h-64 text-[#999] text-sm">
      Questa sezione non è disponibile per i Mister della Scuola Calcio.
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">

     {/* Sidebar */}
      <div className={clsx('w-full md:w-64 flex-shrink-0 border-r border-[#e7eaec] flex-col',
        activeChat ? 'hidden md:flex' : 'flex')}>
        <div className="p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold text-sm">⚽ Chat Prima Squadra</h2>
          <p className="text-xs text-[#999] mt-0.5">Seleziona una chat</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <button key={chat.id} onClick={() => setActiveChat(chat)}
              className={clsx('w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-[#e7eaec]',
                activeChat?.id === chat.id && 'bg-[#1ab394]/5 border-l-4 border-l-[#1ab394]')}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: chat.colore }}>
                ⚽
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[#2f4050] text-sm font-medium truncate">{chat.label}</div>
                <div className="text-xs text-[#999]">
                  {chat.nome.includes('Squadra') ? 'Mister · Calciatori' : 'Società · Mister · Calciatori'}
                </div>
              </div>
              {chat.unread > 0 && (
                <span className="w-5 h-5 bg-[#ed5565] text-white text-xs rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  {chat.unread}
                </span>
              )}
            </button>
          ))}
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
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                style={{ background: activeChat.colore }}>
                <MessageCircle size={16}/>
              </div>
              <div>
                <div className="text-[#2f4050] font-bold text-sm">{activeChat.label}</div>
                <div className="text-xs text-[#999]">
                  {activeChat.nome.includes('Squadra') ? 'Mister · Calciatori' : 'Società · Mister · Calciatori'}
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

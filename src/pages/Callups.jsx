import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

function CallupsModal({ onClose, onSaved }) {
  const { profile } = useAuth()
  const [matches, setMatches] = useState([])
  const [players, setPlayers] = useState([])
  const [form, setForm] = useState({ match_id: '', ora_ritrovo: '', luogo_ritrovo: '', note: '' })
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('matches').select('*').gte('date', new Date().toISOString().split('T')[0]).order('date').then(({ data }) => setMatches(data || []))
    supabase.from('profiles').select('id,nome,cognome').eq('active', true).eq('club_id', profile?.club_id).in('role', ['player_paid','player_volunteer']).order('cognome').then(({ data }) => setPlayers(data || []))
  }, [])

  function togglePlayer(id) { setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]) }

  async function save() {
    if (!form.match_id) return toast.error('Seleziona una partita')
    setLoading(true)
    const { data: callup, error } = await supabase.from('callups').insert([{ ...form, club_id: profile?.club_id }]).select().single()
    if (error) { toast.error(error.message); setLoading(false); return }
    if (selected.length > 0) {
      await supabase.from('callup_players').insert(selected.map(pid => ({ callup_id: callup.id, player_id: pid })))
      await supabase.from('notifications').insert(selected.map(pid => ({ user_id: pid, type: 'callup_published', message: 'Sei stato convocato per la prossima partita!', read: false })))
    }
    toast.success('Convocazione creata')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Nuova Convocazione</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Partita</label>
            <select value={form.match_id} onChange={e => setForm(f => ({ ...f, match_id: e.target.value }))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              <option value="">Seleziona partita...</option>
              {matches.map(m => <option key={m.id} value={m.id}>vs {m.avversario} — {format(new Date(m.date), 'dd/MM/yyyy')}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Ora ritrovo</label>
              <input type="time" value={form.ora_ritrovo} onChange={e => setForm(f => ({ ...f, ora_ritrovo: e.target.value }))}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Luogo ritrovo</label>
              <input value={form.luogo_ritrovo} onChange={e => setForm(f => ({ ...f, luogo_ritrovo: e.target.value }))}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Note</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-2">Calciatori ({selected.length} selezionati)</label>
            <div className="space-y-1 max-h-48 overflow-y-auto border border-[#e7eaec] rounded p-2">
              {players.map(p => (
                <label key={p.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(p.id)} onChange={() => togglePlayer(p.id)} className="accent-[#1ab394]"/>
                  <div className="w-6 h-6 rounded-full bg-[#1ab394]/20 text-[#1ab394] flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {(p.nome?.[0]||'')+(p.cognome?.[0]||'')}
                  </div>
                  <span className="text-[#676a6c] text-sm">{p.cognome} {p.nome}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Salvataggio...' : 'Crea'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Callups() {
  const { profile, isAdmin, isMister } = useAuth()
  const isMisterPS = isMister && !profile?.category_id
  const [callups, setCallups] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      // calciatori PS: cerca prima le loro convocazioni
      if (!isAdmin && !isMisterPS) {
        const { data: myCallups } = await supabase
          .from('callup_players')
          .select('callup_id')
          .eq('player_id', profile.id)
        const ids = (myCallups || []).map(c => c.callup_id)
        if (ids.length === 0) { setCallups([]); setLoading(false); return }
        const { data } = await supabase
          .from('callups')
          .select('*, matches(avversario,date,time,campo), callup_players(player_id, profiles(nome,cognome))')
          .in('id', ids)
          .order('created_at', { ascending: false })
        setCallups(data || [])
      } else {
        // admin o mister PS: vede tutte le convocazioni del proprio club
        const { data } = await supabase
          .from('callups')
          .select('*, matches(avversario,date,time,campo), callup_players(player_id, profiles(nome,cognome))')
          .order('created_at', { ascending: false })
        setCallups(data || [])
      }
    } catch(e) {
      toast.error('Errore caricamento convocazioni')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Convocazioni</h1>
          <p className="text-sm text-[#999] mt-1">Lista convocati per le partite</p>
        </div>
        {(isAdmin || isMisterPS) && (
          <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
            <Plus size={16}/> Nuova
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/></div>
      ) : callups.length === 0 ? (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-8 text-center text-[#999] text-sm">Nessuna convocazione trovata</div>
      ) : (
        <div className="space-y-3">
          {callups.map(c => {
            const players = c.callup_players || []
            const isExpanded = expanded === c.id
            const isConvocato = !isAdmin && !isMisterPS && players.some(p => p.player_id === profile?.id)
            return (
              <div key={c.id} className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
                <button className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : c.id)}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#2f4050] font-semibold">vs {c.matches?.avversario}</span>
                      {isConvocato && <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#1ab394]/10 text-[#1ab394]">Convocato ✓</span>}
                    </div>
                    <div className="text-[#999] text-xs">
                      {c.matches?.date && format(new Date(c.matches.date), 'dd MMM yyyy', { locale: it })}
                      {c.ora_ritrovo && ` • Ritrovo: ${c.ora_ritrovo}`}
                      {c.luogo_ritrovo && ` @ ${c.luogo_ritrovo}`}
                    </div>
                    {c.note && <div className="text-[#999] text-xs italic">{c.note}</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-[#999]">{players.length} conv.</span>
                    {isExpanded ? <ChevronUp size={16} className="text-[#999]"/> : <ChevronDown size={16} className="text-[#999]"/>}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 flex flex-wrap gap-2 border-t border-[#e7eaec] pt-3">
                    {players.map(p => (
                      <div key={p.player_id} className="flex items-center gap-1.5 bg-gray-100 rounded px-3 py-1">
                        <div className="w-5 h-5 rounded-full bg-[#1ab394]/20 text-[#1ab394] flex items-center justify-center text-xs font-bold">
                          {(p.profiles?.nome?.[0]||'')+(p.profiles?.cognome?.[0]||'')}
                        </div>
                        <span className="text-[#676a6c] text-xs">{p.profiles?.cognome} {p.profiles?.nome}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && <CallupsModal onClose={() => setModal(false)} onSaved={() => { setModal(false); load() }}/>}
    </div>
  )
}

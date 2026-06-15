import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, X, ChevronDown, ChevronUp, Bell, MapPin, Clock, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, isPast } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

// ── Modal nuova convocazione ──────────────────────────────────
function CallupModal({ onClose, onSaved }) {
  const { profile, club } = useAuth()
  const isMisterSC = profile?.role === 'mister' && !!profile?.category_id

  const [categories, setCategories] = useState([])
  const [players,    setPlayers]    = useState([])
  const [selected,   setSelected]   = useState([])
  const [form, setForm] = useState({
    titolo:        '',
    descrizione:   '',
    data_evento:   '',
    ora_ritrovo:   '',
    luogo_ritrovo: '',
    note:          '',
    pubblicato:    true,
    category_id:   profile?.category_id || '',
  })
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (form.category_id) loadPlayers(form.category_id)
  }, [form.category_id])

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').order('ordine')
    setCategories(data || [])
    // Se non è mister SC, pre-seleziona la prima categoria
    if (!isMisterSC && data?.length > 0 && !form.category_id) {
      set('category_id', data[0].id)
    }
  }

  async function loadPlayers(catId) {
    const { data } = await supabase.from('youth_players')
      .select('id, nome, cognome, numero_maglia')
      .eq('category_id', catId)
      .eq('active', true)
      .order('cognome')
    setPlayers(data || [])
    setSelected([])
  }

  function togglePlayer(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }
  function selectAll()  { setSelected(players.map(p => p.id)) }
  function selectNone() { setSelected([]) }

  async function save() {
    if (!form.titolo)       return toast.error('Inserisci un titolo')
    if (!form.data_evento)  return toast.error('Inserisci la data')
    if (!form.category_id)  return toast.error('Seleziona una categoria')
    if (selected.length === 0) return toast.error('Seleziona almeno un atleta')

    setLoading(true)
    try {
      // Crea convocazione
      const { data: callup, error } = await supabase.from('sc_callups')
        .insert([{
          ...form,
          club_id:    club?.id || profile?.club_id,
          creato_da:  profile?.id,
        }])
        .select().single()
      if (error) throw new Error(error.message)

      // Aggiungi atleti convocati
      await supabase.from('sc_callup_players').insert(
        selected.map(pid => ({ callup_id: callup.id, youth_player_id: pid }))
      )

      // Notifica agli atleti con account player_sc
      const { data: accounts } = await supabase
        .from('youth_players')
        .select('user_id')
        .in('id', selected)
        .not('user_id', 'is', null)

      if (accounts?.length > 0) {
        await supabase.from('notifications').insert(
          accounts.map(a => ({
            user_id: a.user_id,
            type:    'callup_published',
            message: `📋 Sei stato convocato: ${form.titolo} — ${format(new Date(form.data_evento), 'dd/MM/yyyy')}`,
            read:    false,
          }))
        )
      }

      toast.success('Convocazione creata!')
      onSaved()
    } catch(e) {
      toast.error(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Nuova Convocazione SC</h2>
          <button onClick={onClose}><X size={18} className="text-[#999]"/></button>
        </div>
        <div className="p-4 space-y-3">

          {/* Categoria */}
          {!isMisterSC && (
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Categoria *</label>
              <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                <option value="">Seleziona categoria...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}

          {/* Titolo */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Titolo *</label>
            <input value={form.titolo} onChange={e => set('titolo', e.target.value)}
              placeholder="Es. Partita vs Sporting, Torneo..."
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Descrizione</label>
            <textarea value={form.descrizione} onChange={e => set('descrizione', e.target.value)}
              rows={2} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>

          {/* Data + Ora ritrovo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Data evento *</label>
              <input type="date" value={form.data_evento} onChange={e => set('data_evento', e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Ora ritrovo</label>
              <input type="time" value={form.ora_ritrovo} onChange={e => set('ora_ritrovo', e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>

          {/* Luogo ritrovo */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Luogo ritrovo</label>
            <input value={form.luogo_ritrovo} onChange={e => set('luogo_ritrovo', e.target.value)}
              placeholder="Es. Campo sportivo comunale"
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Note</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)}
              rows={2} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"
              placeholder="Portare pettorina, scarpe da calcio..."/>
          </div>

          {/* Atleti */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#999] uppercase tracking-wide">
                Atleti convocati ({selected.length}/{players.length})
              </label>
              <div className="flex gap-2">
                <button onClick={selectAll}  className="text-xs text-[#1ab394] hover:underline">Tutti</button>
                <button onClick={selectNone} className="text-xs text-[#999] hover:underline">Nessuno</button>
              </div>
            </div>
            {players.length === 0 ? (
              <div className="text-center text-[#999] py-4 text-xs border border-[#e7eaec] rounded">
                {form.category_id ? 'Nessun atleta in questa categoria' : 'Seleziona una categoria'}
              </div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto border border-[#e7eaec] rounded p-2">
                {players.map(p => (
                  <label key={p.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selected.includes(p.id)}
                      onChange={() => togglePlayer(p.id)} className="accent-[#1ab394]"/>
                    <div className="w-6 h-6 rounded-full bg-[#1ab394]/20 text-[#1ab394] flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {(p.nome?.[0]||'')+(p.cognome?.[0]||'')}
                    </div>
                    <span className="text-[#676a6c] text-sm flex-1">{p.cognome} {p.nome}</span>
                    {p.numero_maglia && <span className="text-xs text-[#999]">#{p.numero_maglia}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.pubblicato}
              onChange={e => set('pubblicato', e.target.checked)} className="accent-[#1ab394]"/>
            <span className="text-sm text-[#676a6c]">Pubblica subito</span>
          </label>
        </div>

        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Creazione...' : 'Crea convocazione'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────
export default function SCCallups() {
  const { profile, isAdmin, isMister } = useAuth()
  const isSegreteria = profile?.role === 'segreteria'
  const isPlayerSC   = profile?.role === 'player_sc'
  const isParent     = profile?.role === 'parent'
  const isMisterSC   = isMister && !!profile?.category_id

  const canCreate = isAdmin || isSegreteria || isMisterSC

  const [callups,   setCallups]   = useState([])
  const [expanded,  setExpanded]  = useState(null)
  const [modal,     setModal]     = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [myPlayerId, setMyPlayerId] = useState(null)

  useEffect(() => { loadMyPlayer(); loadCallups() }, [])

  async function loadMyPlayer() {
    // Per player_sc: trova l'id dell'atleta collegato
    if (isPlayerSC) {
      const { data } = await supabase.from('youth_players')
        .select('id').eq('user_id', profile.id).maybeSingle()
      if (data) setMyPlayerId(data.id)
    }
    // Per genitore: trova il figlio
    if (isParent) {
      const { data } = await supabase.from('parents')
        .select('youth_player_id').eq('user_id', profile.id).maybeSingle()
      if (data) setMyPlayerId(data.youth_player_id)
    }
  }

  async function loadCallups() {
    setLoading(true)
    let q = supabase.from('sc_callups')
      .select('*, categories(nome,colore), sc_callup_players(youth_player_id, youth_players(nome,cognome,numero_maglia))')
      .eq('pubblicato', true)
      .order('data_evento', { ascending: false })

    // Mister SC vede solo la sua categoria
    if (isMisterSC) q = q.eq('category_id', profile.category_id)

    const { data } = await q
    setCallups(data || [])
    setLoading(false)
  }

  async function deleteCallup(id) {
    if (!confirm('Eliminare questa convocazione?')) return
    await supabase.from('sc_callup_players').delete().eq('callup_id', id)
    await supabase.from('sc_callups').delete().eq('id', id)
    toast.success('Convocazione eliminata')
    loadCallups()
  }

  // Filtra per player_sc e parent: vede solo convocazioni dove è incluso
  const visibleCallups = (isPlayerSC || isParent) && myPlayerId
    ? callups.filter(c => c.sc_callup_players?.some(p => p.youth_player_id === myPlayerId))
    : callups

  const upcoming = visibleCallups.filter(c => !isPast(new Date(c.data_evento)))
  const past     = visibleCallups.filter(c =>  isPast(new Date(c.data_evento)))

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Convocazioni SC</h1>
          <p className="text-sm text-[#999] mt-1">
            {isPlayerSC || isParent
              ? 'Le tue convocazioni'
              : 'Gestione convocazioni Scuola Calcio'}
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
            <Plus size={16}/> Nuova
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <>
          {/* Prossime */}
          <div>
            <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">
              Prossime convocazioni
            </h2>
            {upcoming.length === 0 ? (
              <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-8 text-center">
                <Bell size={32} className="mx-auto text-[#999] mb-2 opacity-40"/>
                <p className="text-[#999] text-sm">Nessuna convocazione in programma</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map(c => <CallupCard key={c.id} callup={c}
                  myPlayerId={myPlayerId} isPlayerSC={isPlayerSC} isParent={isParent}
                  canCreate={canCreate} expanded={expanded} setExpanded={setExpanded}
                  onDelete={deleteCallup}/>)}
              </div>
            )}
          </div>

          {/* Passate */}
          {past.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">
                Convocazioni passate
              </h2>
              <div className="space-y-3">
                {past.map(c => <CallupCard key={c.id} callup={c}
                  myPlayerId={myPlayerId} isPlayerSC={isPlayerSC} isParent={isParent}
                  canCreate={canCreate} expanded={expanded} setExpanded={setExpanded}
                  onDelete={deleteCallup} past/>)}
              </div>
            </div>
          )}
        </>
      )}

      {modal && (
        <CallupModal onClose={() => setModal(false)}
          onSaved={() => { setModal(false); loadCallups() }}/>
      )}
    </div>
  )
}

// ── Card convocazione ─────────────────────────────────────────
function CallupCard({ callup: c, myPlayerId, isPlayerSC, isParent, canCreate, expanded, setExpanded, onDelete, past }) {
  const players    = c.sc_callup_players || []
  const isExpanded = expanded === c.id
  const isConvocato = myPlayerId && players.some(p => p.youth_player_id === myPlayerId)
  const catColor   = c.categories?.colore || '#1ab394'

  return (
    <div className={clsx('bg-white border rounded shadow-sm overflow-hidden',
      past ? 'opacity-70 border-[#e7eaec]' : isConvocato ? 'border-[#1ab394]/40' : 'border-[#e7eaec]')}>
      <button className="w-full p-4 flex items-start justify-between text-left hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(isExpanded ? null : c.id)}>
        <div className="flex items-start gap-3 flex-1">
          {/* Badge categoria */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
            style={{ background: catColor }}>
            {c.categories?.nome?.slice(0,2) || 'SC'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[#2f4050] font-bold">{c.titolo}</span>
              {c.categories && (
                <span className="px-2 py-0.5 rounded text-xs text-white font-medium"
                  style={{ background: catColor }}>{c.categories.nome}</span>
              )}
              {isConvocato && (
                <span className="px-2 py-0.5 rounded text-xs bg-[#1ab394]/10 text-[#1ab394] font-medium">
                  ✓ Convocato
                </span>
              )}
            </div>
            {/* Data e info */}
            <div className="flex flex-wrap gap-3 text-xs text-[#999]">
              <span>📅 {format(new Date(c.data_evento), 'EEEE d MMMM yyyy', { locale: it })}</span>
              {c.ora_ritrovo && (
                <span className="flex items-center gap-1">
                  <Clock size={11}/> Ritrovo: {c.ora_ritrovo.slice(0,5)}
                </span>
              )}
              {c.luogo_ritrovo && (
                <span className="flex items-center gap-1">
                  <MapPin size={11}/> {c.luogo_ritrovo}
                </span>
              )}
            </div>
            {c.descrizione && (
              <p className="text-xs text-[#676a6c] mt-1">{c.descrizione}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-xs text-[#999]">{players.length} atleti</span>
          {isExpanded ? <ChevronUp size={16} className="text-[#999]"/> : <ChevronDown size={16} className="text-[#999]"/>}
        </div>
      </button>

      {/* Lista atleti espansa */}
      {isExpanded && (
        <div className="border-t border-[#e7eaec] px-4 py-3">
          {c.note && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-700 mb-3">
              📝 {c.note}
            </div>
          )}

          {/* Solo staff vede la lista completa */}
          {!isPlayerSC && !isParent ? (
            <>
              <div className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-2">
                Atleti convocati ({players.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {players.map(p => (
                  <div key={p.youth_player_id}
                    className="flex items-center gap-1.5 bg-gray-100 rounded px-2 py-1">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: catColor }}>
                      {(p.youth_players?.nome?.[0]||'')+(p.youth_players?.cognome?.[0]||'')}
                    </div>
                    <span className="text-[#676a6c] text-xs">
                      {p.youth_players?.cognome} {p.youth_players?.nome}
                    </span>
                    {p.youth_players?.numero_maglia && (
                      <span className="text-[#999] text-xs">#{p.youth_players.numero_maglia}</span>
                    )}
                  </div>
                ))}
              </div>
              {canCreate && (
                <div className="flex justify-end mt-3">
                  <button onClick={() => onDelete(c.id)}
                    className="text-xs text-[#999] hover:text-red-500 flex items-center gap-1">
                    <Trash2 size={12}/> Elimina
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Atleta/genitore vede solo il proprio stato */
            <div className={clsx('rounded p-3 text-sm font-medium text-center',
              isConvocato ? 'bg-[#1ab394]/10 text-[#1ab394]' : 'bg-gray-100 text-[#999]')}>
              {isConvocato ? '✓ Sei convocato per questo evento!' : 'Non sei convocato per questo evento.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

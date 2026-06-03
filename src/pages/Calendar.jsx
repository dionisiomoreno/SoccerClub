import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { MapPin, Plus, Edit2, Trash2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, isPast } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

function MatchModal({ match, onClose, onSaved }) {
  const isEdit = !!match?.id
  const [form, setForm] = useState({
    avversario: '', date: '', time: '', campo: '', indirizzo: '', maps_url: '', casa: true, ...match
  })
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.avversario || !form.date) return toast.error('Compila i campi obbligatori')
    setLoading(true)
    const payload = { avversario: form.avversario, date: form.date, time: form.time, campo: form.campo, indirizzo: form.indirizzo, maps_url: form.maps_url, casa: form.casa }
    const { error } = isEdit
      ? await supabase.from('matches').update(payload).eq('id', form.id)
      : await supabase.from('matches').insert([payload])
    if (error) toast.error(error.message)
    else {
      if (isEdit && match.time !== form.time) {
        await supabase.from('notifications').insert([{ type: 'match_time_changed', message: `Orario partita vs ${form.avversario} cambiato`, read: false }])
      }
      toast.success(isEdit ? 'Partita aggiornata' : 'Partita aggiunta')
      onSaved()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <h2 className="text-white font-semibold">{isEdit ? 'Modifica' : 'Nuova'} Partita</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-white">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Avversario *</label>
            <input value={form.avversario} onChange={e => set('avversario', e.target.value)}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Data *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"/>
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Orario</label>
              <input type="time" value={form.time} onChange={e => set('time', e.target.value)}
                className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"/>
            </div>
          </div>
          {[['campo','Campo'],['indirizzo','Indirizzo'],['maps_url','Link Google Maps']].map(([k,l]) => (
            <div key={k}>
              <label className="block text-xs text-[#6B7280] mb-1">{l}</label>
              <input value={form[k]||''} onChange={e => set(k, e.target.value)}
                className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"/>
            </div>
          ))}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.casa} onChange={e => set('casa', e.target.checked)} className="accent-[#C00000]"/>
            <span className="text-sm text-white">Partita in casa</span>
          </label>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#2A2A2A]">
          <button onClick={onClose} className="flex-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-2 rounded-lg text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#C00000] hover:bg-[#A00000] disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold">
            {loading ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MatchCard({ match, isAdmin, onEdit, onDelete }) {
  const past = isPast(new Date(match.date))
  return (
    <div className={clsx('bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4 space-y-2', past && 'opacity-60')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', match.casa ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400')}>
            {match.casa ? 'Casa' : 'Trasferta'}
          </span>
          <span className="text-white font-semibold">ASD Castelmauro vs {match.avversario}</span>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onEdit} className="text-[#6B7280] hover:text-white"><Edit2 size={14}/></button>
            <button onClick={onDelete} className="text-[#6B7280] hover:text-red-400"><Trash2 size={14}/></button>
          </div>
        )}
      </div>
      <div className="text-[#6B7280] text-sm">{format(new Date(match.date), "EEEE d MMMM yyyy", { locale: it })}{match.time && ` • ${match.time}`}</div>
      {match.campo && (
        <div className="flex items-center gap-1.5 text-sm text-[#6B7280]">
          <MapPin size={13}/>
          <span>{match.campo}</span>
          {match.maps_url && (
            <a href={match.maps_url} target="_blank" rel="noreferrer" className="text-[#C00000] hover:underline flex items-center gap-1 ml-1">
              <ExternalLink size={11}/> Mappa
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default function Calendar() {
  const { isAdmin } = useAuth()
  const [matches, setMatches] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('matches').select('*').order('date')
    setMatches(data || [])
    setLoading(false)
  }

  async function deleteMatch(id) {
    if (!confirm('Eliminare questa partita?')) return
    await supabase.from('matches').delete().eq('id', id)
    toast.success('Partita eliminata')
    load()
  }

  const now = new Date()
  const upcoming = matches.filter(m => !isPast(new Date(m.date)))
  const past = matches.filter(m => isPast(new Date(m.date))).reverse()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Calendario</h1>
        {isAdmin && (
          <button onClick={() => setModal({})} className="flex items-center gap-2 bg-[#C00000] hover:bg-[#A00000] text-white px-3 py-2 rounded-lg text-sm font-semibold">
            <Plus size={16}/> Nuova partita
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-[#C00000] border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <>
          <div>
            <h2 className="text-sm font-semibold text-[#6B7280] mb-3 uppercase tracking-wide">Prossime partite</h2>
            {upcoming.length === 0 ? (
              <div className="text-[#6B7280] text-sm">Nessuna partita in programma</div>
            ) : (
              <div className="space-y-3">
                {upcoming.map(m => <MatchCard key={m.id} match={m} isAdmin={isAdmin} onEdit={() => setModal(m)} onDelete={() => deleteMatch(m.id)}/>)}
              </div>
            )}
          </div>
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[#6B7280] mb-3 uppercase tracking-wide">Partite passate</h2>
              <div className="space-y-3">
                {past.map(m => <MatchCard key={m.id} match={m} isAdmin={isAdmin} onEdit={() => setModal(m)} onDelete={() => deleteMatch(m.id)}/>)}
              </div>
            </div>
          )}
        </>
      )}

      {modal !== null && <MatchModal match={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }}/>}
    </div>
  )
}

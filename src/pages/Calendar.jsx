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
  const [form, setForm] = useState({ avversario: '', date: '', time: '', campo: '', indirizzo: '', maps_url: '', casa: true, ...match })
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
    else { toast.success(isEdit ? 'Partita aggiornata' : 'Partita aggiunta'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit ? 'Modifica' : 'Nuova'} Partita</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Avversario *</label>
            <input value={form.avversario} onChange={e => set('avversario', e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Data *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Orario</label>
              <input type="time" value={form.time} onChange={e => set('time', e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>
          {[['campo','Campo'],['indirizzo','Indirizzo'],['maps_url','Link Google Maps']].map(([k,l]) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">{l}</label>
              <input value={form[k]||''} onChange={e => set(k, e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          ))}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.casa} onChange={e => set('casa', e.target.checked)} className="accent-[#1ab394]"/>
            <span className="text-sm text-[#676a6c]">Partita in casa</span>
          </label>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
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
    <div className={clsx('bg-white border border-[#e7eaec] rounded shadow-sm p-4 space-y-2', past && 'opacity-60')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', match.casa ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600')}>
            {match.casa ? 'Casa' : 'Trasferta'}
          </span>
          <span className="text-[#2f4050] font-semibold">ASD Castelmauro vs {match.avversario}</span>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onEdit} className="text-[#999] hover:text-[#1c84c6]"><Edit2 size={14}/></button>
            <button onClick={onDelete} className="text-[#999] hover:text-red-500"><Trash2 size={14}/></button>
          </div>
        )}
      </div>
      <div className="text-[#999] text-sm">{format(new Date(match.date), "EEEE d MMMM yyyy", { locale: it })}{match.time && ` • ${match.time}`}</div>
      {match.campo && (
        <div className="flex items-center gap-1.5 text-sm text-[#999]">
          <MapPin size={13}/>
          <span>{match.campo}</span>
          {match.maps_url && (
            <a href={match.maps_url} target="_blank" rel="noreferrer" className="text-[#1ab394] hover:underline flex items-center gap-1 ml-1">
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

  const upcoming = matches.filter(m => !isPast(new Date(m.date)))
  const past = matches.filter(m => isPast(new Date(m.date))).reverse()

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Calendario</h1>
          <p className="text-sm text-[#999] mt-1">Partite programmate e risultati</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal({})} className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
            <Plus size={16}/> Nuova partita
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <>
          <div>
            <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Prossime partite</h2>
            {upcoming.length === 0 ? (
              <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-6 text-center text-[#999] text-sm">Nessuna partita in programma</div>
            ) : (
              <div className="space-y-3">
                {upcoming.map(m => <MatchCard key={m.id} match={m} isAdmin={isAdmin} onEdit={() => setModal(m)} onDelete={() => deleteMatch(m.id)}/>)}
              </div>
            )}
          </div>
          {past.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Partite passate</h2>
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

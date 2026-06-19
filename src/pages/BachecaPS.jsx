import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, X, Megaphone, AlertTriangle, Calendar, Trophy, Coffee, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

const TIPI = {
  generale:       { label: 'Comunicazione generale', icon: Megaphone,      color: 'bg-blue-100 text-blue-600' },
  evento:         { label: 'Evento',                 icon: Calendar,       color: 'bg-purple-100 text-purple-600' },
  convocazione:   { label: 'Convocazione',           icon: Trophy,         color: 'bg-green-100 text-green-600' },
  riunione:       { label: 'Riunione',               icon: Coffee,         color: 'bg-orange-100 text-orange-600' },
  avviso_urgente: { label: 'Avviso urgente',         icon: AlertTriangle,  color: 'bg-red-100 text-red-600' },
}

function AnnouncementModal({ onClose, onSaved, profile }) {
  const [form, setForm] = useState({
    titolo: '', contenuto: '', tipo: 'generale',
    data_evento: '', pubblicato: true
  })
  const [loading, setLoading] = useState(false)

  async function save() {
    if (!form.titolo) return toast.error('Inserisci un titolo')
    setLoading(true)
    const { data: ann, error } = await supabase.from('announcements_ps')
      .insert([{ ...form, autore_id: profile?.id }]).select().single()
    if (error) { toast.error(error.message); setLoading(false); return }

    // Notifica a tutti i profili attivi della squadra
    const { data: users } = await supabase.from('profiles')
      .select('id').eq('active', true)
    if (users?.length) {
      await supabase.from('notifications').insert(
        users.map(u => ({
          user_id: u.id,
          club_id: profile?.club_id,
          type: 'new_announcement',
          message: `📢 ${form.titolo}`,
          read: false
        }))
      )
    }
    toast.success('Comunicazione pubblicata!')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Nuova Comunicazione</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TIPI).map(([v, { label, icon: Icon, color }]) => (
                <button key={v} onClick={() => setForm(f => ({ ...f, tipo: v }))}
                  className={clsx('flex items-center gap-2 px-3 py-2 rounded border text-xs font-medium transition-colors',
                    form.tipo === v ? 'border-[#1ab394] bg-[#1ab394]/5 text-[#1ab394]' : 'border-[#e7eaec] text-[#676a6c] hover:border-[#1ab394]/50')}>
                  <Icon size={14}/> {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Titolo *</label>
            <input value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Contenuto</label>
            <textarea value={form.contenuto} onChange={e => setForm(f => ({ ...f, contenuto: e.target.value }))}
              rows={4} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Data evento (opzionale)</label>
            <input type="date" value={form.data_evento} onChange={e => setForm(f => ({ ...f, data_evento: e.target.value }))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.pubblicato} onChange={e => setForm(f => ({ ...f, pubblicato: e.target.checked }))} className="accent-[#1ab394]"/>
            <span className="text-sm text-[#676a6c]">Pubblica subito</span>
          </label>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Pubblicando...' : 'Pubblica'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BachecaPS() {
  const { profile, isAdmin, isMister } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [filterTipo, setFilterTipo] = useState('')
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const canPost = isAdmin || isMister || profile?.role === 'segreteria'

  useEffect(() => { load() }, [filterTipo])

  async function load() {
    setLoading(true)
    let q = supabase.from('announcements_ps')
      .select('*, profiles(nome,cognome)')
      .eq('pubblicato', true)
      .order('created_at', { ascending: false })
    if (filterTipo) q = q.eq('tipo', filterTipo)
    const { data } = await q
    setAnnouncements(data || [])
    setLoading(false)
  }

  async function deleteAnn(id) {
    if (!confirm('Eliminare questa comunicazione?')) return
    await supabase.from('announcements_ps').delete().eq('id', id)
    toast.success('Eliminata')
    load()
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Bacheca Prima Squadra</h1>
          <p className="text-sm text-[#999] mt-1">Comunicazioni e avvisi per la squadra</p>
        </div>
        {canPost && (
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
            <Plus size={16}/> Nuova
          </button>
        )}
      </div>

      {/* Filtri */}
      <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
        className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] w-full sm:w-auto">
        <option value="">Tutti i tipi</option>
        {Object.entries(TIPI).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
      </select>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-12 text-center">
          <Megaphone size={36} className="mx-auto text-[#999] mb-3"/>
          <p className="text-[#999] text-sm">Nessuna comunicazione pubblicata</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => {
            const T = TIPI[a.tipo] || TIPI.generale
            const Icon = T.icon
            return (
              <div key={a.id} className={clsx('bg-white border rounded shadow-sm p-4',
                a.tipo === 'avviso_urgente' ? 'border-red-300' : 'border-[#e7eaec]')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', T.color)}>
                      <Icon size={16}/>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', T.color)}>{T.label}</span>
                      </div>
                      <h3 className="text-[#2f4050] font-bold">{a.titolo}</h3>
                      {a.contenuto && <p className="text-[#676a6c] text-sm mt-1 whitespace-pre-line">{a.contenuto}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-[#999]">
                        <span>{format(new Date(a.created_at), "d MMMM yyyy 'alle' HH:mm", { locale: it })}</span>
                        {a.profiles && <span>— {a.profiles.nome} {a.profiles.cognome}</span>}
                        {a.data_evento && <span className="text-[#1ab394] font-medium">📅 {format(new Date(a.data_evento), 'dd/MM/yyyy')}</span>}
                      </div>
                    </div>
                  </div>
                  {canPost && (
                    <button onClick={() => deleteAnn(a.id)} className="text-[#999] hover:text-red-500 flex-shrink-0">
                      <X size={16}/>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <AnnouncementModal
          profile={profile}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); load() }}
        />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Edit2, X, Building2, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, differenceInDays } from 'date-fns'
import clsx from 'clsx'

const PIANI = ['starter', 'pro', 'full']
const STATI = ['trial', 'active', 'suspended', 'expired']

const STATO_COLORS = {
  active:    'bg-green-100 text-green-600',
  trial:     'bg-blue-100 text-blue-600',
  suspended: 'bg-yellow-100 text-yellow-600',
  expired:   'bg-red-100 text-red-600',
}
const PIANO_COLORS = {
  starter: 'bg-gray-100 text-gray-600',
  pro:     'bg-purple-100 text-purple-600',
  full:    'bg-[#e94560]/10 text-[#e94560]',
}

function ClubModal({ club, onClose, onSaved }) {
  const isEdit = !!club?.id
const [form, setForm] = useState({
    nome: '', slug: '', email: '', telefono: '', citta: '',
    piano: 'full', stato: 'trial',
    max_users: 100,
    ...club,
    trial_ends_at: club?.trial_ends_at ? format(new Date(club.trial_ends_at), "yyyy-MM-dd") : format(new Date(Date.now() + 14*24*60*60*1000), "yyyy-MM-dd"),
    license_expires_at: club?.license_expires_at ? format(new Date(club.license_expires_at), "yyyy-MM-dd") : format(new Date(Date.now() + 365*24*60*60*1000), "yyyy-MM-dd"),
  })
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // Auto-genera slug dal nome
  function generateSlug(nome) {
    return nome.toLowerCase()
      .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u').replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-').replace(/^-|-$/g, '')
  }

  async function save() {
    if (!form.nome || !form.slug) return toast.error('Nome e slug obbligatori')
    setLoading(true)
    const payload = {
      nome: form.nome, slug: form.slug, email: form.email,
      telefono: form.telefono, citta: form.citta,
      piano: form.piano, stato: form.stato,
      trial_ends_at: form.trial_ends_at || null,
      license_expires_at: form.license_expires_at || null,
      max_users: form.max_users,
      updated_at: new Date().toISOString(),
    }
    const { error } = isEdit
      ? await supabase.from('clubs').update(payload).eq('id', club.id)
      : await supabase.from('clubs').insert([payload])
    if (error) toast.error(error.message)
    else { toast.success(isEdit ? 'Squadra aggiornata' : 'Squadra creata!'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit ? 'Modifica' : 'Nuova'} Squadra</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">

          {/* Dati squadra */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Nome squadra *</label>
            <input value={form.nome} onChange={e => { set('nome', e.target.value); if (!isEdit) set('slug', generateSlug(e.target.value)) }}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Slug (URL unico) *</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#999]">soccerclub.it/</span>
              <input value={form.slug} onChange={e => set('slug', e.target.value)}
                className="flex-1 border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560] font-mono"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Email</label>
              <input value={form.email||''} onChange={e => set('email', e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Telefono</label>
              <input value={form.telefono||''} onChange={e => set('telefono', e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560]"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Città</label>
            <input value={form.citta||''} onChange={e => set('citta', e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560]"/>
          </div>

          {/* Licenza */}
          <div className="border-t border-[#e7eaec] pt-3">
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-2">Licenza</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#999] mb-1">Piano</label>
                <select value={form.piano} onChange={e => set('piano', e.target.value)}
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560]">
                  {PIANI.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">Stato</label>
                <select value={form.stato} onChange={e => set('stato', e.target.value)}
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560]">
                  {STATI.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">Fine trial</label>
                <input type="date" value={form.trial_ends_at||''} onChange={e => set('trial_ends_at', e.target.value)}
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560]"/>
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">Scadenza licenza</label>
                <input type="date" value={form.license_expires_at||''} onChange={e => set('license_expires_at', e.target.value)}
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560]"/>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Max utenti</label>
            <input type="number" min="1" value={form.max_users||100} onChange={e => set('max_users', +e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560]"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-[#e94560] hover:bg-[#c73652] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Salvataggio...' : isEdit ? 'Salva' : 'Crea squadra'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SuperAdminClubs() {
  const [clubs, setClubs] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStato, setFilterStato] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('clubs').select('*').order('created_at', { ascending: false })
    setClubs(data || [])
    setLoading(false)
  }

  async function toggleStato(club) {
    const nuovoStato = club.stato === 'active' ? 'suspended' : 'active'
    const { error } = await supabase.from('clubs').update({ stato: nuovoStato }).eq('id', club.id)
    if (error) toast.error(error.message)
    else { toast.success(`Squadra ${nuovoStato === 'active' ? 'riattivata' : 'sospesa'}`); load() }
  }

  async function extendLicense(club) {
    const newDate = new Date(club.license_expires_at || new Date())
    newDate.setFullYear(newDate.getFullYear() + 1)
    const { error } = await supabase.from('clubs').update({
      license_expires_at: newDate.toISOString(),
      stato: 'active'
    }).eq('id', club.id)
    if (error) toast.error(error.message)
    else { toast.success('Licenza estesa di 1 anno'); load() }
  }

  const filtered = clubs.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${c.nome} ${c.citta} ${c.slug}`.toLowerCase().includes(q)
    const matchStato = !filterStato || c.stato === filterStato
    return matchSearch && matchStato
  })

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Squadre</h1>
          <p className="text-sm text-[#999] mt-1">Gestione squadre e licenze</p>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 bg-[#e94560] hover:bg-[#c73652] text-white px-4 py-2 rounded text-sm font-semibold">
          <Plus size={16}/> Nuova squadra
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { stato: 'active',    label: 'Attive',    color: 'text-green-600',  icon: CheckCircle },
          { stato: 'trial',     label: 'Trial',     color: 'text-blue-600',   icon: Clock },
          { stato: 'suspended', label: 'Sospese',   color: 'text-yellow-600', icon: AlertTriangle },
          { stato: 'expired',   label: 'Scadute',   color: 'text-red-500',    icon: XCircle },
        ].map(({ stato, label, color, icon: Icon }) => (
          <div key={stato} className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center cursor-pointer hover:border-[#e94560]"
            onClick={() => setFilterStato(filterStato === stato ? '' : stato)}>
            <Icon size={18} className={clsx('mx-auto mb-1', color)}/>
            <div className="text-xl font-bold text-[#2f4050]">{clubs.filter(c => c.stato === stato).length}</div>
            <div className="text-xs text-[#999] uppercase tracking-wide">{label}</div>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div className="flex gap-2 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cerca squadra..."
          className="flex-1 min-w-48 border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560]"/>
        <select value={filterStato} onChange={e => setFilterStato(e.target.value)}
          className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560]">
          <option value="">Tutti gli stati</option>
          {STATI.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
      </div>

      {/* Tabella */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-[#e94560] border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-[#999] py-10 text-sm">
            <Building2 size={32} className="mx-auto mb-2 opacity-30"/>
            Nessuna squadra trovata
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e7eaec] bg-gray-50">
                  {['Squadra','Piano','Stato','Scadenza licenza','Azioni'].map(h => (
                    <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const days = c.license_expires_at
                    ? differenceInDays(new Date(c.license_expires_at), new Date())
                    : null
                  return (
                    <tr key={c.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#e94560]/10 text-[#e94560] flex items-center justify-center flex-shrink-0">
                            <Building2 size={15}/>
                          </div>
                          <div>
                            <div className="text-[#2f4050] font-medium">{c.nome}</div>
                            <div className="text-xs text-[#999]">{c.citta} · /{c.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium capitalize', PIANO_COLORS[c.piano])}>
                          {c.piano}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium capitalize', STATO_COLORS[c.stato])}>
                          {c.stato}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {c.license_expires_at ? (
                          <span className={clsx('text-xs', days !== null && days <= 7 ? 'text-red-500 font-semibold' : 'text-[#999]')}>
                            {format(new Date(c.license_expires_at), 'dd/MM/yyyy')}
                            {days !== null && days <= 30 && (
                              <span className="ml-1">({days < 0 ? 'scaduta' : `${days}gg`})</span>
                            )}
                          </span>
                        ) : <span className="text-[#999] text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setModal(c)}
                            className="text-[#999] hover:text-[#e94560]" title="Modifica">
                            <Edit2 size={14}/>
                          </button>
                          <button onClick={() => extendLicense(c)}
                            className="text-xs text-[#1ab394] hover:underline whitespace-nowrap">
                            +1 anno
                          </button>
                          <button onClick={() => toggleStato(c)}
                            className={clsx('text-xs hover:underline whitespace-nowrap',
                              c.stato === 'active' ? 'text-yellow-600' : 'text-green-600')}>
                            {c.stato === 'active' ? 'Sospendi' : 'Attiva'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && (
        <ClubModal club={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }}/>
      )}
    </div>
  )
}

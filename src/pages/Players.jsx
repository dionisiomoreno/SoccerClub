import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { UserPlus, Search, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const ROLES = ['admin','mister','player_paid','player_volunteer']
const ROLE_LABELS = { admin:'Admin', mister:'Mister', player_paid:'Calciatore', player_volunteer:'Volontario' }
const ROLE_COLORS = { admin:'bg-red-500/20 text-red-400', mister:'bg-blue-500/20 text-blue-400', player_paid:'bg-green-500/20 text-green-400', player_volunteer:'bg-yellow-500/20 text-yellow-400' }
const TAGLIE = ['XS','S','M','L','XL','XXL']

function PlayerModal({ player, onClose, onSaved }) {
  const isEdit = !!player?.id
  const [form, setForm] = useState({
    nome: '', cognome: '', email: '', telefono: '', data_nascita: '',
    codice_fiscale: '', numero_patente: '', taglia: 'M', ruolo: 'player_paid', active: true,
    ...player
  })
  const [loading, setLoading] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    setLoading(true)
    const { error } = isEdit
      ? await supabase.from('profiles').update({ ...form }).eq('id', form.id)
      : await supabase.from('profiles').insert([{ ...form }])
    if (error) toast.error(error.message)
    else { toast.success(isEdit ? 'Calciatore aggiornato' : 'Calciatore aggiunto'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <h2 className="text-white font-semibold">{isEdit ? 'Modifica' : 'Nuovo'} Calciatore</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-white">✕</button>
        </div>
        <div className="p-4 space-y-3">
          {[['nome','Nome'],['cognome','Cognome'],['telefono','Telefono'],['data_nascita','Data nascita','date'],['codice_fiscale','Codice fiscale'],['numero_patente','N° patente']].map(([k,l,t='text']) => (
            <div key={k}>
              <label className="block text-xs text-[#6B7280] mb-1">{l}</label>
              <input type={t} value={form[k]||''} onChange={e=>set(k,e.target.value)}
                className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"/>
            </div>
          ))}
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Email</label>
            <input type="email" value={form.email||''} onChange={e=>set('email',e.target.value)} disabled={isEdit}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000] disabled:opacity-50"/>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Taglia</label>
            <select value={form.taglia} onChange={e=>set('taglia',e.target.value)}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]">
              {TAGLIE.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Ruolo</label>
            <select value={form.ruolo} onChange={e=>set('ruolo',e.target.value)}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]">
              {ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e=>set('active',e.target.checked)} className="accent-[#C00000]"/>
            <span className="text-sm text-white">Attivo</span>
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

export default function Players() {
  const [players, setPlayers] = useState([])
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('cognome')
    setPlayers(data || [])
    setLoading(false)
  }

  async function toggleActive(p) {
    await supabase.from('profiles').update({ active: !p.active }).eq('id', p.id)
    load()
  }

  async function deletePlayer(p) {
    if (!confirm(`Eliminare ${p.nome} ${p.cognome}?`)) return
    await supabase.from('profiles').delete().eq('id', p.id)
    toast.success('Calciatore eliminato')
    load()
  }

  const filtered = players.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${p.nome} ${p.cognome} ${p.email}`.toLowerCase().includes(q)
    const matchRole = !filterRole || p.ruolo === filterRole
    const matchActive = filterActive === '' || (filterActive === '1' ? p.active : !p.active)
    return matchSearch && matchRole && matchActive
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Calciatori</h1>
        <button onClick={() => setModal({})} className="flex items-center gap-2 bg-[#C00000] hover:bg-[#A00000] text-white px-3 py-2 rounded-lg text-sm font-semibold">
          <UserPlus size={16}/> Nuovo
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca..."
            className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg pl-8 pr-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"/>
        </div>
        <select value={filterRole} onChange={e=>setFilterRole(e.target.value)}
          className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none">
          <option value="">Tutti i ruoli</option>
          {ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={filterActive} onChange={e=>setFilterActive(e.target.value)}
          className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none">
          <option value="">Tutti</option>
          <option value="1">Attivi</option>
          <option value="0">Non attivi</option>
        </select>
      </div>

      <div className="text-xs text-[#6B7280]">{filtered.length} calciatori</div>

      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-[#C00000] border-t-transparent rounded-full animate-spin"/></div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-[#6B7280] py-12 text-sm">Nessun calciatore trovato</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  {['Calciatore','Email','Telefono','Ruolo','Taglia','Stato','Azioni'].map(h=>(
                    <th key={h} className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-[#2A2A2A] hover:bg-[#2A2A2A]/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#C00000]/20 text-[#C00000] flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {(p.nome?.[0]||'')+(p.cognome?.[0]||'')}
                        </div>
                        <span className="text-white font-medium">{p.nome} {p.cognome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{p.email}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{p.telefono||'-'}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', ROLE_COLORS[p.ruolo])}>
                        {ROLE_LABELS[p.ruolo]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{p.taglia||'-'}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs', p.active ? 'bg-green-500/20 text-green-400' : 'bg-[#2A2A2A] text-[#6B7280]')}>
                        {p.active ? 'Attivo' : 'Non attivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={()=>toggleActive(p)} className="text-[#6B7280] hover:text-white transition-colors">
                          {p.active ? <ToggleRight size={18} className="text-green-400"/> : <ToggleLeft size={18}/>}
                        </button>
                        <button onClick={()=>setModal(p)} className="text-[#6B7280] hover:text-white transition-colors"><Edit2 size={15}/></button>
                        <button onClick={()=>deletePlayer(p)} className="text-[#6B7280] hover:text-red-400 transition-colors"><Trash2 size={15}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && <PlayerModal player={modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}}/>}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Package, Plus, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const STATUS_LABELS = { pending: 'In attesa', approved: 'Approvata', delivered: 'Consegnata', rejected: 'Rifiutata' }
const STATUS_COLORS = { pending: 'bg-yellow-500/20 text-yellow-400', approved: 'bg-green-500/20 text-green-400', delivered: 'bg-blue-500/20 text-blue-400', rejected: 'bg-red-500/20 text-red-400' }

function MaterialModal({ material, onClose, onSaved }) {
  const isEdit = !!material?.id
  const [form, setForm] = useState({ nome: '', quantita: 0, descrizione: '', ...material })
  const [loading, setLoading] = useState(false)
  async function save() {
    setLoading(true)
    const { error } = isEdit
      ? await supabase.from('materials').update(form).eq('id', form.id)
      : await supabase.from('materials').insert([form])
    if (error) toast.error(error.message)
    else { toast.success('Salvato'); onSaved() }
    setLoading(false)
  }
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <h2 className="text-white font-semibold">{isEdit ? 'Modifica' : 'Nuovo'} Materiale</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-white">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Nome</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"/>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Quantità</label>
            <input type="number" min="0" value={form.quantita} onChange={e => setForm(f => ({ ...f, quantita: +e.target.value }))}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"/>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Descrizione</label>
            <textarea value={form.descrizione||''} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} rows={2}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000] resize-none"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#2A2A2A]">
          <button onClick={onClose} className="flex-1 bg-[#2A2A2A] text-white py-2 rounded-lg text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#C00000] hover:bg-[#A00000] disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold">Salva</button>
        </div>
      </div>
    </div>
  )
}

function RequestModal({ materials, onClose, onSaved, playerId }) {
  const [form, setForm] = useState({ material_id: '', quantita: 1, note: '' })
  const [loading, setLoading] = useState(false)
  async function save() {
    if (!form.material_id) return toast.error('Seleziona un materiale')
    setLoading(true)
    const { error } = await supabase.from('material_requests').insert([{ ...form, player_id: playerId, status: 'pending' }])
    if (error) toast.error(error.message)
    else { toast.success('Richiesta inviata'); onSaved() }
    setLoading(false)
  }
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <h2 className="text-white font-semibold">Richiedi Materiale</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-white">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Materiale</label>
            <select value={form.material_id} onChange={e => setForm(f => ({ ...f, material_id: e.target.value }))}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]">
              <option value="">Seleziona...</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.nome} (disp. {m.quantita})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Quantità</label>
            <input type="number" min="1" value={form.quantita} onChange={e => setForm(f => ({ ...f, quantita: +e.target.value }))}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"/>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Note</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000] resize-none"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#2A2A2A]">
          <button onClick={onClose} className="flex-1 bg-[#2A2A2A] text-white py-2 rounded-lg text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#C00000] hover:bg-[#A00000] disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold">Invia</button>
        </div>
      </div>
    </div>
  )
}

export default function Materials() {
  const { profile, isAdmin } = useAuth()
  const [tab, setTab] = useState('inventory')
  const [materials, setMaterials] = useState([])
  const [requests, setRequests] = useState([])
  const [modal, setModal] = useState(null)
  const [reqModal, setReqModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [tab])

  async function load() {
    setLoading(true)
    if (tab === 'inventory') {
      const { data } = await supabase.from('materials').select('*').order('nome')
      setMaterials(data || [])
    } else {
      let q = supabase.from('material_requests').select('*, materials(nome), profiles(nome,cognome)').order('created_at', { ascending: false })
      if (!isAdmin) q = q.eq('player_id', profile.id)
      const { data } = await q
      setRequests(data || [])
    }
    setLoading(false)
  }

  async function updateStatus(id, status, playerId, materialName) {
    await supabase.from('material_requests').update({ status }).eq('id', id)
    await supabase.from('notifications').insert([{ user_id: playerId, type: status === 'approved' ? 'request_approved' : 'request_rejected', message: `Richiesta materiale "${materialName}" ${STATUS_LABELS[status].toLowerCase()}`, read: false }])
    toast.success('Stato aggiornato')
    load()
  }

  async function deleteMaterial(id) {
    if (!confirm('Eliminare questo materiale?')) return
    await supabase.from('materials').delete().eq('id', id)
    toast.success('Eliminato')
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Materiale</h1>
        <div className="flex gap-2">
          <button onClick={() => setReqModal(true)} className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white px-3 py-2 rounded-lg text-sm">Richiedi</button>
          {isAdmin && <button onClick={() => setModal({})} className="flex items-center gap-2 bg-[#C00000] hover:bg-[#A00000] text-white px-3 py-2 rounded-lg text-sm font-semibold"><Plus size={16}/> Nuovo</button>}
        </div>
      </div>

      <div className="flex gap-1 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg p-1 w-fit">
        {[['inventory','Inventario'],['requests','Richieste']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} className={clsx('px-4 py-1.5 rounded-md text-sm font-medium transition-colors', tab === v ? 'bg-[#C00000] text-white' : 'text-[#6B7280] hover:text-white')}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-[#C00000] border-t-transparent rounded-full animate-spin"/></div>
      ) : tab === 'inventory' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {materials.map(m => (
            <div key={m.id} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between">
                <Package size={20} className="text-[#6B7280]"/>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => setModal(m)} className="text-[#6B7280] hover:text-white"><Edit2 size={13}/></button>
                    <button onClick={() => deleteMaterial(m.id)} className="text-[#6B7280] hover:text-red-400"><Trash2 size={13}/></button>
                  </div>
                )}
              </div>
              <div className="text-white font-medium text-sm">{m.nome}</div>
              {m.descrizione && <div className="text-[#6B7280] text-xs">{m.descrizione}</div>}
              <div className={clsx('text-2xl font-bold', m.quantita > 5 ? 'text-green-400' : m.quantita > 0 ? 'text-yellow-400' : 'text-red-400')}>{m.quantita}</div>
            </div>
          ))}
          {materials.length === 0 && <div className="col-span-4 text-center text-[#6B7280] py-10 text-sm">Nessun materiale</div>}
        </div>
      ) : (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden">
          {requests.length === 0 ? (
            <div className="text-center text-[#6B7280] py-10 text-sm">Nessuna richiesta</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  {isAdmin && <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Calciatore</th>}
                  <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Materiale</th>
                  <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Qta</th>
                  <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Stato</th>
                  {isAdmin && <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Azioni</th>}
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="border-b border-[#2A2A2A] hover:bg-[#2A2A2A]/30">
                    {isAdmin && <td className="px-4 py-3 text-white">{r.profiles?.cognome} {r.profiles?.nome}</td>}
                    <td className="px-4 py-3 text-white">{r.materials?.nome}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{r.quantita}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status]}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {r.status === 'pending' && <>
                            <button onClick={() => updateStatus(r.id, 'approved', r.player_id, r.materials?.nome)} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30">Approva</button>
                            <button onClick={() => updateStatus(r.id, 'rejected', r.player_id, r.materials?.nome)} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30">Rifiuta</button>
                          </>}
                          {r.status === 'approved' && <button onClick={() => updateStatus(r.id, 'delivered', r.player_id, r.materials?.nome)} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30">Consegnato</button>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modal !== null && <MaterialModal material={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }}/>}
      {reqModal && <RequestModal materials={materials.length ? materials : []} playerId={profile?.id} onClose={() => setReqModal(false)} onSaved={() => { setReqModal(false); load() }}/>}
    </div>
  )
}

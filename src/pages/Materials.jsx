import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Package, Plus, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const STATUS_LABELS = { pending: 'In attesa', approved: 'Approvata', delivered: 'Consegnata', rejected: 'Rifiutata' }
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-600',
  approved: 'bg-green-100 text-green-600',
  delivered: 'bg-blue-100 text-blue-600',
  rejected: 'bg-red-100 text-red-600'
}

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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit ? 'Modifica' : 'Nuovo'} Materiale</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]">✕</button>
        </div>
        <div className="p-4 space-y-3">
          {[['nome','Nome'],['descrizione','Descrizione']].map(([k,l]) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">{l}</label>
              <input value={form[k]||''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Quantità</label>
            <input type="number" min="0" value={form.quantita} onChange={e => setForm(f => ({ ...f, quantita: +e.target.value }))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">Salva</button>
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Richiedi Materiale</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Materiale</label>
            <select value={form.material_id} onChange={e => setForm(f => ({ ...f, material_id: e.target.value }))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              <option value="">Seleziona...</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.nome} (disp. {m.quantita})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Quantità</label>
            <input type="number" min="1" value={form.quantita} onChange={e => setForm(f => ({ ...f, quantita: +e.target.value }))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Note</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">Invia</button>
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
    await supabase.from('notifications').insert([{ user_id: playerId, type: status === 'approved' ? 'request_approved' : 'request_rejected', message: `Richiesta "${materialName}" ${STATUS_LABELS[status].toLowerCase()}`, read: false }])
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
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Materiale</h1>
          <p className="text-sm text-[#999] mt-1">Inventario e richieste materiale</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setReqModal(true)} className="border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-4 py-2 rounded text-sm">Richiedi</button>
          {isAdmin && <button onClick={() => setModal({})} className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold"><Plus size={16}/> Nuovo</button>}
        </div>
      </div>

      <div className="flex gap-1 border-b border-[#e7eaec]">
        {[['inventory','Inventario'],['requests','Richieste']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={clsx('px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === v ? 'border-[#1ab394] text-[#1ab394]' : 'border-transparent text-[#999] hover:text-[#676a6c]')}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/></div>
      ) : tab === 'inventory' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {materials.map(m => (
            <div key={m.id} className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 space-y-2">
              <div className="flex items-start justify-between">
                <Package size={20} className="text-[#999]"/>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => setModal(m)} className="text-[#999] hover:text-[#1c84c6]"><Edit2 size={13}/></button>
                    <button onClick={() => deleteMaterial(m.id)} className="text-[#999] hover:text-red-500"><Trash2 size={13}/></button>
                  </div>
                )}
              </div>
              <div className="text-[#2f4050] font-semibold text-sm">{m.nome}</div>
              {m.descrizione && <div className="text-[#999] text-xs">{m.descrizione}</div>}
              {isAdmin && (
  <div className={clsx('text-2xl font-bold', m.quantita > 5 ? 'text-[#1ab394]' : m.quantita > 0 ? 'text-yellow-500' : 'text-red-500')}>{m.quantita}</div>
)}
            </div>
          ))}
          {materials.length === 0 && <div className="col-span-4 text-center text-[#999] py-10 text-sm">Nessun materiale</div>}
        </div>
      ) : (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
          {requests.length === 0 ? (
            <div className="text-center text-[#999] py-10 text-sm">Nessuna richiesta</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e7eaec] bg-gray-50">
                  {isAdmin && <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Calciatore</th>}
                  <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Materiale</th>
                  <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Qta</th>
                  <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Stato</th>
                  {isAdmin && <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Azioni</th>}
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                    {isAdmin && <td className="px-4 py-3 text-[#2f4050] font-medium">{r.profiles?.cognome} {r.profiles?.nome}</td>}
                    <td className="px-4 py-3 text-[#676a6c]">{r.materials?.nome}</td>
                    <td className="px-4 py-3 text-[#999]">{r.quantita}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status]}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {r.status === 'pending' && <>
                            <button onClick={() => updateStatus(r.id, 'approved', r.player_id, r.materials?.nome)} className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200">Approva</button>
                            <button onClick={() => updateStatus(r.id, 'rejected', r.player_id, r.materials?.nome)} className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200">Rifiuta</button>
                          </>}
                          {r.status === 'approved' && <button onClick={() => updateStatus(r.id, 'delivered', r.player_id, r.materials?.nome)} className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs hover:bg-blue-200">Consegnato</button>}
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
      {reqModal && <RequestModal materials={materials} playerId={profile?.id} onClose={() => setReqModal(false)} onSaved={() => { setReqModal(false); load() }}/>}
    </div>
  )
}

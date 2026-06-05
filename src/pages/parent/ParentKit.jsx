import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ShoppingBag, Plus, X, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

const TAGLIE = ['XS','S','M','L','XL','XXL','Unica','4','5','6','7','8','9','10','11','12']

const STATI = {
  in_attesa:  { label: 'In attesa',  color: 'bg-yellow-100 text-yellow-600', icon: Clock },
  approvata:  { label: 'Approvata',  color: 'bg-green-100 text-green-600',   icon: CheckCircle },
  consegnata: { label: 'Consegnata', color: 'bg-blue-100 text-blue-600',     icon: CheckCircle },
  rifiutata:  { label: 'Rifiutata',  color: 'bg-red-100 text-red-600',       icon: XCircle },
}

function RequestModal({ child, items, onClose, onSaved }) {
  const [cart, setCart] = useState([{ item_id: '', quantita: 1, taglia: '', note: '' }])
  const [loading, setLoading] = useState(false)

  function addRow() { setCart(c => [...c, { item_id: '', quantita: 1, taglia: '', note: '' }]) }
  function setRow(i, k, v) { setCart(c => c.map((r, idx) => idx === i ? { ...r, [k]: v } : r)) }
  function removeRow(i) { setCart(c => c.filter((_, idx) => idx !== i)) }

  async function save() {
    const validRows = cart.filter(r => r.item_id && r.quantita > 0)
    if (validRows.length === 0) return toast.error('Aggiungi almeno un articolo')
    setLoading(true)
    const { error } = await supabase.from('kit_requests').insert(
      validRows.map(r => ({
        youth_player_id: child.id,
        warehouse_item_id: r.item_id,
        quantita: r.quantita,
        taglia: r.taglia || null,
        note: r.note || null,
        stato: 'in_attesa',
      }))
    )
    if (error) toast.error(error.message)
    else { toast.success('Richiesta inviata!'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Richiesta Kit</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-[#27ae60]/5 border border-[#27ae60]/20 rounded p-3 text-sm text-[#676a6c]">
            Stai richiedendo materiale per <strong>{child.nome} {child.cognome}</strong>.
            La segreteria elaborerà la richiesta e ti avviserà appena il kit sarà pronto.
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#999] uppercase tracking-wide">Articoli richiesti</label>
              <button onClick={addRow} className="text-xs text-[#27ae60] hover:underline">+ Aggiungi riga</button>
            </div>
            {cart.map((row, i) => (
              <div key={i} className="bg-gray-50 rounded p-3 mb-2 space-y-2">
                <div className="flex gap-2 items-center">
                  <select value={row.item_id} onChange={e => setRow(i, 'item_id', e.target.value)}
                    className="flex-1 border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]">
                    <option value="">Seleziona articolo...</option>
                    {items.map(it => (
                      <option key={it.id} value={it.id}>
                        {it.nome} {it.taglia ? `(${it.taglia})` : ''} {it.prezzo > 0 ? `— €${it.prezzo}` : ''}
                      </option>
                    ))}
                  </select>
                  {cart.length > 1 && (
                    <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                      <X size={16}/>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[#999] mb-1">Quantità</label>
                    <input type="number" min="1" value={row.quantita}
                      onChange={e => setRow(i, 'quantita', +e.target.value)}
                      className="w-full border border-[#e7eaec] rounded px-3 py-1.5 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]"/>
                  </div>
                  <div>
                    <label className="block text-xs text-[#999] mb-1">Taglia</label>
                    <select value={row.taglia} onChange={e => setRow(i, 'taglia', e.target.value)}
                      className="w-full border border-[#e7eaec] rounded px-3 py-1.5 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]">
                      <option value="">—</option>
                      {TAGLIE.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#999] mb-1">Note (opzionale)</label>
                  <input value={row.note} onChange={e => setRow(i, 'note', e.target.value)}
                    placeholder="Es. colore preferito, urgenza..."
                    className="w-full border border-[#e7eaec] rounded px-3 py-1.5 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]"/>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-[#27ae60] hover:bg-[#229954] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Invio in corso...' : 'Invia richiesta'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ParentKit() {
  const { profile } = useAuth()
  const [child, setChild] = useState(null)
  const [requests, setRequests] = useState([])
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [profile])

  async function load() {
    if (!profile?.id) return
    setLoading(true)
    const { data: parent } = await supabase
      .from('parents')
      .select('*, youth_players(*)')
      .eq('user_id', profile.id)
      .single()
    if (!parent?.youth_players) { setLoading(false); return }
    const yp = parent.youth_players
    setChild(yp)

    const [{ data: reqs }, { data: its }] = await Promise.all([
      supabase.from('kit_requests')
        .select('*, warehouse_items(nome, taglia, prezzo)')
        .eq('youth_player_id', yp.id)
        .order('created_at', { ascending: false }),
      supabase.from('warehouse_items')
        .select('id, nome, taglia, prezzo, quantita_disponibile')
        .eq('active', true)
        .gt('quantita_disponibile', 0)
        .order('nome'),
    ])
    setRequests(reqs || [])
    setItems(its || [])
    setLoading(false)
  }

  if (!loading && !child) return (
    <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
      <AlertTriangle size={32} className="mx-auto text-yellow-500 mb-2"/>
      <p className="text-yellow-700">Nessun atleta collegato. Contatta la segreteria.</p>
    </div>
  )

  const inAttesa   = requests.filter(r => r.stato === 'in_attesa').length
  const approvate  = requests.filter(r => r.stato === 'approvata').length
  const consegnate = requests.filter(r => r.stato === 'consegnata').length

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Richiesta Kit</h1>
          <p className="text-sm text-[#999] mt-1">Materiale e abbigliamento sportivo</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-[#27ae60] hover:bg-[#229954] text-white px-4 py-2 rounded text-sm font-semibold">
          <Plus size={16}/> Nuova richiesta
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <Clock size={20} className="mx-auto text-yellow-500 mb-2"/>
          <div className="text-2xl font-bold text-[#2f4050]">{inAttesa}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">In attesa</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <CheckCircle size={20} className="mx-auto text-[#27ae60] mb-2"/>
          <div className="text-2xl font-bold text-[#2f4050]">{approvate}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Approvate</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <ShoppingBag size={20} className="mx-auto text-blue-500 mb-2"/>
          <div className="text-2xl font-bold text-[#2f4050]">{consegnate}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Consegnate</div>
        </div>
      </div>

      {/* Lista richieste */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e7eaec]">
          <h2 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide">Storico richieste</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-6 h-6 border-2 border-[#27ae60] border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center text-[#999] py-10 text-sm">
            <ShoppingBag size={32} className="mx-auto mb-2 opacity-30"/>
            Nessuna richiesta effettuata
          </div>
        ) : (
          <div className="divide-y divide-[#e7eaec]">
            {requests.map(r => {
              const S = STATI[r.stato] || STATI.in_attesa
              const SIcon = S.icon
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', S.color)}>
                    <SIcon size={17}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[#2f4050] font-medium text-sm">
                      {r.warehouse_items?.nome}
                      {r.taglia && <span className="ml-1 text-xs bg-gray-100 text-[#676a6c] px-1.5 py-0.5 rounded">{r.taglia}</span>}
                      <span className="ml-1 text-xs text-[#999]">×{r.quantita}</span>
                    </div>
                    <div className="text-xs text-[#999] mt-0.5">
                      {format(new Date(r.created_at), 'd MMM yyyy', { locale: it })}
                      {r.note && ` · ${r.note}`}
                    </div>
                  </div>
                  <span className={clsx('px-2 py-0.5 rounded text-xs font-medium flex-shrink-0', S.color)}>
                    {S.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && child && (
        <RequestModal
          child={child}
          items={items}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); load() }}
        />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, Edit2, Trash2, X, ShoppingBag, Package, Truck,
  AlertTriangle, Download, ChevronDown, ChevronUp, ArrowUp, ArrowDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const TAGLIE = ['XS','S','M','L','XL','XXL','Unica','4','5','6','7','8','9','10','11','12']
const CAT_ABB = ['kit_gara','kit_allenamento','tuta','giacca','kway','borsone','calzettoni','pantaloncini','altro']
const CAT_ABB_LABELS = { kit_gara:'Kit Gara', kit_allenamento:'Kit Allenamento', tuta:'Tuta', giacca:'Giacca', kway:'K-Way', borsone:'Borsone', calzettoni:'Calzettoni', pantaloncini:'Pantaloncini', altro:'Altro' }
const CAT_MAT = ['palloni','coni','pettorine','porte','ostacoli','bib','altro']
const CAT_MAT_LABELS = { palloni:'Palloni', coni:'Coni', pettorine:'Pettorine', porte:'Porte', ostacoli:'Ostacoli', bib:'Bib', altro:'Altro' }

// ── Modal articolo abbigliamento ─────────────────────────────
function ItemModal({ item, onClose, onSaved }) {
  const isEdit = !!item?.id
  const [form, setForm] = useState({ codice:'', nome:'', descrizione:'', categoria:'kit_gara', taglia:'', quantita_disponibile:0, quantita_minima:2, prezzo:0, active:true, ...item })
  const [loading, setLoading] = useState(false)
  function set(k,v) { setForm(f=>({...f,[k]:v})) }
  async function save() {
    if (!form.nome) return toast.error('Nome obbligatorio')
    setLoading(true)
    const { error } = isEdit
      ? await supabase.from('warehouse_items').update(form).eq('id', form.id)
      : await supabase.from('warehouse_items').insert([form])
    if (error) toast.error(error.message)
    else { toast.success('Articolo salvato'); onSaved() }
    setLoading(false)
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit?'Modifica':'Nuovo'} Articolo</h2>
          <button onClick={onClose}><X size={18} className="text-[#999]"/></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Codice</label>
              <input value={form.codice||''} onChange={e=>set('codice',e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Taglia</label>
              <select value={form.taglia||''} onChange={e=>set('taglia',e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                <option value="">—</option>
                {TAGLIE.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Nome *</label>
            <input value={form.nome} onChange={e=>set('nome',e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Categoria</label>
            <select value={form.categoria} onChange={e=>set('categoria',e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              {CAT_ABB.map(c=><option key={c} value={c}>{CAT_ABB_LABELS[c]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Qta disp.</label>
              <input type="number" min="0" value={form.quantita_disponibile} onChange={e=>set('quantita_disponibile',+e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Qta min.</label>
              <input type="number" min="0" value={form.quantita_minima} onChange={e=>set('quantita_minima',+e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Prezzo €</label>
              <input type="number" min="0" step="0.01" value={form.prezzo} onChange={e=>set('prezzo',+e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">{loading?'Salvataggio...':'Salva'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal consegna kit ───────────────────────────────────────
function DeliveryModal({ players, items, onClose, onSaved, profile }) {
  const [playerId, setPlayerId] = useState('')
  const [cart, setCart] = useState([{ item_id:'', quantita:1, taglia:'' }])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  function addRow() { setCart(c=>[...c,{ item_id:'', quantita:1, taglia:'' }]) }
  function setRow(i,k,v) { setCart(c=>c.map((r,idx)=>idx===i?{...r,[k]:v}:r)) }
  function removeRow(i) { setCart(c=>c.filter((_,idx)=>idx!==i)) }
  async function save() {
    if (!playerId) return toast.error('Seleziona un atleta')
    const valid = cart.filter(r=>r.item_id && r.quantita>0)
    if (!valid.length) return toast.error('Aggiungi almeno un articolo')
    setLoading(true)
    const { data: del, error } = await supabase.from('deliveries').insert([{
      youth_player_id: playerId, data_consegna: format(new Date(),'yyyy-MM-dd'),
      operatore_id: profile?.id, note
    }]).select().single()
    if (error) { toast.error(error.message); setLoading(false); return }
    await supabase.from('delivery_items').insert(valid.map(r=>({ delivery_id:del.id, ...r })))
    for (const r of valid) {
      const it = items.find(i=>i.id===r.item_id)
      if (it) {
        await supabase.from('warehouse_items').update({ quantita_disponibile: Math.max(0, it.quantita_disponibile - r.quantita) }).eq('id', r.item_id)
        await supabase.from('warehouse_movements').insert([{ item_id:r.item_id, tipo:'consegna', quantita:-r.quantita, operatore_id:profile?.id }])
      }
    }
    const player = players.find(p=>p.id===playerId)
    const { data: ts } = await supabase.from('team_settings').select('*').single()
    generateDeliveryPDF(del, player, valid.map(r=>({ ...r, item: items.find(i=>i.id===r.item_id) })), ts)
    toast.success('Consegna registrata!')
    onSaved()
    setLoading(false)
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Nuova Consegna Kit</h2>
          <button onClick={onClose}><X size={18} className="text-[#999]"/></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Atleta</label>
            <select value={playerId} onChange={e=>setPlayerId(e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              <option value="">Seleziona atleta...</option>
              {players.map(p=><option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#999] uppercase tracking-wide">Articoli</label>
              <button onClick={addRow} className="text-xs text-[#1ab394] hover:underline">+ Aggiungi</button>
            </div>
            {cart.map((row,i)=>(
              <div key={i} className="flex gap-2 mb-2 items-center">
                <select value={row.item_id} onChange={e=>setRow(i,'item_id',e.target.value)} className="flex-1 border border-[#e7eaec] rounded px-2 py-1.5 text-[#676a6c] text-xs outline-none focus:border-[#1ab394]">
                  <option value="">Articolo...</option>
                  {items.map(it=><option key={it.id} value={it.id}>{it.nome}{it.taglia?` (${it.taglia})`:''}</option>)}
                </select>
                <input type="number" min="1" value={row.quantita} onChange={e=>setRow(i,'quantita',+e.target.value)} className="w-14 border border-[#e7eaec] rounded px-2 py-1.5 text-[#676a6c] text-xs outline-none focus:border-[#1ab394]"/>
                <select value={row.taglia||''} onChange={e=>setRow(i,'taglia',e.target.value)} className="w-20 border border-[#e7eaec] rounded px-2 py-1.5 text-[#676a6c] text-xs outline-none focus:border-[#1ab394]">
                  <option value="">Taglia</option>
                  {TAGLIE.map(t=><option key={t}>{t}</option>)}
                </select>
                {cart.length>1 && <button onClick={()=>removeRow(i)}><X size={14} className="text-red-400"/></button>}
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Note</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">{loading?'Registrando...':'Registra + PDF'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal configuratore kit ──────────────────────────────────
function KitConfigModal({ categories, items, onClose, onSaved }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ nome:'', descrizione:'', category_id:'' })
  const [rows, setRows] = useState([{ warehouse_item_id:'', quantita:1, note:'' }])
  const [loading, setLoading] = useState(false)
  function setF(k,v) { setForm(f=>({...f,[k]:v})) }
  function addRow() { setRows(r=>[...r,{ warehouse_item_id:'', quantita:1, note:'' }]) }
  function setRow(i,k,v) { setRows(r=>r.map((x,idx)=>idx===i?{...x,[k]:v}:x)) }
  function removeRow(i) { setRows(r=>r.filter((_,idx)=>idx!==i)) }
  async function save() {
    if (!form.nome) return toast.error('Nome kit obbligatorio')
    const valid = rows.filter(r=>r.warehouse_item_id)
    if (!valid.length) return toast.error('Aggiungi almeno un articolo')
    setLoading(true)
    const { data: kit, error } = await supabase.from('sc_kit_configs').insert([{
      nome: form.nome, descrizione: form.descrizione,
      category_id: form.category_id || null,
      club_id: profile?.club_id
    }]).select().single()
    if (error) { toast.error(error.message); setLoading(false); return }
    await supabase.from('sc_kit_config_items').insert(valid.map(r=>({ kit_config_id: kit.id, ...r })))
    toast.success('Kit configurato!')
    onSaved()
    setLoading(false)
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Nuovo Kit Standard</h2>
          <button onClick={onClose}><X size={18} className="text-[#999]"/></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Nome kit *</label>
            <input value={form.nome} onChange={e=>setF('nome',e.target.value)} placeholder="Es. Kit Pulcini 2025" className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Categoria</label>
            <select value={form.category_id} onChange={e=>setF('category_id',e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              <option value="">Tutte le categorie</option>
              {categories.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Descrizione</label>
            <textarea value={form.descrizione} onChange={e=>setF('descrizione',e.target.value)} rows={2} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#999] uppercase tracking-wide">Articoli del kit</label>
              <button onClick={addRow} className="text-xs text-[#1ab394] hover:underline">+ Aggiungi</button>
            </div>
            {rows.map((row,i)=>(
              <div key={i} className="flex gap-2 mb-2 items-center">
                <select value={row.warehouse_item_id} onChange={e=>setRow(i,'warehouse_item_id',e.target.value)} className="flex-1 border border-[#e7eaec] rounded px-2 py-1.5 text-[#676a6c] text-xs outline-none focus:border-[#1ab394]">
                  <option value="">Articolo...</option>
                  {items.map(it=><option key={it.id} value={it.id}>{it.nome}{it.taglia?` (${it.taglia})`:''}</option>)}
                </select>
                <input type="number" min="1" value={row.quantita} onChange={e=>setRow(i,'quantita',+e.target.value)} className="w-14 border border-[#e7eaec] rounded px-2 py-1.5 text-[#676a6c] text-xs outline-none focus:border-[#1ab394]"/>
                <input value={row.note||''} onChange={e=>setRow(i,'note',e.target.value)} placeholder="Note" className="flex-1 border border-[#e7eaec] rounded px-2 py-1.5 text-[#676a6c] text-xs outline-none focus:border-[#1ab394]"/>
                {rows.length>1 && <button onClick={()=>removeRow(i)}><X size={14} className="text-red-400"/></button>}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">{loading?'Salvataggio...':'Crea kit'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal materiale struttura ────────────────────────────────
function MaterialModal({ material, categories, onClose, onSaved }) {
  const { profile } = useAuth()
  const isEdit = !!material?.id
  const [form, setForm] = useState({ nome:'', descrizione:'', categoria:'palloni', quantita_disponibile:0, quantita_minima:1, category_id:'', active:true, ...material })
  const [loading, setLoading] = useState(false)
  function set(k,v) { setForm(f=>({...f,[k]:v})) }
  async function save() {
    if (!form.nome) return toast.error('Nome obbligatorio')
    setLoading(true)
    const payload = { ...form, club_id: profile?.club_id }
    const { error } = isEdit
      ? await supabase.from('sc_structure_materials').update(payload).eq('id', form.id)
      : await supabase.from('sc_structure_materials').insert([payload])
    if (error) toast.error(error.message)
    else { toast.success('Salvato'); onSaved() }
    setLoading(false)
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit?'Modifica':'Nuovo'} Materiale</h2>
          <button onClick={onClose}><X size={18} className="text-[#999]"/></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Nome *</label>
            <input value={form.nome} onChange={e=>set('nome',e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Tipo</label>
              <select value={form.categoria} onChange={e=>set('categoria',e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                {CAT_MAT.map(c=><option key={c} value={c}>{CAT_MAT_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Categoria SC</label>
              <select value={form.category_id||''} onChange={e=>set('category_id',e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                <option value="">Comune</option>
                {categories.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Qta disp.</label>
              <input type="number" min="0" value={form.quantita_disponibile} onChange={e=>set('quantita_disponibile',+e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Qta min.</label>
              <input type="number" min="0" value={form.quantita_minima} onChange={e=>set('quantita_minima',+e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Descrizione</label>
            <textarea value={form.descrizione||''} onChange={e=>set('descrizione',e.target.value)} rows={2} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">{loading?'Salvataggio...':'Salva'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal movimento materiale struttura ──────────────────────
function MovementModal({ material, onClose, onSaved }) {
  const { profile } = useAuth()
  const [tipo, setTipo] = useState('carico')
  const [quantita, setQuantita] = useState(1)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  async function save() {
    if (quantita <= 0) return toast.error('Quantità non valida')
    setLoading(true)
    const delta = tipo === 'carico' ? quantita : -quantita
    const nuova = Math.max(0, material.quantita_disponibile + delta)
    await supabase.from('sc_structure_materials').update({ quantita_disponibile: nuova }).eq('id', material.id)
    await supabase.from('sc_structure_movements').insert([{ item_id: material.id, tipo, quantita, note, operatore_id: profile?.id }])
    toast.success(tipo === 'carico' ? `+${quantita} caricati` : `-${quantita} scaricati`)
    onSaved()
    setLoading(false)
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Movimento — {material.nome}</h2>
          <button onClick={onClose}><X size={18} className="text-[#999]"/></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            {['carico','scarico'].map(t=>(
              <button key={t} onClick={()=>setTipo(t)}
                className={clsx('flex-1 py-2 rounded text-sm font-semibold border transition-colors',
                  tipo===t
                    ? t==='carico' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'
                    : 'border-[#e7eaec] text-[#999] hover:bg-gray-50')}>
                {t==='carico' ? '▲ Carico' : '▼ Scarico'}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Quantità</label>
            <input type="number" min="1" value={quantita} onChange={e=>setQuantita(+e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Note</label>
            <input value={note} onChange={e=>setNote(e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div className={clsx('rounded p-3 text-sm font-medium', tipo==='carico' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
            Disponibile dopo: {Math.max(0, material.quantita_disponibile + (tipo==='carico' ? quantita : -quantita))} pz
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">{loading?'Salvataggio...':'Conferma'}</button>
        </div>
      </div>
    </div>
  )
}

// ── PDF consegna ─────────────────────────────────────────────
function generateDeliveryPDF(delivery, player, items, ts) {
  const doc = new jsPDF()
  doc.setFillColor(26,179,148); doc.rect(0,0,210,28,'F')
  doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text(ts?.nome_squadra||'SoccerClub', 14, 13)
  doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.text('Verbale di Consegna Kit', 14, 22)
  doc.setTextColor(0,0,0); doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text(`Consegna del ${format(new Date(),'dd/MM/yyyy')}`, 14, 40)
  doc.setFont('helvetica','normal'); doc.setFontSize(10)
  doc.text(`Atleta: ${player?.cognome} ${player?.nome}`, 14, 50)
  autoTable(doc, {
    startY: 60,
    head: [['Articolo','Taglia','Qta']],
    body: items.map(r=>[r.item?.nome||'—', r.taglia||'—', r.quantita]),
    headStyles: { fillColor: [26,179,148] }, styles: { fontSize: 9 }
  })
  const y = doc.lastAutoTable.finalY + 20
  doc.text('Firma consegnatario: ______________________', 14, y)
  doc.text('Firma ricevente: ______________________', 14, y+15)
  doc.save(`verbale_consegna_${player?.cognome}_${Date.now()}.pdf`)
}

// ── Componente principale ────────────────────────────────────
export default function SCWarehouse() {
  const { profile, isAdmin, isSegreteria } = useAuth()
  const canEdit = isAdmin || isSegreteria

  const [tab, setTab] = useState('abbigliamento')
  const [items, setItems] = useState([])
  const [players, setPlayers] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [kitConfigs, setKitConfigs] = useState([])
  const [materials, setMaterials] = useState([])
  const [movements, setMovements] = useState({})
  const [categories, setCategories] = useState([])
  const [filterCat, setFilterCat] = useState('')
  const [filterMatCat, setFilterMatCat] = useState('')
  const [itemModal, setItemModal] = useState(null)
  const [deliveryModal, setDeliveryModal] = useState(false)
  const [kitModal, setKitModal] = useState(false)
  const [materialModal, setMaterialModal] = useState(null)
  const [movementModal, setMovementModal] = useState(null)
  const [expandedKit, setExpandedKit] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('categories').select('*').order('ordine').then(({ data }) => setCategories(data||[]))
  }, [])
  useEffect(() => { load() }, [tab, filterCat, filterMatCat])

  async function load() {
    setLoading(true)
    if (tab === 'abbigliamento') {
      let q = supabase.from('warehouse_items').select('*').eq('active',true).order('nome')
      if (filterCat) q = q.eq('categoria', filterCat)
      const { data: its } = await q
      setItems(its||[])
      const { data: del } = await supabase.from('deliveries')
        .select('*, youth_players(nome,cognome), delivery_items(*, warehouse_items(nome,taglia))')
        .order('created_at', { ascending:false }).limit(20)
      setDeliveries(del||[])
      const { data: pl } = await supabase.from('youth_players').select('id,nome,cognome').eq('active',true).order('cognome')
      setPlayers(pl||[])
    } else if (tab === 'kit') {
      const { data: kits } = await supabase.from('sc_kit_configs')
        .select('*, categories(nome,colore), sc_kit_config_items(*, warehouse_items(nome,taglia,categoria))')
        .eq('active', true).order('nome')
      setKitConfigs(kits||[])
    } else if (tab === 'materiale') {
      let q = supabase.from('sc_structure_materials').select('*, categories(nome,colore)').eq('active',true).order('nome')
      if (filterMatCat) q = q.eq('categoria', filterMatCat)
      const { data: mats } = await q
      setMaterials(mats||[])
    }
    setLoading(false)
  }

  async function loadMovements(itemId) {
    const { data } = await supabase.from('sc_structure_movements')
      .select('*').eq('item_id', itemId).order('created_at', { ascending: false }).limit(10)
    setMovements(m => ({ ...m, [itemId]: data||[] }))
  }

  async function deleteItem(id) {
    if (!confirm('Eliminare?')) return
    await supabase.from('warehouse_items').update({ active:false }).eq('id',id)
    toast.success('Eliminato'); load()
  }

  async function deleteKit(id) {
    if (!confirm('Eliminare questo kit?')) return
    await supabase.from('sc_kit_configs').update({ active:false }).eq('id',id)
    toast.success('Kit eliminato'); load()
  }

  async function deleteMaterial(id) {
    if (!confirm('Eliminare?')) return
    await supabase.from('sc_structure_materials').update({ active:false }).eq('id',id)
    toast.success('Eliminato'); load()
  }

  const lowStockItems = items.filter(i => i.quantita_disponibile <= i.quantita_minima)
  const lowStockMats  = materials.filter(m => m.quantita_disponibile <= m.quantita_minima)

  return (
    <div className="space-y-4">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Magazzino SC</h1>
          <p className="text-sm text-[#999] mt-1">Abbigliamento, kit e materiale struttura</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {tab === 'abbigliamento' && <>
              <button onClick={() => setDeliveryModal(true)} className="flex items-center gap-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-3 py-2 rounded text-sm"><Truck size={14}/> Consegna</button>
              <button onClick={() => setItemModal({})} className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold"><Plus size={16}/> Articolo</button>
            </>}
            {tab === 'kit' && (
              <button onClick={() => setKitModal(true)} className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold"><Plus size={16}/> Nuovo Kit</button>
            )}
            {tab === 'materiale' && (
              <button onClick={() => setMaterialModal({})} className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold"><Plus size={16}/> Materiale</button>
            )}
          </div>
        )}
      </div>

      {/* Tab */}
      <div className="flex gap-1 border-b border-[#e7eaec]">
        {[['abbigliamento','👕 Abbigliamento'],['kit','🎒 Kit Standard'],['materiale','⚽ Materiale Struttura']].map(([v,l])=>(
          <button key={v} onClick={() => setTab(v)}
            className={clsx('px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab===v ? 'border-[#1ab394] text-[#1ab394]' : 'border-transparent text-[#999] hover:text-[#676a6c]')}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <>
          {/* ── TAB ABBIGLIAMENTO ── */}
          {tab === 'abbigliamento' && (
            <div className="space-y-4">
              {lowStockItems.length > 0 && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-700 text-sm">
                  <AlertTriangle size={16}/> <strong>{lowStockItems.length}</strong> articolo/i sotto scorta minima
                </div>
              )}
              <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
                className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                <option value="">Tutte le categorie</option>
                {CAT_ABB.map(c=><option key={c} value={c}>{CAT_ABB_LABELS[c]}</option>)}
              </select>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map(item=>(
                  <div key={item.id} className={clsx('bg-white border rounded shadow-sm p-4 space-y-2', item.quantita_disponibile<=item.quantita_minima ? 'border-yellow-300' : 'border-[#e7eaec]')}>
                    <div className="flex items-start justify-between">
                      <ShoppingBag size={18} className="text-[#999]"/>
                      {canEdit && (
                        <div className="flex gap-1">
                          <button onClick={()=>setItemModal(item)} className="text-[#999] hover:text-[#1c84c6]"><Edit2 size={13}/></button>
                          <button onClick={()=>deleteItem(item.id)} className="text-[#999] hover:text-red-500"><Trash2 size={13}/></button>
                        </div>
                      )}
                    </div>
                    {item.codice && <div className="text-xs text-[#999] font-mono">{item.codice}</div>}
                    <div className="text-[#2f4050] font-semibold text-sm">{item.nome}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.taglia && <span className="text-xs bg-gray-100 text-[#676a6c] px-1.5 py-0.5 rounded">{item.taglia}</span>}
                      <span className="text-xs text-[#999]">{CAT_ABB_LABELS[item.categoria]}</span>
                    </div>
                    <div className={clsx('text-2xl font-bold',
                      item.quantita_disponibile<=0 ? 'text-red-500'
                      : item.quantita_disponibile<=item.quantita_minima ? 'text-yellow-500'
                      : 'text-[#1ab394]')}>{item.quantita_disponibile}</div>
                    {item.prezzo>0 && <div className="text-xs text-[#999]">€{item.prezzo}</div>}
                  </div>
                ))}
                {items.length===0 && <div className="col-span-4 text-center text-[#999] py-10 text-sm">Nessun articolo</div>}
              </div>

              {/* Ultime consegne */}
              {deliveries.length > 0 && (
                <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#e7eaec]">
                    <h3 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide">Ultime consegne</h3>
                  </div>
                  <div className="divide-y divide-[#e7eaec]">
                    {deliveries.map(d=>(
                      <div key={d.id} className="flex items-start justify-between px-4 py-3">
                        <div>
                          <div className="text-[#2f4050] font-medium text-sm">{d.youth_players?.cognome} {d.youth_players?.nome}</div>
                          <div className="text-xs text-[#999] mt-0.5">{format(new Date(d.data_consegna),'dd MMM yyyy',{locale:it})}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(d.delivery_items||[]).map(di=>(
                              <span key={di.id} className="text-xs bg-gray-100 text-[#676a6c] px-2 py-0.5 rounded">
                                {di.warehouse_items?.nome}{di.taglia?` (${di.taglia})`:''} ×{di.quantita}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button onClick={()=>{
                          const player = players.find(p=>p.id===d.youth_player_id)||d.youth_players
                          generateDeliveryPDF(d, player, (d.delivery_items||[]).map(di=>({...di, item:di.warehouse_items})), null)
                        }} className="text-[#999] hover:text-[#1ab394] flex items-center gap-1 text-xs flex-shrink-0">
                          <Download size={13}/> PDF
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB KIT STANDARD ── */}
          {tab === 'kit' && (
            <div className="space-y-3">
              {kitConfigs.length === 0 ? (
                <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-10 text-center">
                  <ShoppingBag size={32} className="mx-auto text-[#999] mb-3"/>
                  <p className="text-[#999] text-sm">Nessun kit configurato.</p>
                  {canEdit && <p className="text-xs text-[#999] mt-1">Clicca "Nuovo Kit" per crearne uno.</p>}
                </div>
              ) : kitConfigs.map(kit => (
                <div key={kit.id} className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
                  <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
                    onClick={() => setExpandedKit(expandedKit===kit.id ? null : kit.id)}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#1ab394]/10 text-[#1ab394] flex items-center justify-center flex-shrink-0">
                        <ShoppingBag size={18}/>
                      </div>
                      <div>
                        <div className="text-[#2f4050] font-bold text-sm">{kit.nome}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {kit.categories ? (
                            <span className="text-xs text-white px-2 py-0.5 rounded font-medium" style={{ background: kit.categories.colore }}>{kit.categories.nome}</span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-[#999] px-2 py-0.5 rounded">Tutte le categorie</span>
                          )}
                          <span className="text-xs text-[#999]">{kit.sc_kit_config_items?.length || 0} articoli</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <button onClick={e=>{ e.stopPropagation(); deleteKit(kit.id) }} className="text-[#999] hover:text-red-500 p-1">
                          <Trash2 size={14}/>
                        </button>
                      )}
                      {expandedKit===kit.id ? <ChevronUp size={16} className="text-[#999]"/> : <ChevronDown size={16} className="text-[#999]"/>}
                    </div>
                  </button>
                  {expandedKit===kit.id && (
                    <div className="border-t border-[#e7eaec] px-4 py-3">
                      {kit.descrizione && <p className="text-sm text-[#999] mb-3 italic">{kit.descrizione}</p>}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#e7eaec]">
                            <th className="text-left text-xs text-[#999] py-2 font-semibold uppercase tracking-wide">Articolo</th>
                            <th className="text-left text-xs text-[#999] py-2 font-semibold uppercase tracking-wide">Categoria</th>
                            <th className="text-left text-xs text-[#999] py-2 font-semibold uppercase tracking-wide">Qta</th>
                            <th className="text-left text-xs text-[#999] py-2 font-semibold uppercase tracking-wide">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(kit.sc_kit_config_items||[]).map(item=>(
                            <tr key={item.id} className="border-b border-[#e7eaec] last:border-0">
                              <td className="py-2 text-[#2f4050] font-medium">
                                {item.warehouse_items?.nome}
                                {item.warehouse_items?.taglia && <span className="ml-1 text-xs text-[#999]">({item.warehouse_items.taglia})</span>}
                              </td>
                              <td className="py-2 text-xs text-[#999]">{CAT_ABB_LABELS[item.warehouse_items?.categoria] || '—'}</td>
                              <td className="py-2 text-[#676a6c]">×{item.quantita}</td>
                              <td className="py-2 text-xs text-[#999]">{item.note||'—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── TAB MATERIALE STRUTTURA ── */}
          {tab === 'materiale' && (
            <div className="space-y-4">
              {lowStockMats.length > 0 && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-700 text-sm">
                  <AlertTriangle size={16}/> <strong>{lowStockMats.length}</strong> materiale/i sotto scorta minima
                </div>
              )}
              <select value={filterMatCat} onChange={e=>setFilterMatCat(e.target.value)}
                className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                <option value="">Tutti i tipi</option>
                {CAT_MAT.map(c=><option key={c} value={c}>{CAT_MAT_LABELS[c]}</option>)}
              </select>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {materials.map(mat=>(
                  <div key={mat.id} className={clsx('bg-white border rounded shadow-sm p-4 space-y-2', mat.quantita_disponibile<=mat.quantita_minima ? 'border-yellow-300' : 'border-[#e7eaec]')}>
                    <div className="flex items-start justify-between">
                      <Package size={18} className="text-[#999]"/>
                      {canEdit && (
                        <div className="flex gap-1">
                          <button onClick={()=>setMaterialModal(mat)} className="text-[#999] hover:text-[#1c84c6]"><Edit2 size={13}/></button>
                          <button onClick={()=>deleteMaterial(mat.id)} className="text-[#999] hover:text-red-500"><Trash2 size={13}/></button>
                        </div>
                      )}
                    </div>
                    <div className="text-[#2f4050] font-semibold text-sm">{mat.nome}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-[#999]">{CAT_MAT_LABELS[mat.categoria]}</span>
                      {mat.categories && (
                        <span className="text-xs text-white px-1.5 py-0.5 rounded font-medium" style={{ background: mat.categories.colore }}>{mat.categories.nome}</span>
                      )}
                    </div>
                    <div className={clsx('text-2xl font-bold',
                      mat.quantita_disponibile<=0 ? 'text-red-500'
                      : mat.quantita_disponibile<=mat.quantita_minima ? 'text-yellow-500'
                      : 'text-[#1ab394]')}>{mat.quantita_disponibile}</div>
                    {canEdit && (
                      <div className="flex gap-1 pt-1">
                        <button onClick={()=>setMovementModal(mat)}
                          className="flex-1 flex items-center justify-center gap-1 border border-[#e7eaec] hover:bg-gray-50 rounded py-1 text-xs text-[#676a6c]">
                          <ArrowUp size={11} className="text-green-500"/> <ArrowDown size={11} className="text-red-500"/> Movimento
                        </button>
                      </div>
                    )}
                    {/* Ultimi movimenti */}
                    {movements[mat.id] && (
                      <div className="pt-1 space-y-0.5">
                        {movements[mat.id].slice(0,3).map(mv=>(
                          <div key={mv.id} className="flex items-center justify-between text-xs">
                            <span className={mv.tipo==='carico' ? 'text-green-600' : 'text-red-500'}>
                              {mv.tipo==='carico' ? '+' : '-'}{mv.quantita}
                            </span>
                            <span className="text-[#999]">{format(new Date(mv.created_at),'dd/MM')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {canEdit && !movements[mat.id] && (
                      <button onClick={()=>loadMovements(mat.id)} className="text-xs text-[#999] hover:text-[#1ab394] hover:underline">
                        Vedi movimenti
                      </button>
                    )}
                  </div>
                ))}
                {materials.length===0 && <div className="col-span-4 text-center text-[#999] py-10 text-sm">Nessun materiale</div>}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modali */}
      {itemModal !== null && <ItemModal item={itemModal} onClose={()=>setItemModal(null)} onSaved={()=>{setItemModal(null);load()}}/>}
      {deliveryModal && <DeliveryModal players={players} items={items} profile={profile} onClose={()=>setDeliveryModal(false)} onSaved={()=>{setDeliveryModal(false);load()}}/>}
      {kitModal && <KitConfigModal categories={categories} items={items} onClose={()=>setKitModal(false)} onSaved={()=>{setKitModal(false);load()}}/>}
      {materialModal !== null && <MaterialModal material={materialModal} categories={categories} onClose={()=>setMaterialModal(null)} onSaved={()=>{setMaterialModal(null);load()}}/>}
      {movementModal && <MovementModal material={movementModal} onClose={()=>setMovementModal(null)} onSaved={()=>{setMovementModal(null);load()}}/>}
    </div>
  )
}

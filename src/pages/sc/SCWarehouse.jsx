import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, Edit2, Trash2, X, ShoppingBag, Package,
  AlertTriangle, Download, ChevronDown, ChevronUp,
  ArrowDown, ClipboardList, Check, Send
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
const STATO_KIT = {
  in_attesa:  { label:'In attesa',  color:'bg-yellow-100 text-yellow-600' },
  ordinato:   { label:'Ordinato',   color:'bg-blue-100 text-blue-600' },
  consegnato: { label:'Consegnato', color:'bg-green-100 text-green-600' },
}
const STATUS_LABELS = { pending:'In attesa', approved:'Approvata', delivered:'Consegnata', rejected:'Rifiutata' }
const STATUS_COLORS = {
  pending:  'bg-yellow-100 text-yellow-600',
  approved: 'bg-green-100 text-green-600',
  delivered:'bg-blue-100 text-blue-600',
  rejected: 'bg-red-100 text-red-600'
}

// ── PDF ordine fornitore ─────────────────────────────────────
function generateOrderPDF(kit, assignments, ts) {
  const doc = new jsPDF()
  doc.setFillColor(26,179,148); doc.rect(0,0,210,28,'F')
  doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text(ts?.nome_squadra||'SoccerClub', 14, 13)
  doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.text(`Ordine fornitore — ${kit.nome}`, 14, 22)
  doc.setTextColor(0,0,0); doc.setFontSize(10)
  doc.text(`Generato il ${format(new Date(),'dd/MM/yyyy')}`, 14, 38)
  doc.text(`Totale atleti: ${assignments.length}`, 14, 46)
  const byItem = {}
  assignments.forEach(a => {
    ;(a.sc_kit_assignment_items||[]).forEach(item => {
      const nome = item.warehouse_items?.nome || '—'
      const taglia = item.taglia || '—'
      const key = `${nome}||${taglia}`
      if (!byItem[key]) byItem[key] = { nome, taglia, qta: 0 }
      byItem[key].qta += (item.quantita || 1)
    })
  })
  autoTable(doc, {
    startY: 54,
    head: [['Articolo','Taglia','Quantità totale']],
    body: Object.values(byItem).map(r => [r.nome, r.taglia, r.qta]),
    headStyles: { fillColor: [26,179,148] }, styles: { fontSize: 9 }
  })
  doc.save(`ordine_${kit.nome.replace(/\s+/g,'_')}_${format(new Date(),'ddMMyyyy')}.pdf`)
}

// ── PDF ordine fornitore richiesta materiale ─────────────────
function generateRichiestaOrdinePDF(request, ts) {
  const doc = new jsPDF()
  doc.setFillColor(26,179,148); doc.rect(0,0,210,28,'F')
  doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text(ts?.nome_squadra||'SoccerClub', 14, 13)
  doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.text('Ordine Fornitore — Richiesta Materiale', 14, 22)
  doc.setTextColor(0,0,0); doc.setFontSize(10)
  doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 38)
  doc.text(`Richiedente: ${request.profiles?.cognome} ${request.profiles?.nome}`, 14, 46)
  const nomeArticolo = request.tipo === 'struttura'
    ? request.sc_structure_materials?.nome
    : request.warehouse_items?.nome || request.materials?.nome
  autoTable(doc, {
    startY: 56,
    head: [['Tipo','Articolo','Quantità','Note']],
    body: [[
      request.tipo === 'struttura' ? '⚽ Struttura' : '👕 Abbigliamento',
      nomeArticolo || '—',
      request.quantita,
      request.note || '—'
    ]],
    headStyles: { fillColor: [26,179,148] }, styles: { fontSize: 10 }
  })
  doc.setFontSize(9); doc.setTextColor(150)
  doc.text('Firma responsabile: ______________________', 14, doc.lastAutoTable.finalY + 20)
  doc.save(`ordine_richiesta_${format(new Date(),'ddMMyyyy')}.pdf`)
}

// ── PDF verbale consegna ─────────────────────────────────────
function generateDeliveryPDF(player, items, ts) {
  const doc = new jsPDF()
  doc.setFillColor(26,179,148); doc.rect(0,0,210,28,'F')
  doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text(ts?.nome_squadra||'SoccerClub', 14, 13)
  doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.text('Verbale di Consegna Kit', 14, 22)
  doc.setTextColor(0,0,0); doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text(`Consegna del ${format(new Date(),'dd/MM/yyyy')}`, 14, 40)
  doc.setFont('helvetica','normal'); doc.setFontSize(10)
  doc.text(`Atleta: ${player?.cognome||''} ${player?.nome||''}`, 14, 50)
  autoTable(doc, {
    startY: 60,
    head: [['Articolo','Taglia','Qta']],
    body: (items||[]).map(r => [r.warehouse_items?.nome||'—', r.taglia||'—', r.quantita]),
    headStyles: { fillColor: [26,179,148] }, styles: { fontSize: 9 }
  })
  const y = doc.lastAutoTable.finalY + 20
  doc.text('Firma consegnatario: ______________________', 14, y)
  doc.text('Firma ricevente: ______________________', 14, y+15)
  doc.save(`verbale_${player?.cognome||'atleta'}_${Date.now()}.pdf`)
}

// ── Modal articolo abbigliamento ─────────────────────────────
function ItemModal({ item, onClose, onSaved }) {
  const isEdit = !!item?.id
  const [form, setForm] = useState({ codice:'', nome:'', descrizione:'', categoria:'kit_gara', quantita_disponibile:0, quantita_minima:2, prezzo:0, active:true, richiedibile_mister:true, ...item })
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
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Categoria</label>
              <select value={form.categoria} onChange={e=>set('categoria',e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                {CAT_ABB.map(c=><option key={c} value={c}>{CAT_ABB_LABELS[c]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Nome *</label>
            <input value={form.nome} onChange={e=>set('nome',e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
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
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input type="checkbox" checked={form.richiedibile_mister}
              onChange={e=>set('richiedibile_mister', e.target.checked)}
              className="accent-[#1ab394]"/>
            <span className="text-sm text-[#676a6c]">Richiedibile dal mister</span>
          </label>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">{loading?'Salvataggio...':'Salva'}</button>
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
                  {items.map(it=><option key={it.id} value={it.id}>{it.nome}</option>)}
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

// ── Modal assegnazione kit ───────────────────────────────────
function AssignKitModal({ kit, players, onClose, onSaved }) {
  const [selected, setSelected] = useState([])
  const [taglie, setTaglie] = useState({})
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  useEffect(() => {
    if (selected.length === 0) return
    const initial = {}
    selected.forEach(pid => {
      const p = players.find(x => x.id === pid)
      initial[pid] = {}
      ;(kit.sc_kit_config_items||[]).forEach(item => {
        initial[pid][item.id] = p?.taglia || 'M'
      })
    })
    setTaglie(initial)
  }, [selected])

  function togglePlayer(id) { setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]) }
  function setTaglia(pid, itemId, val) { setTaglie(t => ({ ...t, [pid]: { ...(t[pid]||{}), [itemId]: val } })) }

  async function save() {
    if (!selected.length) return toast.error('Seleziona almeno un atleta')
    setLoading(true)
    for (const pid of selected) {
      const { data: existing } = await supabase.from('sc_kit_assignments').select('id,stato').eq('kit_config_id', kit.id).eq('youth_player_id', pid).neq('stato','consegnato').maybeSingle()
      if (existing) {
        await supabase.from('sc_kit_assignment_items').delete().eq('assignment_id', existing.id)
        const items = (kit.sc_kit_config_items||[]).map(item => ({ assignment_id: existing.id, kit_config_item_id: item.id, warehouse_item_id: item.warehouse_item_id, taglia: taglie[pid]?.[item.id] || 'M', quantita: item.quantita }))
        await supabase.from('sc_kit_assignment_items').insert(items)
        await supabase.from('sc_kit_assignments').update({ stato: 'in_attesa' }).eq('id', existing.id)
      } else {
        const { data: ass, error } = await supabase.from('sc_kit_assignments').insert([{ kit_config_id: kit.id, youth_player_id: pid, stato: 'in_attesa' }]).select().single()
        if (error) { toast.error(error.message); setLoading(false); return }
        const items = (kit.sc_kit_config_items||[]).map(item => ({ assignment_id: ass.id, kit_config_item_id: item.id, warehouse_item_id: item.warehouse_item_id, taglia: taglie[pid]?.[item.id] || 'M', quantita: item.quantita }))
        await supabase.from('sc_kit_assignment_items').insert(items)
      }
    }
    toast.success(`Kit assegnato a ${selected.length} atleti`)
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Assegna — {kit.nome}</h2>
          <button onClick={onClose}><X size={18} className="text-[#999]"/></button>
        </div>
        {step === 1 && (
          <>
            <div className="p-4">
              <div className="space-y-1 max-h-72 overflow-y-auto border border-[#e7eaec] rounded p-2">
                {players.map(p => (
                  <label key={p.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={()=>togglePlayer(p.id)} className="accent-[#1ab394]"/>
                    <div className="w-7 h-7 rounded-full bg-[#1ab394]/20 text-[#1ab394] flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {(p.nome?.[0]||'')+(p.cognome?.[0]||'')}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-[#2f4050] font-medium">{p.cognome} {p.nome}</div>
                      <div className="text-xs text-[#999]">Taglia: <strong>{p.taglia||'—'}</strong></div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
              <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
              <button onClick={() => setStep(2)} disabled={!selected.length} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">Avanti ({selected.length})</button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="p-4 space-y-4">
              {selected.map(pid => {
                const p = players.find(x=>x.id===pid)
                return (
                  <div key={pid} className="border border-[#e7eaec] rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-[#1ab394]/20 text-[#1ab394] flex items-center justify-center text-xs font-bold">{(p?.nome?.[0]||'')+(p?.cognome?.[0]||'')}</div>
                      <span className="text-sm font-semibold text-[#2f4050]">{p?.cognome} {p?.nome}</span>
                    </div>
                    {(kit.sc_kit_config_items||[]).map(item => (
                      <div key={item.id} className="flex items-center justify-between gap-3 mt-2">
                        <span className="text-xs text-[#676a6c] flex-1">{item.warehouse_items?.nome} ×{item.quantita}</span>
                        <select value={taglie[pid]?.[item.id] || 'M'} onChange={e=>setTaglia(pid, item.id, e.target.value)}
                          className="border border-[#e7eaec] rounded px-2 py-1 text-[#676a6c] text-xs outline-none focus:border-[#1ab394] w-24">
                          {TAGLIE.map(t=><option key={t}>{t}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
              <button onClick={()=>setStep(1)} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">← Indietro</button>
              <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">{loading?'Salvataggio...':'Conferma'}</button>
            </div>
          </>
        )}
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

// ── Modal richiesta materiale (mister SC) ────────────────────
function RichiestaModal({ items, structureMaterials, initialItemId, onClose, onSaved }) {
  const { profile } = useAuth()
  // Il mister vede in elenco solo gli articoli abilitati dalla società
  const visibleItems = items.filter(i => i.richiedibile_mister)
  const [tipo, setTipo] = useState('abbigliamento')
  const [form, setForm] = useState({ warehouse_item_id: initialItemId || '', structure_material_id:'', quantita:1, note:'' })
  const [loading, setLoading] = useState(false)

  async function save() {
    if (tipo === 'abbigliamento' && !form.warehouse_item_id) return toast.error('Seleziona un articolo')
    if (tipo === 'struttura' && !form.structure_material_id) return toast.error('Seleziona un articolo')
    setLoading(true)
    const { error } = await supabase.from('material_requests').insert([{
      player_id:             profile?.id,
      club_id:               profile?.club_id,
      richiedente_role:      profile?.role,
      tipo,
      warehouse_item_id:     tipo === 'abbigliamento' ? form.warehouse_item_id : null,
      structure_material_id: tipo === 'struttura' ? form.structure_material_id : null,
      quantita:              form.quantita,
      note:                  form.note,
      status:                'pending',
    }])
    if (error) toast.error(error.message)
    else { toast.success('Richiesta inviata'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Richiedi Materiale</h2>
          <button onClick={onClose}><X size={18} className="text-[#999]"/></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            {[['abbigliamento','👕 Abbigliamento'],['struttura','⚽ Struttura']].map(([v,l]) => (
              <button key={v} onClick={() => setTipo(v)}
                className={clsx('flex-1 py-2 rounded text-sm font-semibold border transition-colors',
                  tipo === v ? 'bg-[#1ab394] border-[#1ab394] text-white' : 'border-[#e7eaec] text-[#999] hover:bg-gray-50')}>
                {l}
              </button>
            ))}
          </div>
          {tipo === 'abbigliamento' ? (
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Articolo</label>
              <select value={form.warehouse_item_id} onChange={e=>setForm(f=>({...f,warehouse_item_id:e.target.value}))}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                <option value="">Seleziona...</option>
                {visibleItems.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
              {visibleItems.length === 0 && (
                <p className="text-xs text-[#999] mt-1">Nessun articolo al momento richiedibile.</p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Articolo struttura</label>
              <select value={form.structure_material_id} onChange={e=>setForm(f=>({...f,structure_material_id:e.target.value}))}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                <option value="">Seleziona...</option>
                {structureMaterials.map(m=><option key={m.id} value={m.id}>{m.nome} (disp. {m.quantita_disponibile})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Quantità</label>
            <input type="number" min="1" value={form.quantita} onChange={e=>setForm(f=>({...f,quantita:+e.target.value}))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Note</label>
            <textarea value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={2}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">{loading?'Invio...':'Invia'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal scarico manuale (mister SC) ────────────────────────
function ScaricoModal({ structureMaterials, onClose, onSaved }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ item_id:'', quantita:1, motivo:'' })
  const [loading, setLoading] = useState(false)

  async function save() {
    if (!form.item_id) return toast.error('Seleziona un articolo')
    if (!form.motivo) return toast.error('Inserisci il motivo')
    setLoading(true)
    const { error } = await supabase.from('material_scarichi').insert([{
      club_id:      profile?.club_id,
      item_id:      form.item_id,
      quantita:     form.quantita,
      motivo:       form.motivo,
      operatore_id: profile?.id,
    }])
    if (error) { toast.error(error.message); setLoading(false); return }
    const mat = structureMaterials.find(m => m.id === form.item_id)
    if (mat) {
      const nuova = Math.max(0, mat.quantita_disponibile - form.quantita)
      await supabase.from('sc_structure_materials').update({ quantita_disponibile: nuova }).eq('id', form.item_id)
    }
    toast.success('Scarico registrato')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Scarico Materiale</h2>
          <button onClick={onClose}><X size={18} className="text-[#999]"/></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-700">
            ⚠️ Lo scarico verrà registrato e comunicato alla società.
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Articolo</label>
            <select value={form.item_id} onChange={e=>setForm(f=>({...f,item_id:e.target.value}))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              <option value="">Seleziona...</option>
              {structureMaterials.map(m=><option key={m.id} value={m.id}>{m.nome} (disp. {m.quantita_disponibile})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Quantità</label>
            <input type="number" min="1" value={form.quantita} onChange={e=>setForm(f=>({...f,quantita:+e.target.value}))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Motivo *</label>
            <textarea value={form.motivo} onChange={e=>setForm(f=>({...f,motivo:e.target.value}))} rows={2}
              placeholder="Es. Pallone danneggiato, cono rotto..."
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">{loading?'Registrazione...':'Registra scarico'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principale ────────────────────────────────────
export default function SCWarehouse() {
  const { profile, isAdmin, isSegreteria, isMister } = useAuth()
  const canEdit    = isAdmin || isSegreteria
  const canRequest = isMister // mister può fare richieste e scarichi

  const [tab, setTab]                         = useState('abbigliamento')
  const [kitSubTab, setKitSubTab]             = useState(canEdit ? 'configs' : 'inventory')
  const [items, setItems]                     = useState([])
  const [players, setPlayers]                 = useState([])
  const [kitConfigs, setKitConfigs]           = useState([])
  const [assignments, setAssignments]         = useState([])
  const [structureMaterials, setStructureMaterials] = useState([])
  const [requests, setRequests]               = useState([])
  const [scarichi, setScarichi]               = useState([])
  const [categories, setCategories]           = useState([])
  const [teamSettings, setTeamSettings]       = useState(null)
  const [filterKitConfig, setFilterKitConfig] = useState('')
  const [itemModal, setItemModal]             = useState(null)
  const [kitModal, setKitModal]               = useState(false)
  const [assignModal, setAssignModal]         = useState(null)
  const [materialModal, setMaterialModal]     = useState(null)
  const [richiestaModal, setRichiestaModal]   = useState(false)
  const [richiestaPreset, setRichiestaPreset] = useState(null) // warehouse_item_id preselezionato
  const [scaricoModal, setScaricoModal]       = useState(false)
  const [expandedKit, setExpandedKit]         = useState(null)
  const [loading, setLoading]                 = useState(true)

  useEffect(() => {
    supabase.from('categories').select('*').order('ordine').then(({ data }) => setCategories(data||[]))
    supabase.from('youth_players').select('id,nome,cognome,taglia,category_id').eq('active',true).order('cognome').then(({ data }) => setPlayers(data||[]))
    supabase.from('team_settings').select('*').single().then(({ data }) => setTeamSettings(data))
    // Carica sempre struttura e abbigliamento (servono a più tab)
    supabase.from('sc_structure_materials').select('*').eq('active',true).order('nome').then(({ data }) => setStructureMaterials(data||[]))
    supabase.from('warehouse_items').select('*').eq('active',true).order('nome').then(({ data }) => setItems(data||[]))
  }, [])

  useEffect(() => { load() }, [tab, kitSubTab, filterKitConfig])

  async function load() {
    setLoading(true)
    if (tab === 'abbigliamento') {
      const { data: kits } = await supabase.from('sc_kit_configs')
        .select('*, categories(nome,colore), sc_kit_config_items(*, warehouse_items(nome,categoria))')
        .eq('active', true).order('nome')
      setKitConfigs(kits||[])
      if (kitSubTab === 'assignments') {
        let q = supabase.from('sc_kit_assignments')
          .select('*, youth_players(nome,cognome,taglia), sc_kit_configs(nome), sc_kit_assignment_items(*, warehouse_items(nome))')
          .order('created_at', { ascending: false })
        if (filterKitConfig) q = q.eq('kit_config_id', filterKitConfig)
        const { data: ass } = await q
        setAssignments(ass||[])
      }
    } else if (tab === 'materiale') {
      const { data: mats } = await supabase.from('sc_structure_materials').select('*, categories(nome,colore)').eq('active',true).order('nome')
      setStructureMaterials(mats||[])
    } else if (tab === 'richieste') {
      let q = supabase.from('material_requests')
        .select('*, warehouse_items(nome), sc_structure_materials(nome), profiles!material_requests_player_id_fkey(nome,cognome,role)')
        .order('created_at', { ascending: false })
      if (!canEdit) q = q.eq('player_id', profile.id)
      const { data } = await q
      setRequests(data||[])
    } else if (tab === 'scarichi') {
      const { data } = await supabase.from('material_scarichi')
        .select('*, sc_structure_materials(nome), profiles!material_scarichi_operatore_id_fkey(nome,cognome)')
        .order('created_at', { ascending: false })
      setScarichi(data||[])
    }
    setLoading(false)
  }

  async function updateRequestStatus(id, status, request) {
    // Se consegnata e tipo struttura → aumenta giacenza
    if (status === 'delivered' && request.tipo === 'struttura' && request.structure_material_id) {
      const mat = structureMaterials.find(m => m.id === request.structure_material_id)
      const qta = mat ? mat.quantita_disponibile : 0
      await supabase.from('sc_structure_materials')
        .update({ quantita_disponibile: qta + (request.quantita || 1) })
        .eq('id', request.structure_material_id)
      // Aggiorna locale
      setStructureMaterials(prev => prev.map(m =>
        m.id === request.structure_material_id
          ? { ...m, quantita_disponibile: qta + (request.quantita || 1) }
          : m
      ))
    }
await supabase.from('material_requests').update({ status }).eq('id', id)
    if (status === 'approved' || status === 'rejected') {
      await supabase.from('notifications').insert([{
        user_id: request.player_id,
        club_id: profile?.club_id,
        type:    status === 'approved' ? 'request_approved' : 'request_rejected',
        message: `Richiesta "${request.warehouse_items?.nome || request.sc_structure_materials?.nome}" ${status === 'approved' ? 'approvata' : 'rifiutata'}`,
        read:    false
      }])
    }
    toast.success('Stato aggiornato')
    load()
  }

  async function updateAssignmentStato(id, stato, assignment) {
    await supabase.from('sc_kit_assignments').update({ stato }).eq('id', id)
    if (stato === 'consegnato') generateDeliveryPDF(assignment.youth_players, assignment.sc_kit_assignment_items, teamSettings)
    toast.success(stato === 'ordinato' ? 'Segnato come ordinato' : 'Consegnato!')
    load()
  }

  async function generateOrderForKit(kit) {
    const { data: ass } = await supabase.from('sc_kit_assignments')
      .select('*, youth_players(nome,cognome), sc_kit_assignment_items(*, warehouse_items(nome))')
      .eq('kit_config_id', kit.id).neq('stato', 'consegnato')
    if (!ass?.length) { toast.error('Nessuna assegnazione da ordinare'); return }
    generateOrderPDF(kit, ass, teamSettings)
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

  function openRichiesta(itemId = null) {
    setRichiestaPreset(itemId)
    setRichiestaModal(true)
  }

  // Mister vede solo gli articoli abilitati dalla società, in stile catalogo (no giacenza)
  const misterVisibleItems = items.filter(i => i.richiedibile_mister)
  const displayedItems = canEdit ? items : misterVisibleItems

  const lowStockItems = items.filter(i => i.quantita_disponibile <= i.quantita_minima)
  const lowStockMats  = structureMaterials.filter(m => m.quantita_disponibile <= (m.quantita_minima||0))
  const pendingRequests = requests.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-4">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Magazzino SC</h1>
          <p className="text-sm text-[#999] mt-1">Abbigliamento, kit, materiale e richieste</p>
        </div>
        <div className="flex gap-2">
          {/* Mister: scarico e richiesta */}
          {canRequest && (
            <>
              <button onClick={() => setScaricoModal(true)}
                className="flex items-center gap-1 border border-red-200 hover:bg-red-50 text-red-500 px-3 py-2 rounded text-sm">
                <ArrowDown size={14}/> Scarico
              </button>
              <button onClick={() => openRichiesta()}
                className="flex items-center gap-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-3 py-2 rounded text-sm">
                <Plus size={14}/> Richiedi
              </button>
            </>
          )}
          {/* Admin: aggiunge articoli */}
          {canEdit && tab === 'abbigliamento' && kitSubTab === 'configs' && (
            <button onClick={() => setKitModal(true)} className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold"><Plus size={16}/> Nuovo Kit</button>
          )}
          {canEdit && tab === 'abbigliamento' && kitSubTab === 'inventory' && (
            <button onClick={() => setItemModal({})} className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold"><Plus size={16}/> Articolo</button>
          )}
          {canEdit && tab === 'materiale' && (
            <button onClick={() => setMaterialModal({})} className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold"><Plus size={16}/> Materiale</button>
          )}
        </div>
      </div>

      {/* Tab principali */}
      <div className="flex gap-1 border-b border-[#e7eaec] flex-wrap">
        {[
          ['abbigliamento', '👕 Abbigliamento & Kit'],
          ['materiale',     '⚽ Materiale Struttura'],
          ['richieste',     '📋 Richieste'],
          ...(canEdit ? [['scarichi', '▼ Scarichi']] : []),
        ].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={clsx('px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1',
              tab===v ? 'border-[#1ab394] text-[#1ab394]' : 'border-transparent text-[#999] hover:text-[#676a6c]')}>
            {l}
            {v === 'richieste' && pendingRequests > 0 && (
              <span className="w-5 h-5 bg-yellow-400 text-yellow-900 text-xs rounded-full flex items-center justify-center font-bold">
                {pendingRequests}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <>
          {/* ── TAB ABBIGLIAMENTO & KIT ── */}
          {tab === 'abbigliamento' && (
            <div className="space-y-4">
              <div className="flex gap-1 bg-gray-100 rounded p-1 w-fit">
                {[['configs','Kit Standard'],['assignments','Assegnazioni'],['inventory', canEdit ? 'Inventario' : 'Catalogo']].map(([v,l])=>(
                  <button key={v} onClick={()=>setKitSubTab(v)}
                    className={clsx('px-4 py-1.5 rounded text-xs font-semibold transition-colors',
                      kitSubTab===v ? 'bg-white text-[#2f4050] shadow-sm' : 'text-[#999] hover:text-[#676a6c]')}>
                    {l}
                  </button>
                ))}
              </div>

              {kitSubTab === 'inventory' && (
                <div>
                  {canEdit && lowStockItems.length > 0 && (
                    <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-700 text-sm mb-3">
                      <AlertTriangle size={16}/> <strong>{lowStockItems.length}</strong> articolo/i sotto scorta minima
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {displayedItems.map(item=>(
                      <div key={item.id} className={clsx('bg-white border rounded shadow-sm p-4 space-y-2',
                        canEdit && item.quantita_disponibile<=item.quantita_minima ? 'border-yellow-300' : 'border-[#e7eaec]')}>
                        <div className="flex items-start justify-between">
                          <ShoppingBag size={18} className="text-[#999]"/>
                          {canEdit && (
                            <div className="flex gap-1">
                              <button onClick={()=>setItemModal(item)} className="text-[#999] hover:text-[#1c84c6]"><Edit2 size={13}/></button>
                            </div>
                          )}
                        </div>
                        {item.codice && canEdit && <div className="text-xs text-[#999] font-mono">{item.codice}</div>}
                        <div className="text-[#2f4050] font-semibold text-sm">{item.nome}</div>
                        <div className="text-xs text-[#999]">{CAT_ABB_LABELS[item.categoria]}</div>
                        {canEdit && (
                          <span className={clsx('inline-block text-xs px-1.5 py-0.5 rounded font-medium',
                            item.richiedibile_mister ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500')}>
                            {item.richiedibile_mister ? 'Mister ✓' : 'Mister ✕'}
                          </span>
                        )}
                        {canEdit ? (
                          <div className={clsx('text-2xl font-bold',
                            item.quantita_disponibile<=0 ? 'text-red-500'
                            : item.quantita_disponibile<=item.quantita_minima ? 'text-yellow-500'
                            : 'text-[#1ab394]')}>{item.quantita_disponibile}</div>
                        ) : (
                          <button onClick={() => openRichiesta(item.id)}
                            className="w-full flex items-center justify-center gap-1.5 bg-[#1ab394]/10 hover:bg-[#1ab394]/20 text-[#1ab394] py-1.5 rounded text-xs font-semibold transition-colors">
                            <Send size={12}/> Richiedi
                          </button>
                        )}
                      </div>
                    ))}
                    {displayedItems.length===0 && (
                      <div className="col-span-4 text-center text-[#999] py-6 text-sm">
                        {canEdit ? 'Nessun articolo' : 'Nessun articolo disponibile per la richiesta al momento.'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {kitSubTab === 'configs' && (
                kitConfigs.length === 0 ? (
                  <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-10 text-center">
                    <ShoppingBag size={32} className="mx-auto text-[#999] mb-3"/>
                    <p className="text-[#999] text-sm">Nessun kit configurato.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {kitConfigs.map(kit => (
                      <div key={kit.id} className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between p-4">
                          <button className="flex items-center gap-3 flex-1 text-left"
                            onClick={() => setExpandedKit(expandedKit===kit.id ? null : kit.id)}>
                            <div className="w-9 h-9 rounded-full bg-[#1ab394]/10 text-[#1ab394] flex items-center justify-center flex-shrink-0"><ShoppingBag size={18}/></div>
                            <div>
                              <div className="text-[#2f4050] font-bold text-sm">{kit.nome}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {kit.categories ? <span className="text-xs text-white px-2 py-0.5 rounded font-medium" style={{ background: kit.categories.colore }}>{kit.categories.nome}</span>
                                  : <span className="text-xs bg-gray-100 text-[#999] px-2 py-0.5 rounded">Tutte le categorie</span>}
                                <span className="text-xs text-[#999]">{kit.sc_kit_config_items?.length||0} articoli</span>
                              </div>
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            {canEdit && <>
                              <button onClick={() => setAssignModal(kit)}
                                className="flex items-center gap-1 bg-[#1ab394]/10 hover:bg-[#1ab394]/20 text-[#1ab394] px-2 py-1 rounded text-xs font-semibold">
                                <ClipboardList size={13}/> Assegna
                              </button>
                              <button onClick={() => generateOrderForKit(kit)}
                                className="flex items-center gap-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-2 py-1 rounded text-xs">
                                <Download size={13}/> Ordine
                              </button>
                              <button onClick={()=>deleteKit(kit.id)} className="text-[#999] hover:text-red-500 p-1"><Trash2 size={14}/></button>
                            </>}
                            {expandedKit===kit.id ? <ChevronUp size={16} className="text-[#999]"/> : <ChevronDown size={16} className="text-[#999]"/>}
                          </div>
                        </div>
                        {expandedKit===kit.id && (
                          <div className="border-t border-[#e7eaec] px-4 py-3">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-[#e7eaec]">
                                  <th className="text-left text-xs text-[#999] py-2 font-semibold uppercase tracking-wide">Articolo</th>
                                  <th className="text-left text-xs text-[#999] py-2 font-semibold uppercase tracking-wide">Qta</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(kit.sc_kit_config_items||[]).map(item=>(
                                  <tr key={item.id} className="border-b border-[#e7eaec] last:border-0">
                                    <td className="py-2 text-[#2f4050] font-medium">{item.warehouse_items?.nome}</td>
                                    <td className="py-2 text-[#676a6c]">×{item.quantita}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {kitSubTab === 'assignments' && (
                <div className="space-y-3">
                  <select value={filterKitConfig} onChange={e=>setFilterKitConfig(e.target.value)}
                    className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] w-full sm:w-auto">
                    <option value="">Tutti i kit</option>
                    {kitConfigs.map(k=><option key={k.id} value={k.id}>{k.nome}</option>)}
                  </select>
                  {assignments.length === 0 ? (
                    <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-10 text-center">
                      <ClipboardList size={32} className="mx-auto text-[#999] mb-3"/>
                      <p className="text-[#999] text-sm">Nessuna assegnazione trovata.</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#e7eaec] bg-gray-50">
                            {['Atleta','Kit','Taglie','Stato',''].map(h=>(
                              <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {assignments.map(a => {
                            const S = STATO_KIT[a.stato]
                            return (
                              <tr key={a.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                                <td className="px-4 py-3 text-[#2f4050] font-medium">{a.youth_players?.cognome} {a.youth_players?.nome}</td>
                                <td className="px-4 py-3 text-[#999] text-xs">{a.sc_kit_configs?.nome}</td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {(a.sc_kit_assignment_items||[]).map(item=>(
                                      <span key={item.id} className="text-xs bg-gray-100 text-[#676a6c] px-1.5 py-0.5 rounded">
                                        {item.warehouse_items?.nome}: <strong>{item.taglia||'—'}</strong>
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', S?.color)}>{S?.label}</span>
                                </td>
                                {canEdit && (
                                  <td className="px-4 py-3">
                                    <div className="flex gap-1">
                                      {a.stato === 'in_attesa' && (
                                        <button onClick={()=>updateAssignmentStato(a.id,'ordinato',a)}
                                          className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs hover:bg-blue-200">Ordinato</button>
                                      )}
                                      {(a.stato === 'in_attesa' || a.stato === 'ordinato') && (
                                        <button onClick={()=>updateAssignmentStato(a.id,'consegnato',a)}
                                          className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200 flex items-center gap-1">
                                          <Check size={11}/> Consegnato
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {structureMaterials.map(m=>(
                  <div key={m.id} className={clsx('bg-white border rounded shadow-sm p-4 space-y-2',
                    m.quantita_disponibile<=(m.quantita_minima||0) ? 'border-yellow-300' : 'border-[#e7eaec]')}>
                    <div className="flex items-start justify-between">
                      <Package size={18} className="text-[#999]"/>
                      <div className="flex items-center gap-1">
                        {m.quantita_disponibile<=(m.quantita_minima||0) && <AlertTriangle size={13} className="text-yellow-500"/>}
                        {canEdit && (
                          <div className="flex gap-1">
                            <button onClick={()=>setMaterialModal(m)} className="text-[#999] hover:text-[#1c84c6]"><Edit2 size={13}/></button>
                            <button onClick={()=>deleteMaterial(m.id)} className="text-[#999] hover:text-red-500"><Trash2 size={13}/></button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-[#2f4050] font-semibold text-sm">{m.nome}</div>
                    <div className="text-xs text-[#999]">{CAT_MAT_LABELS[m.categoria]}</div>
                    {m.categories && <span className="text-xs text-white px-1.5 py-0.5 rounded font-medium" style={{ background: m.categories.colore }}>{m.categories.nome}</span>}
                    <div className={clsx('text-2xl font-bold',
                      m.quantita_disponibile<=0 ? 'text-red-500'
                      : m.quantita_disponibile<=(m.quantita_minima||0) ? 'text-yellow-500'
                      : 'text-[#1ab394]')}>{m.quantita_disponibile}</div>
                    <div className="text-xs text-[#999]">min. {m.quantita_minima||0} pz</div>
                  </div>
                ))}
                {structureMaterials.length===0 && <div className="col-span-4 text-center text-[#999] py-6 text-sm">Nessun materiale struttura</div>}
              </div>
            </div>
          )}

          {/* ── TAB RICHIESTE ── */}
          {tab === 'richieste' && (
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
              {requests.length === 0 ? (
                <div className="text-center text-[#999] py-10 text-sm">Nessuna richiesta</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e7eaec] bg-gray-50">
                      {canEdit && <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Richiedente</th>}
                      <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Tipo</th>
                      <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Articolo</th>
                      <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Qta</th>
                      <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Stato</th>
                      {canEdit && <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Azioni</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(r => (
                      <tr key={r.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                        {canEdit && (
                          <td className="px-4 py-3 text-[#2f4050] font-medium">
                            {r.profiles?.cognome} {r.profiles?.nome}
                            <div className="text-xs text-[#999]">{r.profiles?.role}</div>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <span className={clsx('px-2 py-0.5 rounded text-xs font-medium',
                            r.tipo === 'struttura' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600')}>
                            {r.tipo === 'struttura' ? '⚽ Struttura' : '👕 Abbigliamento'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#676a6c]">
                          {r.tipo === 'struttura' ? r.sc_structure_materials?.nome : r.warehouse_items?.nome}
                          {r.note && <div className="text-xs text-[#999] italic">{r.note}</div>}
                        </td>
                        <td className="px-4 py-3 text-[#999]">{r.quantita}</td>
                        <td className="px-4 py-3">
                          <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', STATUS_COLORS[r.status])}>
                            {STATUS_LABELS[r.status]}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {r.status === 'pending' && <>
                                <button onClick={() => updateRequestStatus(r.id, 'approved', r)}
                                  className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200">Approva</button>
                                <button onClick={() => updateRequestStatus(r.id, 'rejected', r)}
                                  className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200">Rifiuta</button>
                              </>}
                              {r.status === 'approved' && <>
                                <button onClick={() => updateRequestStatus(r.id, 'delivered', r)}
                                  className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs hover:bg-blue-200">Consegnato</button>
                                {r.tipo === 'struttura' && (
                                  <button onClick={() => generateRichiestaOrdinePDF(r, teamSettings)}
                                    className="px-2 py-1 bg-gray-100 text-[#676a6c] rounded text-xs hover:bg-gray-200 flex items-center gap-1">
                                    <Download size={11}/> PDF
                                  </button>
                                )}
                              </>}
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

          {/* ── TAB SCARICHI ── */}
          {tab === 'scarichi' && canEdit && (
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
              {scarichi.length === 0 ? (
                <div className="text-center text-[#999] py-10 text-sm">Nessuno scarico registrato</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e7eaec] bg-gray-50">
                      {['Data','Articolo','Qta','Motivo','Operatore'].map(h=>(
                        <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scarichi.map(s=>(
                      <tr key={s.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                        <td className="px-4 py-3 text-[#999] text-xs">{format(new Date(s.created_at),'dd/MM/yyyy HH:mm',{locale:it})}</td>
                        <td className="px-4 py-3 text-[#2f4050] font-medium">{s.sc_structure_materials?.nome||'—'}</td>
                        <td className="px-4 py-3 text-red-500 font-bold">-{s.quantita}</td>
                        <td className="px-4 py-3 text-[#676a6c]">{s.motivo||'—'}</td>
                        <td className="px-4 py-3 text-[#999] text-xs">{s.profiles?.cognome} {s.profiles?.nome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* Modali */}
      {itemModal !== null && <ItemModal item={itemModal} onClose={()=>setItemModal(null)} onSaved={()=>{setItemModal(null);load()}}/>}
      {kitModal && <KitConfigModal categories={categories} items={items} onClose={()=>setKitModal(false)} onSaved={()=>{setKitModal(false);load()}}/>}
      {assignModal && <AssignKitModal kit={assignModal} players={players} onClose={()=>setAssignModal(null)} onSaved={()=>{setAssignModal(null);load()}}/>}
      {materialModal !== null && <MaterialModal material={materialModal} categories={categories} onClose={()=>setMaterialModal(null)} onSaved={()=>{setMaterialModal(null);load()}}/>}
      {richiestaModal && (
        <RichiestaModal
          items={items}
          structureMaterials={structureMaterials}
          initialItemId={richiestaPreset}
          onClose={()=>{setRichiestaModal(false); setRichiestaPreset(null)}}
          onSaved={()=>{setRichiestaModal(false); setRichiestaPreset(null); load()}}
        />
      )}
      {scaricoModal && <ScaricoModal structureMaterials={structureMaterials} onClose={()=>setScaricoModal(false)} onSaved={()=>{setScaricoModal(false);load()}}/>}
    </div>
  )
}

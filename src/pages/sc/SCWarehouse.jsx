import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, Edit2, Trash2, X, ShoppingCart, Package, Truck, AlertTriangle, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const CATEGORIE = ['kit_gara','kit_allenamento','tuta','giacca','kway','borsone','calzettoni','pantaloncini','materiale_tecnico']
const CAT_LABELS = { kit_gara:'Kit Gara', kit_allenamento:'Kit Allenamento', tuta:'Tuta', giacca:'Giacca', kway:'K-Way', borsone:'Borsone', calzettoni:'Calzettoni', pantaloncini:'Pantaloncini', materiale_tecnico:'Mat. Tecnico' }
const TAGLIE = ['XS','S','M','L','XL','XXL','Unica','4','5','6','7','8','9','10','11','12']

function ItemModal({ item, onClose, onSaved }) {
  const isEdit = !!item?.id
  const [form, setForm] = useState({ codice:'', nome:'', descrizione:'', categoria:'kit_gara', taglia:'', quantita_disponibile:0, quantita_minima:2, prezzo:0, active:true, ...item })
  const [loading, setLoading] = useState(false)
  function set(k,v) { setForm(f=>({...f,[k]:v})) }
  async function save() {
    setLoading(true)
    const { error } = isEdit
      ? await supabase.from('warehouse_items').update(form).eq('id',form.id)
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
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Codice</label>
              <input value={form.codice||''} onChange={e=>set('codice',e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Taglia</label>
              <select value={form.taglia||''} onChange={e=>set('taglia',e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                <option value="">—</option>
                {TAGLIE.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Nome *</label>
            <input value={form.nome} onChange={e=>set('nome',e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Categoria</label>
            <select value={form.categoria} onChange={e=>set('categoria',e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              {CATEGORIE.map(c=><option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Descrizione</label>
            <textarea value={form.descrizione||''} onChange={e=>set('descrizione',e.target.value)} rows={2}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Qta disp.</label>
              <input type="number" min="0" value={form.quantita_disponibile} onChange={e=>set('quantita_disponibile',+e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Qta min.</label>
              <input type="number" min="0" value={form.quantita_minima} onChange={e=>set('quantita_minima',+e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Prezzo (€)</label>
              <input type="number" min="0" step="0.01" value={form.prezzo} onChange={e=>set('prezzo',+e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading?'Salvataggio...':'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
    const validRows = cart.filter(r=>r.item_id && r.quantita>0)
    if (validRows.length===0) return toast.error('Aggiungi almeno un articolo')
    setLoading(true)
    const { data: del, error } = await supabase.from('deliveries').insert([{
      youth_player_id: playerId, data_consegna: format(new Date(),'yyyy-MM-dd'),
      operatore_id: profile?.id, note
    }]).select().single()
    if (error) { toast.error(error.message); setLoading(false); return }
    await supabase.from('delivery_items').insert(validRows.map(r=>({ delivery_id:del.id, ...r })))
    // Scarica magazzino
    for (const r of validRows) {
      const item = items.find(i=>i.id===r.item_id)
      if (item) {
        await supabase.from('warehouse_items').update({ quantita_disponibile: Math.max(0, item.quantita_disponibile - r.quantita) }).eq('id',r.item_id)
        await supabase.from('warehouse_movements').insert([{ item_id:r.item_id, tipo:'consegna', quantita:-r.quantita, operatore_id:profile?.id }])
      }
    }
    // Genera verbale PDF
    const player = players.find(p=>p.id===playerId)
    const { data: ts } = await supabase.from('team_settings').select('*').single()
    generateDeliveryPDF(del, player, validRows.map(r=>({ ...r, item: items.find(i=>i.id===r.item_id) })), ts)
    toast.success('Consegna registrata!')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Nuova Consegna Kit</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Atleta</label>
            <select value={playerId} onChange={e=>setPlayerId(e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              <option value="">Seleziona atleta...</option>
              {players.map(p=><option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#999] uppercase tracking-wide">Articoli</label>
              <button onClick={addRow} className="text-xs text-[#1ab394] hover:underline">+ Aggiungi riga</button>
            </div>
            {cart.map((row,i)=>(
              <div key={i} className="flex gap-2 mb-2 items-center">
                <select value={row.item_id} onChange={e=>setRow(i,'item_id',e.target.value)}
                  className="flex-1 border border-[#e7eaec] rounded px-2 py-1.5 text-[#676a6c] text-xs outline-none focus:border-[#1ab394]">
                  <option value="">Articolo...</option>
                  {items.map(it=><option key={it.id} value={it.id}>{it.nome} {it.taglia?`(${it.taglia})`:''}</option>)}
                </select>
                <input type="number" min="1" value={row.quantita} onChange={e=>setRow(i,'quantita',+e.target.value)}
                  className="w-14 border border-[#e7eaec] rounded px-2 py-1.5 text-[#676a6c] text-xs outline-none focus:border-[#1ab394]"/>
                <select value={row.taglia||''} onChange={e=>setRow(i,'taglia',e.target.value)}
                  className="w-20 border border-[#e7eaec] rounded px-2 py-1.5 text-[#676a6c] text-xs outline-none focus:border-[#1ab394]">
                  <option value="">Taglia</option>
                  {TAGLIE.map(t=><option key={t}>{t}</option>)}
                </select>
                {cart.length>1 && <button onClick={()=>removeRow(i)} className="text-red-400 hover:text-red-600"><X size={14}/></button>}
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Note</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading?'Registrando...':'Registra + PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
    head: [['Articolo','Taglia','Quantità']],
    body: items.map(r=>[r.item?.nome||'—', r.taglia||'—', r.quantita]),
    headStyles: { fillColor: [26,179,148] }, styles: { fontSize: 9 }
  })
  const y = doc.lastAutoTable.finalY + 20
  doc.text('Firma consegnatario: ______________________', 14, y)
  doc.text('Firma ricevente: ______________________', 14, y+15)
  doc.save(`verbale_consegna_${player?.cognome}_${Date.now()}.pdf`)
}

export default function SCWarehouse() {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [players, setPlayers] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [tab, setTab] = useState('inventory')
  const [modal, setModal] = useState(null)
  const [deliveryModal, setDeliveryModal] = useState(false)
  const [filterCat, setFilterCat] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [tab, filterCat])

  async function load() {
    setLoading(true)
    let q = supabase.from('warehouse_items').select('*').eq('active',true).order('nome')
    if (filterCat) q = q.eq('categoria', filterCat)
    const { data: its } = await q
    setItems(its||[])
    if (tab === 'deliveries') {
      const { data: del } = await supabase.from('deliveries')
        .select('*, youth_players(nome,cognome), delivery_items(*, warehouse_items(nome,taglia))')
        .order('created_at', { ascending:false }).limit(30)
      setDeliveries(del||[])
    }
    const { data: pl } = await supabase.from('youth_players').select('id,nome,cognome').eq('active',true).order('cognome')
    setPlayers(pl||[])
    setLoading(false)
  }

  async function deleteItem(id) {
    if (!confirm('Eliminare questo articolo?')) return
    await supabase.from('warehouse_items').update({ active:false }).eq('id',id)
    toast.success('Eliminato'); load()
  }

  const lowStock = items.filter(i=>i.quantita_disponibile <= i.quantita_minima)

  return (
    <div className="space-y-4">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Magazzino Scuola Calcio</h1>
          <p className="text-sm text-[#999] mt-1">Gestione kit, materiali e consegne</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setDeliveryModal(true)}
            className="flex items-center gap-2 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-3 py-2 rounded text-sm">
            <Truck size={15}/> Consegna
          </button>
          <button onClick={()=>setModal({})}
            className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
            <Plus size={16}/> Articolo
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-[#1ab394]">{items.length}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Articoli</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-[#2f4050]">{items.reduce((s,i)=>s+i.quantita_disponibile,0)}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Pezzi totali</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-red-500">{lowStock.length}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Scorte basse</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-blue-600">{deliveries.length}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Consegne</div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-700 text-sm">
          <AlertTriangle size={16}/> <strong>{lowStock.length}</strong> articolo/i sotto scorta minima
        </div>
      )}

      {/* Tab */}
      <div className="flex gap-1 border-b border-[#e7eaec]">
        {[['inventory','Inventario'],['deliveries','Consegne']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)}
            className={clsx('px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab===v?'border-[#1ab394] text-[#1ab394]':'border-transparent text-[#999] hover:text-[#676a6c]')}>
            {l}
          </button>
        ))}
      </div>

      {/* Filtro categoria */}
      {tab === 'inventory' && (
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
          className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
          <option value="">Tutte le categorie</option>
          {CATEGORIE.map(c=><option key={c} value={c}>{CAT_LABELS[c]}</option>)}
        </select>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/></div>
      ) : tab === 'inventory' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map(item=>(
            <div key={item.id} className={clsx('bg-white border rounded shadow-sm p-4 space-y-2',
              item.quantita_disponibile<=item.quantita_minima ? 'border-yellow-300' : 'border-[#e7eaec]')}>
              <div className="flex items-start justify-between">
                <Package size={18} className="text-[#999]"/>
                <div className="flex gap-1">
                  <button onClick={()=>setModal(item)} className="text-[#999] hover:text-[#1c84c6]"><Edit2 size={13}/></button>
                  <button onClick={()=>deleteItem(item.id)} className="text-[#999] hover:text-red-500"><Trash2 size={13}/></button>
                </div>
              </div>
              {item.codice && <div className="text-xs text-[#999] font-mono">{item.codice}</div>}
              <div className="text-[#2f4050] font-semibold text-sm">{item.nome}</div>
              <div className="flex items-center gap-2">
                {item.taglia && <span className="text-xs bg-gray-100 text-[#676a6c] px-1.5 py-0.5 rounded">{item.taglia}</span>}
                <span className="text-xs text-[#999]">{CAT_LABELS[item.categoria]}</span>
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
      ) : (
        <div className="space-y-3">
          {deliveries.length===0 ? (
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-8 text-center text-[#999] text-sm">Nessuna consegna registrata</div>
          ) : deliveries.map(d=>(
            <div key={d.id} className="bg-white border border-[#e7eaec] rounded shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[#2f4050] font-semibold">{d.youth_players?.cognome} {d.youth_players?.nome}</div>
                  <div className="text-xs text-[#999] mt-1">{format(new Date(d.data_consegna),'dd MMM yyyy',{locale:it})}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(d.delivery_items||[]).map(di=>(
                      <span key={di.id} className="text-xs bg-gray-100 text-[#676a6c] px-2 py-0.5 rounded">
                        {di.warehouse_items?.nome} {di.taglia?`(${di.taglia})`:''} ×{di.quantita}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={()=>{
                  const player = players.find(p=>p.id===d.youth_player_id)||d.youth_players
                  generateDeliveryPDF(d, player, (d.delivery_items||[]).map(di=>({ ...di, item:di.warehouse_items })), null)
                }} className="text-[#999] hover:text-[#1ab394] flex items-center gap-1 text-xs">
                  <Download size={13}/> PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal!==null && <ItemModal item={modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}}/>}
      {deliveryModal && <DeliveryModal players={players} items={items} profile={profile} onClose={()=>setDeliveryModal(false)} onSaved={()=>{setDeliveryModal(false);load()}}/>}
    </div>
  )
}

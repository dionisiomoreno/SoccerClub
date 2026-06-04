import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Download, X, AlertTriangle, CheckCircle, Clock, XCircle, Euro } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const STATI = {
  pagato: { label: 'Pagato', color: 'bg-green-100 text-green-600', icon: CheckCircle },
  parzialmente_pagato: { label: 'Parz. pagato', color: 'bg-yellow-100 text-yellow-600', icon: Clock },
  scaduto: { label: 'Scaduto', color: 'bg-red-100 text-red-600', icon: XCircle },
  da_pagare: { label: 'Da pagare', color: 'bg-gray-100 text-gray-500', icon: Clock }
}

const METODI = ['contanti', 'bonifico', 'pos', 'altro']
const TIPI = ['annuale', 'mensile', 'trimestrale']
const MONTHS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

function generateReceipt(payment, player, receipt, teamSettings) {
  const doc = new jsPDF()
  doc.setFillColor(26, 179, 148)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255,255,255)
  doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text(teamSettings?.nome_squadra || 'SoccerClub', 14, 13)
  doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.text('Ricevuta di pagamento', 14, 22)
  doc.setTextColor(0,0,0)
  doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text(`N° ${receipt.numero_ricevuta}`, 14, 42)
  doc.setFont('helvetica','normal'); doc.setFontSize(10)
  doc.text(`Data: ${format(new Date(receipt.data_pagamento), 'dd/MM/yyyy')}`, 14, 50)
  doc.text(`Atleta: ${player?.cognome} ${player?.nome}`, 14, 58)
  doc.text(`Operatore: ${receipt.operatore || '—'}`, 14, 66)
  autoTable(doc, {
    startY: 76,
    head: [['Descrizione', 'Importo', 'Metodo']],
    body: [[
      `Quota ${payment?.tipo || ''} — ${MONTHS[(payment?.mese||1)-1]} ${payment?.anno || ''}`,
      `€${receipt.importo}`,
      receipt.metodo_pagamento || '—'
    ]],
    headStyles: { fillColor: [26,179,148] },
    styles: { fontSize: 10 }
  })
  const y = doc.lastAutoTable.finalY + 15
  doc.setFillColor(245,245,245); doc.rect(14, y, 182, 20, 'F')
  doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(26,179,148)
  doc.text(`Totale pagato: €${receipt.importo}`, 20, y+13)
  doc.setTextColor(0,0,0); doc.setFont('helvetica','normal'); doc.setFontSize(10)
  doc.text('Firma: ______________________', 120, y+13)
  if (receipt.note) { doc.setFontSize(9); doc.text(`Note: ${receipt.note}`, 14, y+30) }
  doc.save(`ricevuta_${receipt.numero_ricevuta}.pdf`)
}

function PaymentModal({ players, categories, configs, onClose, onSaved }) {
  const [form, setForm] = useState({
    youth_player_id: '', payment_config_id: '',
    mese: new Date().getMonth()+1, anno: new Date().getFullYear(),
    importo_dovuto: 0, importo_pagato: 0,
    data_scadenza: '', data_pagamento: format(new Date(),'yyyy-MM-dd'),
    metodo_pagamento: 'contanti', stato: 'da_pagare', note: ''
  })
  const [loading, setLoading] = useState(false)
  function set(k,v) { setForm(f=>({...f,[k]:v})) }

  function onConfigChange(id) {
    const cfg = configs.find(c=>c.id===id)
    set('payment_config_id', id)
    if (cfg) set('importo_dovuto', cfg.importo)
  }

  async function save() {
    if (!form.youth_player_id) return toast.error('Seleziona un atleta')
    setLoading(true)
    const stato = form.importo_pagato >= form.importo_dovuto ? 'pagato'
      : form.importo_pagato > 0 ? 'parzialmente_pagato'
      : new Date(form.data_scadenza) < new Date() ? 'scaduto' : 'da_pagare'
    const { data: pay, error } = await supabase.from('payments')
      .insert([{ ...form, stato }]).select().single()
    if (error) { toast.error(error.message); setLoading(false); return }

    if (form.importo_pagato > 0) {
      const num = `RIC-${Date.now()}`
      const player = players.find(p=>p.id===form.youth_player_id)
      const cfg = configs.find(c=>c.id===form.payment_config_id)
      const { data: receipt } = await supabase.from('payment_receipts').insert([{
        payment_id: pay.id, youth_player_id: form.youth_player_id,
        numero_ricevuta: num, data_pagamento: form.data_pagamento,
        importo: form.importo_pagato, metodo_pagamento: form.metodo_pagamento
      }]).select().single()
      const { data: ts } = await supabase.from('team_settings').select('*').single()
      generateReceipt(cfg, player, receipt, ts)
    }
    toast.success('Pagamento registrato')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Nuovo Pagamento</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Atleta</label>
            <select value={form.youth_player_id} onChange={e=>set('youth_player_id',e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              <option value="">Seleziona atleta...</option>
              {players.map(p=><option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Tipo quota</label>
            <select value={form.payment_config_id} onChange={e=>onConfigChange(e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              <option value="">Seleziona quota...</option>
              {configs.map(c=><option key={c.id} value={c.id}>{c.nome} — €{c.importo}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Mese</label>
              <select value={form.mese} onChange={e=>set('mese',+e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Anno</label>
              <input type="number" value={form.anno} onChange={e=>set('anno',+e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Importo dovuto (€)</label>
              <input type="number" value={form.importo_dovuto} onChange={e=>set('importo_dovuto',+e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Importo pagato (€)</label>
              <input type="number" value={form.importo_pagato} onChange={e=>set('importo_pagato',+e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Data pagamento</label>
              <input type="date" value={form.data_pagamento} onChange={e=>set('data_pagamento',e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Scadenza</label>
              <input type="date" value={form.data_scadenza} onChange={e=>set('data_scadenza',e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Metodo pagamento</label>
            <select value={form.metodo_pagamento} onChange={e=>set('metodo_pagamento',e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              {METODI.map(m=><option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Note</label>
            <textarea value={form.note} onChange={e=>set('note',e.target.value)} rows={2}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>
          {form.importo_pagato > 0 && (
            <div className="bg-green-50 border border-green-200 rounded p-3 text-xs text-green-700 flex items-center gap-2">
              <CheckCircle size={14}/> Verrà generata automaticamente la ricevuta PDF
            </div>
          )}
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Salvataggio...' : 'Registra'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfigModal({ categories, onClose, onSaved }) {
  const [form, setForm] = useState({ nome: '', tipo: 'mensile', importo: 0, category_id: '', giorno_scadenza: 10 })
  const [loading, setLoading] = useState(false)
  async function save() {
    setLoading(true)
    const { error } = await supabase.from('payment_configs').insert([form])
    if (error) toast.error(error.message)
    else { toast.success('Quota configurata'); onSaved() }
    setLoading(false)
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Nuova Quota</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Nome quota</label>
            <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}
              placeholder="Es. Quota mensile Pulcini"
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Categoria</label>
            <select value={form.category_id} onChange={e=>setForm(f=>({...f,category_id:e.target.value}))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              <option value="">Tutte le categorie</option>
              {categories.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Tipo</label>
              <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                {TIPI.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Importo (€)</label>
              <input type="number" value={form.importo} onChange={e=>setForm(f=>({...f,importo:+e.target.value}))}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Giorno scadenza (del mese)</label>
            <input type="number" min="1" max="28" value={form.giorno_scadenza} onChange={e=>setForm(f=>({...f,giorno_scadenza:+e.target.value}))}
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

export default function SCPayments() {
  const [payments, setPayments] = useState([])
  const [players, setPlayers] = useState([])
  const [categories, setCategories] = useState([])
  const [configs, setConfigs] = useState([])
  const [receipts, setReceipts] = useState([])
  const [tab, setTab] = useState('payments')
  const [modal, setModal] = useState(false)
  const [configModal, setConfigModal] = useState(false)
  const [filterCat, setFilterCat] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [filterMese, setFilterMese] = useState(new Date().getMonth()+1)
  const [filterAnno, setFilterAnno] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [tab, filterCat, filterStato, filterMese, filterAnno])

  async function load() {
    setLoading(true)
    const [{ data: pl }, { data: cat }, { data: cfg }] = await Promise.all([
      supabase.from('youth_players').select('id,nome,cognome,category_id').eq('active',true).order('cognome'),
      supabase.from('categories').select('*').order('ordine'),
      supabase.from('payment_configs').select('*').eq('active',true)
    ])
    setPlayers(pl||[])
    setCategories(cat||[])
    setConfigs(cfg||[])

    if (tab === 'payments') {
      let q = supabase.from('payments').select('*, youth_players(nome,cognome,category_id), payment_configs(nome,tipo)')
        .eq('mese', filterMese).eq('anno', filterAnno).order('created_at', { ascending: false })
      if (filterStato) q = q.eq('stato', filterStato)
      const { data } = await q
      setPayments(data||[])
    } else if (tab === 'receipts') {
      const { data } = await supabase.from('payment_receipts')
        .select('*, youth_players(nome,cognome)').order('created_at', { ascending: false }).limit(50)
      setReceipts(data||[])
    }
    setLoading(false)
  }

  async function downloadReceipt(r) {
    const { data: pay } = await supabase.from('payments').select('*, payment_configs(nome,tipo)').eq('id', r.payment_id).single()
    const { data: ts } = await supabase.from('team_settings').select('*').single()
    const player = players.find(p=>p.id===r.youth_player_id) || r.youth_players
    generateReceipt(pay?.payment_configs, player, r, ts)
  }

  const totaleDovuto = payments.reduce((s,p)=>s+(p.importo_dovuto||0),0)
  const totalePagato = payments.reduce((s,p)=>s+(p.importo_pagato||0),0)
  const totaleResiduo = payments.reduce((s,p)=>s+(p.importo_residuo||0),0)
  const insoluti = payments.filter(p=>p.stato==='scaduto').length

  return (
    <div className="space-y-4">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Pagamenti Scuola Calcio</h1>
          <p className="text-sm text-[#999] mt-1">Gestione quote e ricevute</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setConfigModal(true)}
            className="border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-3 py-2 rounded text-sm">
            + Quota
          </button>
          <button onClick={()=>setModal(true)}
            className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
            <Plus size={16}/> Pagamento
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-[#2f4050]">€{totaleDovuto}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Dovuto</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-[#1ab394]">€{totalePagato}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Incassato</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-red-500">€{totaleResiduo}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Residuo</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-red-500">{insoluti}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Insoluti</div>
        </div>
      </div>

      {/* Alert insoluti */}
      {insoluti > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded p-3 text-red-600 text-sm">
          <AlertTriangle size={16}/> <strong>{insoluti}</strong> pagamento/i scaduto/i
        </div>
      )}

      {/* Tab */}
      <div className="flex gap-1 border-b border-[#e7eaec]">
        {[['payments','Pagamenti'],['receipts','Ricevute'],['configs','Quote configurate']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)}
            className={clsx('px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab===v ? 'border-[#1ab394] text-[#1ab394]' : 'border-transparent text-[#999] hover:text-[#676a6c]')}>
            {l}
          </button>
        ))}
      </div>

      {/* Filtri */}
      {tab === 'payments' && (
        <div className="flex gap-2 flex-wrap">
          <select value={filterMese} onChange={e=>setFilterMese(+e.target.value)}
            className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
            {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
          </select>
          <input type="number" value={filterAnno} onChange={e=>setFilterAnno(+e.target.value)}
            className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] w-24"/>
          <select value={filterStato} onChange={e=>setFilterStato(e.target.value)}
            className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
            <option value="">Tutti gli stati</option>
            {Object.entries(STATI).map(([v,{label}])=><option key={v} value={v}>{label}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/></div>
      ) : tab === 'payments' ? (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
          {payments.length === 0 ? (
            <div className="text-center text-[#999] py-10 text-sm">Nessun pagamento trovato</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e7eaec] bg-gray-50">
                  {['Atleta','Quota','Dovuto','Pagato','Residuo','Stato','Data pag.'].map(h=>(
                    <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map(p=>{
                  const S = STATI[p.stato]
                  return (
                    <tr key={p.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                      <td className="px-4 py-3 text-[#2f4050] font-medium">{p.youth_players?.cognome} {p.youth_players?.nome}</td>
                      <td className="px-4 py-3 text-[#999] text-xs">{p.payment_configs?.nome || '—'}</td>
                      <td className="px-4 py-3 text-[#676a6c]">€{p.importo_dovuto}</td>
                      <td className="px-4 py-3 text-[#1ab394] font-medium">€{p.importo_pagato}</td>
                      <td className="px-4 py-3 text-red-500">€{p.importo_residuo}</td>
                      <td className="px-4 py-3">
                        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', S?.color)}>{S?.label}</span>
                      </td>
                      <td className="px-4 py-3 text-[#999] text-xs">
                        {p.data_pagamento ? format(new Date(p.data_pagamento),'dd/MM/yy') : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : tab === 'receipts' ? (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
          {receipts.length === 0 ? (
            <div className="text-center text-[#999] py-10 text-sm">Nessuna ricevuta</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e7eaec] bg-gray-50">
                  {['N° Ricevuta','Atleta','Data','Importo','Metodo','Azioni'].map(h=>(
                    <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {receipts.map(r=>(
                  <tr key={r.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-[#676a6c]">{r.numero_ricevuta}</td>
                    <td className="px-4 py-3 text-[#2f4050] font-medium">{r.youth_players?.cognome} {r.youth_players?.nome}</td>
                    <td className="px-4 py-3 text-[#999]">{format(new Date(r.data_pagamento),'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3 text-[#1ab394] font-bold">€{r.importo}</td>
                    <td className="px-4 py-3 text-[#999] capitalize">{r.metodo_pagamento}</td>
                    <td className="px-4 py-3">
                      <button onClick={()=>downloadReceipt(r)} className="text-[#999] hover:text-[#1ab394] flex items-center gap-1 text-xs">
                        <Download size={13}/> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {configs.length === 0 ? (
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-8 text-center text-[#999] text-sm">
              Nessuna quota configurata. Clicca "+ Quota" per aggiungerne una.
            </div>
          ) : configs.map(c=>(
            <div key={c.id} className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 flex items-center justify-between">
              <div>
                <div className="text-[#2f4050] font-semibold">{c.nome}</div>
                <div className="text-xs text-[#999] mt-1">
                  {c.tipo.charAt(0).toUpperCase()+c.tipo.slice(1)} — scadenza giorno {c.giorno_scadenza} del mese
                </div>
              </div>
              <div className="text-[#1ab394] font-bold text-lg">€{c.importo}</div>
            </div>
          ))}
        </div>
      )}

      {modal && <PaymentModal players={players} categories={categories} configs={configs} onClose={()=>setModal(false)} onSaved={()=>{setModal(false);load()}}/>}
      {configModal && <ConfigModal categories={categories} onClose={()=>setConfigModal(false)} onSaved={()=>{setConfigModal(false);load()}}/>}
    </div>
  )
}

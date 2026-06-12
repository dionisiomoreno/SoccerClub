import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Download, X, AlertTriangle, CheckCircle, Clock, XCircle, Euro, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format, getDaysInMonth, isAfter, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Costanti ─────────────────────────────────────────────────
const STATI = {
  pagato:              { label: 'Pagato',       color: 'bg-green-100 text-green-600',  icon: CheckCircle },
  parzialmente_pagato: { label: 'Parz. pagato', color: 'bg-yellow-100 text-yellow-600', icon: Clock },
  scaduto:             { label: 'Scaduto',      color: 'bg-red-100 text-red-600',      icon: XCircle },
  da_pagare:           { label: 'Da pagare',    color: 'bg-gray-100 text-gray-500',    icon: Clock }
}
const METODI = ['contanti', 'bonifico', 'pos', 'altro']
const TIPI   = ['annuale', 'mensile', 'trimestrale']
const MONTHS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
const MONTHS_FULL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

// ── PDF ricevuta retta ────────────────────────────────────────
function generateRettaReceipt(scadenza, player, teamSettings) {
  const doc = new jsPDF()
  doc.setFillColor(26, 179, 148)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255,255,255)
  doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text(teamSettings?.nome_squadra || 'SoccerClub', 14, 13)
  doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.text('Ricevuta di pagamento — Retta Scuola Calcio', 14, 22)
  doc.setTextColor(0,0,0)
  doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text(`N° ${scadenza.numero_ricevuta}`, 14, 42)
  doc.setFont('helvetica','normal'); doc.setFontSize(10)
  doc.text(`Data pagamento: ${format(new Date(scadenza.data_pagamento), 'dd/MM/yyyy')}`, 14, 50)
  doc.text(`Atleta: ${player?.cognome} ${player?.nome}`, 14, 58)
  doc.text(`Periodo: ${MONTHS_FULL[scadenza.mese - 1]} ${scadenza.anno}`, 14, 66)
  autoTable(doc, {
    startY: 76,
    head: [['Descrizione','Importo','Metodo']],
    body: [[
      `Retta mensile — ${MONTHS_FULL[scadenza.mese - 1]} ${scadenza.anno}`,
      `€${Number(scadenza.importo_pagato).toFixed(2)}`,
      scadenza.metodo_pagamento || '—'
    ]],
    headStyles: { fillColor: [26,179,148] }, styles: { fontSize: 10 }
  })
  const y = doc.lastAutoTable.finalY + 15
  doc.setFillColor(245,245,245); doc.rect(14, y, 182, 20, 'F')
  doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(26,179,148)
  doc.text(`Totale pagato: €${Number(scadenza.importo_pagato).toFixed(2)}`, 20, y+13)
  doc.setTextColor(0,0,0); doc.setFont('helvetica','normal'); doc.setFontSize(10)
  doc.text('Firma: ______________________', 120, y+13)
  doc.save(`retta_${player?.cognome}_${MONTHS[scadenza.mese-1]}${scadenza.anno}.pdf`)
}

// ── PDF ricevuta quote pagamenti SC (esistente) ───────────────
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
    headStyles: { fillColor: [26,179,148] }, styles: { fontSize: 10 }
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

// ── Modal pagamento singola retta ─────────────────────────────
function PagaRettaModal({ scadenza, player, onClose, onSaved, teamSettings }) {
  const [form, setForm] = useState({
    importo_pagato: scadenza.importo,
    metodo_pagamento: 'contanti',
    data_pagamento: format(new Date(), 'yyyy-MM-dd'),
    note: ''
  })
  const [loading, setLoading] = useState(false)

 async function save() {
  if (!form.importo_pagato || form.importo_pagato <= 0) return toast.error('Importo non valido')
  setLoading(true)
  const numRicevuta = `RET-${Date.now()}`

  // 1. Aggiorna la scadenza retta
  const { error } = await supabase.from('rette_scadenze').update({
    stato:            'pagato',
    data_pagamento:   form.data_pagamento,
    metodo_pagamento: form.metodo_pagamento,
    numero_ricevuta:  numRicevuta,
    importo_pagato:   +form.importo_pagato,
    note:             form.note,
    updated_at:       new Date().toISOString()
  }).eq('id', scadenza.id)

  if (error) { toast.error(error.message); setLoading(false); return }

  // 2. Crea entry in contabilità
  const { data: ts } = await supabase.from('team_settings').select('club_id').single()
  await supabase.from('accounting_entries').insert([{
    club_id:           ts?.club_id,
    data:              form.data_pagamento,
    tipo:              'entrata',
    categoria:         'Quote SC',
    descrizione:       `Retta ${MONTHS_FULL[(scadenza.mese||1)-1]} ${scadenza.anno} — ${player?.cognome} ${player?.nome}`,
    importo:           +form.importo_pagato,
    metodo_pagamento:  form.metodo_pagamento,
    riferimento:       numRicevuta,
    modulo:            'sc',
    note:              form.note || null,
  }])

  // 3. Genera PDF ricevuta
  generateRettaReceipt(
    { ...scadenza, ...form, numero_ricevuta: numRicevuta },
    player,
    teamSettings
  )

  toast.success('Retta registrata e ricevuta generata!')
  onSaved()
  setLoading(false)
}

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Registra pagamento retta</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-[#1ab394]/5 border border-[#1ab394]/20 rounded p-3">
            <div className="text-[#2f4050] font-semibold text-sm">{player?.cognome} {player?.nome}</div>
            <div className="text-xs text-[#999] mt-0.5">
              Retta {MONTHS_FULL[(scadenza.mese||1)-1]} {scadenza.anno} — dovuto: <strong>€{Number(scadenza.importo).toFixed(2)}</strong>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Importo pagato (€)</label>
            <input type="number" min="0" step="0.01"
              value={form.importo_pagato}
              onChange={e => setForm(f => ({ ...f, importo_pagato: e.target.value }))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Data pagamento</label>
            <input type="date" value={form.data_pagamento}
              onChange={e => setForm(f => ({ ...f, data_pagamento: e.target.value }))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Metodo pagamento</label>
            <select value={form.metodo_pagamento}
              onChange={e => setForm(f => ({ ...f, metodo_pagamento: e.target.value }))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              {METODI.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Note</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={2} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-3 text-xs text-green-700 flex items-center gap-2">
            <CheckCircle size={14}/> Verrà generata automaticamente la ricevuta PDF
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Registrazione...' : 'Registra e genera PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal pagamento multiplo (batch) ──────────────────────────
function PagaBatchModal({ scadenze, players, onClose, onSaved, teamSettings }) {
  const [selected, setSelected] = useState(scadenze.map(s => s.id))
  const [metodo, setMetodo] = useState('contanti')
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  function toggle(id) { setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]) }

 async function save() {
  if (!selected.length) return toast.error('Seleziona almeno una scadenza')
  setLoading(true)
  const { data: ts } = await supabase.from('team_settings').select('club_id').single()
  for (const id of selected) {
    const sc = scadenze.find(s => s.id === id)
    const player = players.find(p => p.id === sc.youth_player_id)
    const numRicevuta = `RET-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
    await supabase.from('rette_scadenze').update({
      stato: 'pagato', data_pagamento: data,
      metodo_pagamento: metodo, numero_ricevuta: numRicevuta,
      importo_pagato: sc.importo, updated_at: new Date().toISOString()
    }).eq('id', id)
    await supabase.from('accounting_entries').insert([{
      club_id:          ts?.club_id,
      data:             data,
      tipo:             'entrata',
      categoria:        'Quote SC',
      descrizione:      `Retta ${MONTHS_FULL[(sc.mese||1)-1]} ${sc.anno} — ${player?.cognome} ${player?.nome}`,
      importo:          +sc.importo,
      metodo_pagamento: metodo,
      riferimento:      numRicevuta,
      modulo:           'sc',
    }])
    generateRettaReceipt({ ...sc, data_pagamento: data, metodo_pagamento: metodo, numero_ricevuta: numRicevuta, importo_pagato: sc.importo }, player, teamSettings)
  }
  toast.success(`${selected.length} rette registrate!`)
  onSaved()
  setLoading(false)
}

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Registra rette del mese</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Data pagamento</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Metodo pagamento</label>
              <select value={metodo} onChange={e => setMetodo(e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                {METODI.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1 border border-[#e7eaec] rounded p-2 max-h-60 overflow-y-auto">
            {scadenze.map(sc => {
              const p = players.find(x => x.id === sc.youth_player_id)
              return (
                <label key={sc.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(sc.id)}
                    onChange={() => toggle(sc.id)} className="accent-[#1ab394]"/>
                  <div className="flex-1">
                    <span className="text-sm text-[#2f4050] font-medium">{p?.cognome} {p?.nome}</span>
                  </div>
                  <span className="text-[#1ab394] font-semibold text-sm">€{Number(sc.importo).toFixed(2)}</span>
                </label>
              )
            })}
          </div>
          <div className="bg-[#1ab394]/5 border border-[#1ab394]/20 rounded p-3 flex justify-between text-sm">
            <span className="text-[#676a6c]">Totale selezionati ({selected.length})</span>
            <strong className="text-[#1ab394]">
              €{scadenze.filter(s => selected.includes(s.id)).reduce((sum,s) => sum + +s.importo, 0).toFixed(2)}
            </strong>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading || !selected.length}
            className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Registrazione...' : `Registra ${selected.length} rette`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal nuova quota (esistente) ─────────────────────────────
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
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Giorno scadenza</label>
            <input type="number" min="1" max="28" value={form.giorno_scadenza}
              onChange={e=>setForm(f=>({...f,giorno_scadenza:+e.target.value}))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">Salva</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal nuovo pagamento (esistente) ─────────────────────────
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
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Dovuto (€)</label>
              <input type="number" value={form.importo_dovuto} onChange={e=>set('importo_dovuto',+e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Pagato (€)</label>
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
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Metodo</label>
            <select value={form.metodo_pagamento} onChange={e=>set('metodo_pagamento',e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              {METODI.map(m=><option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
            </select>
          </div>
          {form.importo_pagato > 0 && (
            <div className="bg-green-50 border border-green-200 rounded p-3 text-xs text-green-700 flex items-center gap-2">
              <CheckCircle size={14}/> Ricevuta PDF generata automaticamente
            </div>
          )}
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Salvataggio...' : 'Registra'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tab Scadenziario ──────────────────────────────────────────
function TabScadenziario({ players, categories, teamSettings }) {
  const now = new Date()
  const [filterMese,  setFilterMese]  = useState(now.getMonth() + 1)
  const [filterAnno,  setFilterAnno]  = useState(now.getFullYear())
  const [filterStato, setFilterStato] = useState('')
  const [filterCat,   setFilterCat]   = useState('')
  const [scadenze,    setScadenze]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [payModal,    setPayModal]    = useState(null)  // singola scadenza
  const [batchModal,  setBatchModal]  = useState(false)

  const loadScadenze = useCallback(async () => {
    setLoading(true)
    // 1. Aggiorna stato 'scaduto' per le scadenze passate non pagate
    await supabase.from('rette_scadenze')
      .update({ stato: 'scaduto' })
      .eq('stato', 'da_pagare')
      .lt('data_scadenza', format(now, 'yyyy-MM-dd'))

    // 2. Carica scadenze del mese selezionato
    let q = supabase.from('rette_scadenze')
      .select('*, youth_players(id, nome, cognome, category_id, categories(nome,colore))')
      .eq('mese', filterMese)
      .eq('anno', filterAnno)
      .order('data_scadenza')
    if (filterStato) q = q.eq('stato', filterStato)
    const { data } = await q
    let rows = data || []

    // 3. Filtra per categoria se richiesto
    if (filterCat) rows = rows.filter(r => r.youth_players?.category_id === filterCat)
    setScadenze(rows)
    setLoading(false)
  }, [filterMese, filterAnno, filterStato, filterCat])

  useEffect(() => { loadScadenze() }, [loadScadenze])

  // Genera scadenze mancanti per il mese selezionato
  async function generaScadenzeMese() {
  const { data: configs, error: configError } = await supabase.from('rette_config').select('*').eq('active', true)
  console.log('configs trovate:', configs?.length, 'errore:', configError)
  if (!configs?.length) return toast.error('Nessuna configurazione retta trovata. Configura le rette dagli atleti.')

    let generate = 0
    for (const cfg of configs) {
      // Verifica che il mese/anno ricada nell'intervallo della config
      const inizio = cfg.anno_inizio * 100 + cfg.mese_inizio
      const fine   = cfg.anno_fine   * 100 + cfg.mese_fine
      const cur    = filterAnno      * 100 + filterMese
      if (cur < inizio || cur > fine) continue

      // Calcola data scadenza (giorno del mese, o ultimo giorno se mese corto)
      const daysInM = getDaysInMonth(new Date(filterAnno, filterMese - 1))
      const giorno  = Math.min(cfg.giorno_scadenza, daysInM)
      const dataScad = `${filterAnno}-${String(filterMese).padStart(2,'0')}-${String(giorno).padStart(2,'0')}`

      // Inserisce solo se non esiste già
      const { error } = await supabase.from('rette_scadenze').insert([{
        retta_config_id: cfg.id,
        youth_player_id: cfg.youth_player_id,
        mese:            filterMese,
        anno:            filterAnno,
        importo:         cfg.importo,
        data_scadenza:   dataScad,
        stato:           isAfter(new Date(), parseISO(dataScad)) ? 'scaduto' : 'da_pagare'
      }]).select()

      if (!error) generate++
    }

    if (generate === 0) toast('Tutte le scadenze erano già presenti', { icon: 'ℹ️' })
    else { toast.success(`${generate} scadenze generate`); loadScadenze() }
  }

  const daPagare = scadenze.filter(s => s.stato === 'da_pagare' || s.stato === 'scaduto')
  const scadute  = scadenze.filter(s => s.stato === 'scaduto')
  const pagate   = scadenze.filter(s => s.stato === 'pagato')
  const totDovuto  = scadenze.reduce((s,r) => s + +r.importo, 0)
  const totIncassato = scadenze.filter(s => s.stato === 'pagato').reduce((s,r) => s + +(r.importo_pagato || r.importo), 0)
  const isMeseCorrente = filterMese === now.getMonth()+1 && filterAnno === now.getFullYear()

  return (
    <div className="space-y-4">
      {/* Alert mese corrente */}
      {daPagare.length > 0 && (
        <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded p-3">
          <div className="flex items-center gap-2 text-yellow-700 text-sm">
            <Bell size={16}/>
            <strong>{daPagare.length}</strong> rette da incassare questo mese •
            <strong>€{daPagare.reduce((s,r) => s + +r.importo, 0).toFixed(2)}</strong> da incassare
          </div>
          <button onClick={() => setBatchModal(true)}
            className="flex items-center gap-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1.5 rounded text-xs font-semibold">
            Registra tutte
          </button>
        </div>
      )}
      {isMeseCorrente && scadute.length > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded p-3 text-red-600 text-sm">
          <AlertTriangle size={15}/>
          <strong>{scadute.length}</strong> rette scadute non pagate questo mese
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-[#2f4050]">{scadenze.length}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Totale rette</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-[#1ab394]">{pagate.length}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Pagate</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-yellow-600">{daPagare.length}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Da pagare</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-red-500">{scadute.length}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Scadute</div>
        </div>
      </div>

      {/* Riepilogo importi */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 flex items-center justify-between">
          <span className="text-xs text-[#999] uppercase tracking-wide">Totale dovuto</span>
          <span className="font-bold text-[#2f4050]">€{totDovuto.toFixed(2)}</span>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 flex items-center justify-between">
          <span className="text-xs text-[#999] uppercase tracking-wide">Incassato</span>
          <span className="font-bold text-[#1ab394]">€{totIncassato.toFixed(2)}</span>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <select value={filterMese} onChange={e => setFilterMese(+e.target.value)}
            className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
            {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <input type="number" value={filterAnno} onChange={e => setFilterAnno(+e.target.value)}
            className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] w-24"/>
          <select value={filterStato} onChange={e => setFilterStato(e.target.value)}
            className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
            <option value="">Tutti gli stati</option>
            {Object.entries(STATI).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
            <option value="">Tutte le categorie</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <button onClick={generaScadenzeMese}
          className="flex items-center gap-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-3 py-2 rounded text-sm">
          + Genera scadenze
        </button>
      </div>

      {/* Tabella scadenze */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : scadenze.length === 0 ? (
          <div className="text-center text-[#999] py-10 text-sm">
            <Euro size={32} className="mx-auto mb-2 opacity-30"/>
            Nessuna scadenza per questo mese.
            <br/>
            <button onClick={generaScadenzeMese} className="mt-2 text-[#1ab394] hover:underline text-xs">
              Genera le scadenze →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e7eaec] bg-gray-50">
                {['Atleta','Categoria','Scadenza','Importo','Stato','N° Ricevuta','Azioni'].map(h => (
                  <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scadenze.map(sc => {
                const p = sc.youth_players
                const cat = p?.categories
                const S = STATI[sc.stato] || STATI.da_pagare
                const Icon = S.icon
                return (
                  <tr key={sc.id} className="border-b border-[#e7eaec] hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: cat?.colore || '#1ab394' }}>
                          {(p?.nome?.[0]||'')+(p?.cognome?.[0]||'')}
                        </div>
                        <span className="text-[#2f4050] font-medium">{p?.cognome} {p?.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {cat && (
                        <span className="px-2 py-0.5 rounded text-xs text-white font-medium" style={{ background: cat.colore }}>
                          {cat.nome}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#999] text-xs">
                      {format(new Date(sc.data_scadenza), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[#2f4050]">€{Number(sc.importo).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('flex items-center gap-1 w-fit px-2 py-0.5 rounded text-xs font-medium', S.color)}>
                        <Icon size={11}/> {S.label}
                      </span>
                      {sc.stato === 'pagato' && sc.data_pagamento && (
                        <div className="text-xs text-[#999] mt-0.5">
                          {format(new Date(sc.data_pagamento), 'dd/MM/yyyy')} — {sc.metodo_pagamento}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#999]">
                      {sc.numero_ricevuta || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {sc.stato !== 'pagato' ? (
                        <button
                          onClick={() => setPayModal({ scadenza: sc, player: p })}
                          className="flex items-center gap-1 bg-[#1ab394]/10 hover:bg-[#1ab394]/20 text-[#1ab394] px-2 py-1 rounded text-xs font-semibold">
                          <Euro size={11}/> Incassa
                        </button>
                      ) : (
                        <button
                          onClick={() => generateRettaReceipt(sc, p, teamSettings)}
                          className="flex items-center gap-1 text-[#999] hover:text-[#1ab394] text-xs">
                          <Download size={13}/> PDF
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modali */}
      {payModal && (
        <PagaRettaModal
          scadenza={payModal.scadenza}
          player={payModal.player}
          teamSettings={teamSettings}
          onClose={() => setPayModal(null)}
          onSaved={() => { setPayModal(null); loadScadenze() }}
        />
      )}
      {batchModal && (
        <PagaBatchModal
          scadenze={daPagare}
          players={players}
          teamSettings={teamSettings}
          onClose={() => setBatchModal(false)}
          onSaved={() => { setBatchModal(false); loadScadenze() }}
        />
      )}
    </div>
  )
}

// ── Componente principale SCPayments ─────────────────────────
export default function SCPayments() {
  const [payments,     setPayments]     = useState([])
  const [players,      setPlayers]      = useState([])
  const [categories,   setCategories]   = useState([])
  const [configs,      setConfigs]      = useState([])
  const [receipts,     setReceipts]     = useState([])
  const [teamSettings, setTeamSettings] = useState(null)
  const [tab,          setTab]          = useState('scadenziario')  // default → scadenziario
  const [modal,        setModal]        = useState(false)
  const [configModal,  setConfigModal]  = useState(false)
  const [filterCat,    setFilterCat]    = useState('')
  const [filterStato,  setFilterStato]  = useState('')
  const [filterMese,   setFilterMese]   = useState(new Date().getMonth()+1)
  const [filterAnno,   setFilterAnno]   = useState(new Date().getFullYear())
  const [loading,      setLoading]      = useState(true)

  // Contatore rette da pagare questo mese (per badge sul tab)
  const [retteDaPagare, setRetteDaPagare] = useState(0)

  useEffect(() => {
    loadBase()
    loadRetteBadge()
  }, [])

  useEffect(() => {
    if (tab !== 'scadenziario') load()
  }, [tab, filterCat, filterStato, filterMese, filterAnno])

  async function loadBase() {
    const [{ data: pl }, { data: cat }, { data: cfg }, { data: ts }] = await Promise.all([
      supabase.from('youth_players').select('id,nome,cognome,category_id').eq('active',true).order('cognome'),
      supabase.from('categories').select('*').order('ordine'),
      supabase.from('payment_configs').select('*').eq('active',true),
      supabase.from('team_settings').select('*').single()
    ])
    setPlayers(pl||[])
    setCategories(cat||[])
    setConfigs(cfg||[])
    setTeamSettings(ts)
  }

  async function loadRetteBadge() {
    const now = new Date()
    const { count } = await supabase.from('rette_scadenze')
      .select('id', { count: 'exact' })
      .eq('mese', now.getMonth()+1).eq('anno', now.getFullYear())
      .eq('stato', 'da_pagare')
    setRetteDaPagare(count || 0)
  }

  async function load() {
    setLoading(true)
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
    const player = players.find(p=>p.id===r.youth_player_id) || r.youth_players
    generateReceipt(pay?.payment_configs, player, r, teamSettings)
  }

  const totaleDovuto   = payments.reduce((s,p)=>s+(p.importo_dovuto||0),0)
  const totalePagato   = payments.reduce((s,p)=>s+(p.importo_pagato||0),0)
  const totaleResiduo  = payments.reduce((s,p)=>s+(p.importo_residuo||0),0)
  const insoluti       = payments.filter(p=>p.stato==='scaduto').length

  return (
    <div className="space-y-4">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Pagamenti Scuola Calcio</h1>
          <p className="text-sm text-[#999] mt-1">Rette mensili, quote e ricevute</p>
        </div>
        <div className="flex gap-2">
          {tab === 'payments' && <>
            <button onClick={()=>setConfigModal(true)}
              className="border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-3 py-2 rounded text-sm">
              + Quota
            </button>
            <button onClick={()=>setModal(true)}
              className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
              <Plus size={16}/> Pagamento
            </button>
          </>}
        </div>
      </div>

      {/* KPI (solo per tab payments) */}
      {tab === 'payments' && (
        <>
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
          {insoluti > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded p-3 text-red-600 text-sm">
              <AlertTriangle size={16}/> <strong>{insoluti}</strong> pagamento/i scaduto/i
            </div>
          )}
        </>
      )}

      {/* Tab */}
      <div className="flex gap-1 border-b border-[#e7eaec]">
        {[
          ['scadenziario', '📅 Scadenziario Rette'],
          ['payments',     'Quote occasionali'],
          ['receipts',     'Ricevute'],
          ['configs',      'Quote configurate']
        ].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={clsx('flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab===v ? 'border-[#1ab394] text-[#1ab394]' : 'border-transparent text-[#999] hover:text-[#676a6c]')}>
            {l}
            {v === 'scadenziario' && retteDaPagare > 0 && (
              <span className="w-5 h-5 bg-yellow-400 text-yellow-900 text-xs rounded-full flex items-center justify-center font-bold">
                {retteDaPagare > 9 ? '9+' : retteDaPagare}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenuto tab */}
      {tab === 'scadenziario' && (
        <TabScadenziario
          players={players}
          categories={categories}
          teamSettings={teamSettings}
        />
      )}

      {tab === 'payments' && (
        <>
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
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : (
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
          )}
        </>
      )}

      {tab === 'receipts' && (
        loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
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
        )
      )}

      {tab === 'configs' && (
        <div className="space-y-2">
          {configs.length === 0 ? (
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-8 text-center text-[#999] text-sm">
              Nessuna quota configurata.
            </div>
          ) : configs.map(c=>(
            <div key={c.id} className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 flex items-center justify-between">
              <div>
                <div className="text-[#2f4050] font-semibold">{c.nome}</div>
                <div className="text-xs text-[#999] mt-1">
                  {c.tipo.charAt(0).toUpperCase()+c.tipo.slice(1)} — scadenza giorno {c.giorno_scadenza}
                </div>
              </div>
              <div className="text-[#1ab394] font-bold text-lg">€{c.importo}</div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <PaymentModal players={players} categories={categories} configs={configs}
          onClose={()=>setModal(false)} onSaved={()=>{setModal(false);load()}}/>
      )}
      {configModal && (
        <ConfigModal categories={categories}
          onClose={()=>setConfigModal(false)} onSaved={()=>{setConfigModal(false);load()}}/>
      )}
    </div>
  )
}

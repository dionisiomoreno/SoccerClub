import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  Plus, X, Download, TrendingUp, TrendingDown,
  Euro, Filter, Edit2, Trash2, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const CATEGORIE_ENTRATA = [
  'Quote SC', 'Sponsor', 'Donazione', 'Contributo comunale',
  'Proventi gare', 'Tesseramento', 'Altro'
]
const CATEGORIE_USCITA = [
  'Compenso mister', 'Compenso calciatori', 'Materiale sportivo',
  'Abbigliamento', 'Affitto campo', 'Utenze', 'Trasferte',
  'Arbitri', 'Iscrizione campionato', 'Assicurazioni',
  'Manutenzione', 'Amministrazione', 'Altro'
]
const METODI = ['contanti', 'bonifico', 'pos', 'assegno', 'altro']
const METODI_LABELS = { contanti: 'Contanti', bonifico: 'Bonifico', pos: 'POS', assegno: 'Assegno', altro: 'Altro' }

// ── Modal entry ──────────────────────────────────────────────
function EntryModal({ entry, onClose, onSaved, modulo = 'ps' }) {
  const { profile, club } = useAuth()
  const isEdit = !!entry?.id
  const [form, setForm] = useState({
    data: format(new Date(), 'yyyy-MM-dd'),
    tipo: 'entrata',
    categoria: 'Quote SC',
    descrizione: '',
    importo: '',
    metodo_pagamento: 'contanti',
    riferimento: '',
    note: '',
    ...entry
  })
  const [loading, setLoading] = useState(false)
  function set(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v }
      // Aggiorna categoria default quando cambia tipo
      if (k === 'tipo') next.categoria = v === 'entrata' ? 'Quote SC' : 'Compenso mister'
      return next
    })
  }

  async function save() {
    if (!form.descrizione) return toast.error('Descrizione obbligatoria')
    if (!form.importo || +form.importo <= 0) return toast.error('Importo non valido')
    setLoading(true)
    const payload = {
  ...form,
  importo: +form.importo,
  club_id: club?.id || profile?.club_id,
  created_by: profile?.id,
  fonte: 'manuale',
  modulo: modulo,
}
    const { error } = isEdit
      ? await supabase.from('accounting_entries').update(payload).eq('id', entry.id)
      : await supabase.from('accounting_entries').insert([payload])
    if (error) toast.error(error.message)
    else { toast.success(isEdit ? 'Movimento aggiornato' : 'Movimento registrato'); onSaved() }
    setLoading(false)
  }

  const categorie = form.tipo === 'entrata' ? CATEGORIE_ENTRATA : CATEGORIE_USCITA

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit ? 'Modifica' : 'Nuovo'} Movimento</h2>
          <button onClick={onClose}><X size={18} className="text-[#999]"/></button>
        </div>
        <div className="p-4 space-y-3">
          {/* Tipo */}
          <div className="flex gap-2">
            {[['entrata','▲ Entrata'],['uscita','▼ Uscita']].map(([v,l]) => (
              <button key={v} onClick={() => set('tipo', v)}
                className={clsx('flex-1 py-2 rounded text-sm font-semibold border transition-colors',
                  form.tipo === v
                    ? v === 'entrata'
                      ? 'bg-green-100 border-green-400 text-green-700'
                      : 'bg-red-100 border-red-400 text-red-700'
                    : 'border-[#e7eaec] text-[#999] hover:bg-gray-50')}>
                {l}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Data *</label>
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Importo (€) *</label>
              <input type="number" min="0" step="0.01" value={form.importo}
                onChange={e => set('importo', e.target.value)}
                placeholder="0.00"
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Categoria</label>
            <select value={form.categoria} onChange={e => set('categoria', e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              {categorie.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Descrizione *</label>
            <input value={form.descrizione} onChange={e => set('descrizione', e.target.value)}
              placeholder="Es. Quota mensile Marco Rossi"
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Metodo pagamento</label>
              <select value={form.metodo_pagamento} onChange={e => set('metodo_pagamento', e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                {METODI.map(m => <option key={m} value={m}>{METODI_LABELS[m]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Riferimento</label>
              <input value={form.riferimento || ''} onChange={e => set('riferimento', e.target.value)}
                placeholder="Es. RIC-001"
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Note</label>
            <textarea value={form.note || ''} onChange={e => set('note', e.target.value)} rows={2}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>

          {/* Anteprima importo */}
          {form.importo > 0 && (
            <div className={clsx('rounded p-3 text-sm font-semibold flex justify-between',
              form.tipo === 'entrata' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
              <span>{form.tipo === 'entrata' ? '▲ Entrata' : '▼ Uscita'}</span>
              <span>€{Number(form.importo).toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PDF prima nota ───────────────────────────────────────────
function generatePDF(entries, period, teamSettings, totEntrate, totUscite) {
  const doc = new jsPDF()
  doc.setFillColor(26,179,148); doc.rect(0,0,210,28,'F')
  doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text(teamSettings?.nome_squadra || 'SoccerClub', 14, 13)
  doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.text(`Prima Nota — ${period}`, 14, 22)
  doc.setTextColor(0,0,0); doc.setFontSize(10)
  doc.text(`Generato il ${format(new Date(),'dd/MM/yyyy')}`, 14, 38)

  // Riepilogo
  doc.setFillColor(245,245,245); doc.rect(14, 44, 182, 22, 'F')
  doc.setFont('helvetica','bold')
  doc.setTextColor(26,179,96)
  doc.text(`Entrate: €${totEntrate.toFixed(2)}`, 20, 52)
  doc.setTextColor(220,50,50)
  doc.text(`Uscite: €${totUscite.toFixed(2)}`, 80, 52)
  const saldo = totEntrate - totUscite
  doc.setTextColor(saldo >= 0 ? 26 : 220, saldo >= 0 ? 179 : 50, saldo >= 0 ? 96 : 50)
  doc.text(`Saldo: €${saldo.toFixed(2)}`, 150, 52)

  autoTable(doc, {
    startY: 72,
    head: [['Data','Tipo','Categoria','Descrizione','Metodo','Importo']],
    body: entries.map(e => [
      format(new Date(e.data), 'dd/MM/yyyy'),
      e.tipo === 'entrata' ? '▲ Entrata' : '▼ Uscita',
      e.categoria,
      e.descrizione,
      METODI_LABELS[e.metodo_pagamento] || e.metodo_pagamento,
      `€${Number(e.importo).toFixed(2)}`
    ]),
    headStyles: { fillColor: [26,179,148] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 18 },
      2: { cellWidth: 30 },
      3: { cellWidth: 60 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22, halign: 'right' }
    }
  })
  doc.save(`prima_nota_${period.replace(/\s/g,'_')}.pdf`)
}

// ── Componente principale ────────────────────────────────────
export default function Accounting({ modulo = 'ps' }) {
  const { profile, club } = useAuth()

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [tab, setTab] = useState('primanota')  // 'primanota' | 'bilancio'

  // Filtri
  const [filterTipo, setFilterTipo] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('mese')  // 'mese' | 'anno' | 'custom'
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterFrom, setFilterFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [filterTo, setFilterTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))

  // Dati bilancio
  const [chartData, setChartData] = useState([])
  const [teamSettings, setTeamSettings] = useState(null)

  useEffect(() => {
    supabase.from('team_settings').select('*').single().then(({ data }) => setTeamSettings(data))
  }, [])

  useEffect(() => { load() }, [filterTipo, filterCat, filterPeriod, filterMonth, filterYear, filterFrom, filterTo])
  useEffect(() => { if (tab === 'bilancio') loadChartData() }, [tab, filterYear])

  function getDateRange() {
    if (filterPeriod === 'mese') {
      const [y, m] = filterMonth.split('-')
      return {
        start: startOfMonth(new Date(+y, +m - 1)).toISOString().split('T')[0],
        end: endOfMonth(new Date(+y, +m - 1)).toISOString().split('T')[0],
        label: format(new Date(+y, +m - 1), 'MMMM yyyy', { locale: it })
      }
    }
    if (filterPeriod === 'anno') {
      return {
        start: startOfYear(new Date(filterYear, 0)).toISOString().split('T')[0],
        end: endOfYear(new Date(filterYear, 0)).toISOString().split('T')[0],
        label: `Anno ${filterYear}`
      }
    }
    return { start: filterFrom, end: filterTo, label: `${filterFrom} → ${filterTo}` }
  }

  async function load() {
    setLoading(true)
    const { start, end } = getDateRange()
    let q = supabase.from('accounting_entries')
      .select('*')
      .gte('data', start).lte('data', end)
      .order('data', { ascending: false })
    // Esclude le rette SC dalla contabilità PS
.eq('modulo', modulo)
    if (filterTipo) q = q.eq('tipo', filterTipo)
    if (filterCat) q = q.eq('categoria', filterCat)
    const { data } = await q
    setEntries(data || [])
    setLoading(false)
  }
  
  async function loadChartData() {
    const months = Array.from({ length: 12 }, (_, i) => i)
    const rows = await Promise.all(months.map(async m => {
      const start = startOfMonth(new Date(filterYear, m)).toISOString().split('T')[0]
      const end = endOfMonth(new Date(filterYear, m)).toISOString().split('T')[0]
     const { data } = await supabase.from('accounting_entries')
.select('tipo, importo, fonte').gte('data', start).lte('data', end)
.eq('modulo', modulo)
    const entrate = (data||[]).filter(e=>e.tipo==='entrata').reduce((s,e)=>s+(+e.importo),0)
    const uscite = (data||[]).filter(e=>e.tipo==='uscita').reduce((s,e)=>s+(+e.importo),0)
    const rette = (data||[]).filter(e=>e.fonte==='retta_sc').reduce((s,e)=>s+(+e.importo),0)
    return {
      name: format(new Date(filterYear, m), 'MMM', { locale: it }),
      entrate: Math.round(entrate * 100) / 100,
      uscite: Math.round(uscite * 100) / 100,
      saldo: Math.round((entrate - uscite) * 100) / 100,
      rette: Math.round(rette * 100) / 100
    }
    }))
    setChartData(rows)
  }

  async function deleteEntry(id) {
    if (!confirm('Eliminare questo movimento?')) return
    await supabase.from('accounting_entries').delete().eq('id', id)
    toast.success('Eliminato')
    load()
  }

  async function importFromSCPayments() {
    const { start, end } = getDateRange()
    const { data: receipts } = await supabase.from('payment_receipts')
      .select('*, youth_players(nome,cognome), payments(mese,anno,payment_configs(nome))')
      .gte('data_pagamento', start).lte('data_pagamento', end)
    if (!receipts?.length) return toast.error('Nessun pagamento SC nel periodo selezionato')

    let imported = 0
    for (const r of receipts) {
      // Controlla se già importato (usa numero_ricevuta come riferimento)
      const { count } = await supabase.from('accounting_entries')
        .select('id', { count: 'exact' }).eq('riferimento', r.numero_ricevuta)
      if (count > 0) continue

      await supabase.from('accounting_entries').insert([{
        club_id: club?.id || profile?.club_id,
        data: r.data_pagamento,
        tipo: 'entrata',
        categoria: 'Quote SC',
        descrizione: `${r.payments?.payment_configs?.nome || 'Quota'} — ${r.youth_players?.cognome} ${r.youth_players?.nome}`,
        importo: r.importo,
        metodo_pagamento: r.metodo_pagamento || 'contanti',
        riferimento: r.numero_ricevuta,
        fonte: 'sc_payment',
        created_by: profile?.id
      }])
      imported++
    }
    if (imported === 0) toast('Tutti i pagamenti SC erano già importati', { icon: 'ℹ️' })
    else { toast.success(`${imported} pagamenti SC importati`); load() }
  }

  const { label } = getDateRange()
  const totEntrate = entries.filter(e => e.tipo === 'entrata').reduce((s, e) => s + (+e.importo), 0)
  const totUscite  = entries.filter(e => e.tipo === 'uscita').reduce((s, e) => s + (+e.importo), 0)
  const saldo = totEntrate - totUscite

  // Riepilogo per categoria
  const byCat = entries.reduce((acc, e) => {
    if (!acc[e.categoria]) acc[e.categoria] = { entrate: 0, uscite: 0 }
    if (e.tipo === 'entrata') acc[e.categoria].entrate += +e.importo
    else acc[e.categoria].uscite += +e.importo
    return acc
  }, {})

  const allCategorie = [...new Set([...CATEGORIE_ENTRATA, ...CATEGORIE_USCITA])]

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Contabilità</h1>
          <p className="text-sm text-[#999] mt-1">Prima nota e bilancio della società</p>
        </div>
        <div className="flex gap-2">
          <button onClick={importFromSCPayments}
            className="flex items-center gap-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-3 py-2 rounded text-sm">
            <RefreshCw size={14}/> Importa SC
          </button>
          <button onClick={() => setModal({})}
            className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
            <Plus size={16}/> Movimento
          </button>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-1 border-b border-[#e7eaec]">
        {[['primanota','Prima Nota'],['bilancio','Bilancio']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={clsx('px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab===v ? 'border-[#1ab394] text-[#1ab394]' : 'border-transparent text-[#999] hover:text-[#676a6c]')}>
            {l}
          </button>
        ))}
      </div>

      {/* Filtri periodo */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 flex items-center gap-3 flex-wrap">
        <Filter size={14} className="text-[#999] flex-shrink-0"/>
        <div className="flex gap-1">
          {[['mese','Mese'],['anno','Anno'],['custom','Personalizzato']].map(([v,l]) => (
            <button key={v} onClick={() => setFilterPeriod(v)}
              className={clsx('px-3 py-1 rounded text-xs font-semibold transition-colors',
                filterPeriod===v ? 'bg-[#1ab394] text-white' : 'bg-gray-100 text-[#676a6c] hover:bg-gray-200')}>
              {l}
            </button>
          ))}
        </div>
        {filterPeriod === 'mese' && (
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="border border-[#e7eaec] rounded px-3 py-1 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
        )}
        {filterPeriod === 'anno' && (
          <input type="number" value={filterYear} onChange={e => setFilterYear(+e.target.value)}
            className="border border-[#e7eaec] rounded px-3 py-1 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] w-24"/>
        )}
        {filterPeriod === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="border border-[#e7eaec] rounded px-3 py-1 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            <span className="text-[#999] text-xs">→</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="border border-[#e7eaec] rounded px-3 py-1 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <TrendingUp size={20} className="mx-auto text-green-500 mb-2"/>
          <div className="text-2xl font-bold text-green-600">€{totEntrate.toFixed(2)}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Entrate</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <TrendingDown size={20} className="mx-auto text-red-500 mb-2"/>
          <div className="text-2xl font-bold text-red-500">€{totUscite.toFixed(2)}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Uscite</div>
        </div>
        <div className={clsx('border rounded shadow-sm p-4 text-center', saldo >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
          <Euro size={20} className={clsx('mx-auto mb-2', saldo >= 0 ? 'text-green-600' : 'text-red-600')}/>
          <div className={clsx('text-2xl font-bold', saldo >= 0 ? 'text-green-700' : 'text-red-600')}>
            {saldo >= 0 ? '+' : ''}€{saldo.toFixed(2)}
          </div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Saldo</div>
        </div>
      </div>

      {tab === 'primanota' && (
        <>
          {/* Filtri aggiuntivi */}
          <div className="flex gap-2 flex-wrap items-center justify-between">
            <div className="flex gap-2">
              <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
                className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                <option value="">Tutti i movimenti</option>
                <option value="entrata">Solo entrate</option>
                <option value="uscita">Solo uscite</option>
              </select>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                <option value="">Tutte le categorie</option>
                {allCategorie.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={() => generatePDF(entries, label, teamSettings, totEntrate, totUscite)}
              className="flex items-center gap-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-3 py-2 rounded text-sm">
              <Download size={14}/> Esporta PDF
            </button>
          </div>

          {/* Tabella movimenti */}
          <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center text-[#999] py-10 text-sm">
                Nessun movimento nel periodo selezionato
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e7eaec] bg-gray-50">
                    {['Data','Tipo','Categoria','Descrizione','Metodo','Rif.','Importo',''].map(h => (
                      <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} className="border-b border-[#e7eaec] hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-[#999] text-xs whitespace-nowrap">
                        {format(new Date(e.data), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium',
                          e.tipo === 'entrata' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
                          {e.tipo === 'entrata' ? '▲ Entrata' : '▼ Uscita'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#999]">{e.categoria}</td>
                      <td className="px-4 py-3 text-[#2f4050] font-medium max-w-xs">
                        <div className="truncate">{e.descrizione}</div>
                        {e.note && <div className="text-xs text-[#999] truncate italic">{e.note}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#999] capitalize">
                        {METODI_LABELS[e.metodo_pagamento] || e.metodo_pagamento}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#999] font-mono">{e.riferimento || '—'}</td>
                      <td className={clsx('px-4 py-3 font-bold whitespace-nowrap',
                        e.tipo === 'entrata' ? 'text-green-600' : 'text-red-500')}>
                        {e.tipo === 'entrata' ? '+' : '-'}€{Number(e.importo).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {e.fonte === 'manuale' && (
                          <div className="flex gap-1">
                            <button onClick={() => setModal(e)} className="text-[#999] hover:text-[#1c84c6]"><Edit2 size={14}/></button>
                            <button onClick={() => deleteEntry(e.id)} className="text-[#999] hover:text-red-500"><Trash2 size={14}/></button>
                          </div>
                        )}
                        {e.fonte !== 'manuale' && (
                          <span className="text-xs text-[#999] bg-gray-100 px-1.5 py-0.5 rounded">auto</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Totali */}
                  <tr className="bg-gray-50 font-semibold border-t-2 border-[#e7eaec]">
                    <td colSpan={6} className="px-4 py-3 text-xs text-[#999] uppercase tracking-wide">Totale periodo</td>
                    <td className="px-4 py-3">
                      <div className="text-green-600 text-xs">+€{totEntrate.toFixed(2)}</div>
                      <div className="text-red-500 text-xs">-€{totUscite.toFixed(2)}</div>
                      <div className={clsx('text-sm font-bold', saldo >= 0 ? 'text-green-700' : 'text-red-600')}>
                        {saldo >= 0 ? '+' : ''}€{saldo.toFixed(2)}
                      </div>
                    </td>
                    <td/>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Riepilogo per categoria */}
          {Object.keys(byCat).length > 0 && (
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide mb-3">Riepilogo per categoria</h3>
              <div className="space-y-2">
                {Object.entries(byCat).map(([cat, vals]) => (
                  <div key={cat} className="flex items-center justify-between py-2 border-b border-[#e7eaec] last:border-0">
                    <span className="text-sm text-[#676a6c]">{cat}</span>
                    <div className="flex gap-4 text-sm">
                      {vals.entrate > 0 && <span className="text-green-600 font-medium">+€{vals.entrate.toFixed(2)}</span>}
                      {vals.uscite > 0 && <span className="text-red-500 font-medium">-€{vals.uscite.toFixed(2)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'bilancio' && (
        <div className="space-y-4">
          {/* Selettore anno */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#999]">Anno:</span>
            <div className="flex gap-1">
              {[2024,2025,2026].map(y => (
                <button key={y} onClick={() => setFilterYear(y)}
                  className={clsx('px-3 py-1 rounded text-sm font-medium transition-colors',
                    filterYear===y ? 'bg-[#1ab394] text-white' : 'bg-white border border-[#e7eaec] text-[#676a6c] hover:border-[#1ab394]')}>
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Grafico entrate/uscite mensili */}
          <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4">
            <h3 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide mb-4">Entrate vs Uscite — {filterYear}</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barGap={2}>
                <XAxis dataKey="name" tick={{ fill: '#999', fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#999', fontSize: 11 }} axisLine={false} tickLine={false}/>
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e7eaec', borderRadius: 4, fontSize: 12 }}
                  formatter={(val, name) => [`€${val.toFixed(2)}`, name === 'entrate' ? 'Entrate' : 'Uscite']}
                />
                <Bar dataKey="entrate" fill="#1ab394" radius={[2,2,0,0]} name="entrate"/>
                <Bar dataKey="uscite" fill="#ed5565" radius={[2,2,0,0]} name="uscite"/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Grafico saldo mensile */}
          <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4">
            <h3 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide mb-4">Saldo mensile — {filterYear}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: '#999', fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#999', fontSize: 11 }} axisLine={false} tickLine={false}/>
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e7eaec', borderRadius: 4, fontSize: 12 }}
                  formatter={(val) => [`€${val.toFixed(2)}`, 'Saldo']}
                />
                <Bar dataKey="saldo" radius={[2,2,0,0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.saldo >= 0 ? '#1ab394' : '#ed5565'}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabella riepilogo annuale */}
          <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e7eaec]">
              <h3 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide">Riepilogo mensile {filterYear}</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e7eaec] bg-gray-50">
                  {(modulo === 'sc' ? ['Mese','Rette incassate','Entrate','Uscite','Saldo'] : ['Mese','Entrate','Uscite','Saldo']).map(h => (
                    <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, i) => (
                  <tr key={i} className="border-b border-[#e7eaec] hover:bg-gray-50">
                    <td className="px-4 py-3 text-[#2f4050] font-medium capitalize">{row.name}</td>
                    {modulo === 'sc' && (
                      <td className="px-4 py-3 text-blue-600 font-medium">€{row.rette.toFixed(2)}</td>
                    )}
                    <td className="px-4 py-3 text-green-600 font-medium">€{row.entrate.toFixed(2)}</td>
                    <td className="px-4 py-3 text-red-500 font-medium">€{row.uscite.toFixed(2)}</td>
                    <td className={clsx('px-4 py-3 font-bold', row.saldo >= 0 ? 'text-green-700' : 'text-red-600')}>
                      {row.saldo >= 0 ? '+' : ''}€{row.saldo.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {/* Totale anno */}
                <tr className="bg-gray-50 font-bold border-t-2 border-[#e7eaec]">
                  <td className="px-4 py-3 text-[#2f4050]">Totale anno</td>
                  {modulo === 'sc' && (
                    <td className="px-4 py-3 text-blue-600">€{chartData.reduce((s,r)=>s+r.rette,0).toFixed(2)}</td>
                  )}
                  <td className="px-4 py-3 text-green-600">€{chartData.reduce((s,r)=>s+r.entrate,0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-red-500">€{chartData.reduce((s,r)=>s+r.uscite,0).toFixed(2)}</td>
                  <td className={clsx('px-4 py-3',
                    chartData.reduce((s,r)=>s+r.saldo,0) >= 0 ? 'text-green-700' : 'text-red-600')}>
                    {chartData.reduce((s,r)=>s+r.saldo,0) >= 0 ? '+' : ''}€{chartData.reduce((s,r)=>s+r.saldo,0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal !== null && (
  <EntryModal entry={modal} modulo={modulo} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }}/>
)}
    </div>
  )
}

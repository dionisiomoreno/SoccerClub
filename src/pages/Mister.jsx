import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Edit2, Download, Plus, X, Euro } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const YEARS = [2024, 2025, 2026]

function generateMisterPDF(payslip, mister, teamSettings) {
  const doc = new jsPDF()
  doc.setFillColor(26, 179, 148)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(teamSettings?.nome_squadra || 'SoccerClub', 14, 13)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(teamSettings?.citta || 'ASD Castelmauro Calcio 1986', 14, 22)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`Cedolino Mister — ${MONTHS[payslip.month - 1]} ${payslip.year}`, 14, 45)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Allenatore: ${mister?.cognome} ${mister?.nome}`, 14, 55)
  doc.text(`Generato il: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 62)
  autoTable(doc, {
    startY: 72,
    head: [['Voce', 'Importo']],
    body: [
      ['Compenso fisso mensile', `€${payslip.compenso}`],
      ...(payslip.note ? [['Note', payslip.note]] : [])
    ],
    headStyles: { fillColor: [26, 179, 148] },
    styles: { fontSize: 10 }
  })
  const y = doc.lastAutoTable.finalY + 15
  doc.setFillColor(245, 245, 245)
  doc.rect(14, y, 182, 24, 'F')
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(26, 179, 148)
  doc.text(`Totale netto: €${payslip.compenso}`, 20, y + 15)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Firma: ______________________', 120, y + 15)
  doc.save(`cedolino_mister_${mister?.cognome}_${MONTHS[payslip.month - 1]}_${payslip.year}.pdf`)
}

// ── Modal crea/modifica mister ────────────────────────────────
function MisterModal({ mister, onClose, onSaved }) {
  const { profile } = useAuth()
  const isEdit = !!mister?.id
  const [form, setForm] = useState({
    nome: '', cognome: '', email: '', telefono: '',
    codice_fiscale: '', numero_patente: '', numero_tessera: '',
    data_visita_medica: '', scadenza_visita_medica: '',
    compenso_fisso: '', taglia: 'M', active: true,
    ...mister
  })
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.nome || !form.cognome) return toast.error('Nome e cognome obbligatori')
    setLoading(true)
    try {
      if (isEdit) {
        const { error } = await supabase.from('profiles').update({
          nome: form.nome, cognome: form.cognome, telefono: form.telefono,
          codice_fiscale: form.codice_fiscale, numero_patente: form.numero_patente,
          numero_tessera: form.numero_tessera,
          data_visita_medica: form.data_visita_medica || null,
          scadenza_visita_medica: form.scadenza_visita_medica || null,
          compenso_fisso: form.compenso_fisso !== '' ? +form.compenso_fisso : null,
          taglia: form.taglia, active: form.active,
        }).eq('id', form.id)
        if (error) throw new Error(error.message)
        toast.success('Mister aggiornato')
      } else {
        if (!form.email) return toast.error('Email obbligatoria')
        if (password.length < 8) return toast.error('Password minimo 8 caratteri')
        const { data: authData, error: authError } = await supabase.auth.signUp({ email: form.email, password })
        if (authError) throw new Error('Errore creazione account: ' + authError.message)
        const userId = authData.user?.id
        if (!userId) throw new Error('ID utente non disponibile')
        const { error: profileError } = await supabase.from('profiles').upsert([{
          id: userId,
          club_id: profile?.club_id,
          role: 'mister',
          category_id: null, // mister PS — senza categoria
          nome: form.nome, cognome: form.cognome, email: form.email,
          telefono: form.telefono, codice_fiscale: form.codice_fiscale,
          numero_patente: form.numero_patente, numero_tessera: form.numero_tessera,
          data_visita_medica: form.data_visita_medica || null,
          scadenza_visita_medica: form.scadenza_visita_medica || null,
          compenso_fisso: form.compenso_fisso !== '' ? +form.compenso_fisso : null,
          taglia: form.taglia, active: form.active,
        }])
        if (profileError) throw new Error('Errore profilo: ' + profileError.message)
        toast.success('Mister aggiunto! Può accedere con email e password impostate.')
      }
      onSaved()
    } catch(e) { toast.error(e.message) }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit ? 'Modifica' : 'Nuovo'} Mister PS</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[['nome','Nome *'],['cognome','Cognome *']].map(([k,l]) => (
              <div key={k}>
                <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">{l}</label>
                <input value={form[k]||''} onChange={e=>set(k,e.target.value)}
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
              </div>
            ))}
          </div>

          {/* Email solo in creazione */}
          {!isEdit && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Email *</label>
                <input type="email" value={form.email||''} onChange={e=>set('email',e.target.value)}
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Password *</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="Minimo 8 caratteri"
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                {password && password.length < 8 && <p className="text-xs text-red-400 mt-1">Minimo 8 caratteri</p>}
              </div>
            </>
          )}

          {[['telefono','Telefono'],['codice_fiscale','Codice fiscale'],['numero_patente','N° patente'],['numero_tessera','N° tessera FIGC']].map(([k,l]) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">{l}</label>
              <input value={form[k]||''} onChange={e=>set(k,e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          ))}

          {/* Visita medica */}
          <div className="border-t border-[#e7eaec] pt-3">
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-2">Visita medica</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-[#999] mb-1">Data visita</label>
                <input type="date" value={form.data_visita_medica||''} onChange={e=>set('data_visita_medica',e.target.value)}
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">Scadenza</label>
                <input type="date" value={form.scadenza_visita_medica||''} onChange={e=>set('scadenza_visita_medica',e.target.value)}
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
              </div>
            </div>
          </div>

          {/* Compenso */}
          <div className="border-t border-[#e7eaec] pt-3">
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-2">Compenso</label>
            <div>
              <label className="block text-xs text-[#999] mb-1">Compenso fisso mensile (€)</label>
              <input type="number" min="0" value={form.compenso_fisso||''} onChange={e=>set('compenso_fisso', +e.target.value)}
                placeholder="Es. 500"
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e=>set('active',e.target.checked)} className="accent-[#1ab394]"/>
            <span className="text-sm text-[#676a6c]">Attivo</span>
          </label>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal cedolino ────────────────────────────────────────────
function PayslipModal({ mister, onClose, onSaved, teamSettings }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    compenso: mister?.compenso_fisso || 0,
    note: ''
  })
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    const { data: ps, error } = await supabase.from('coach_payslips')
      .upsert([{ player_id: mister.id, club_id: profile?.club_id, ...form }], { onConflict: 'player_id,month,year' })
      .select().single()
    if (error) { toast.error(error.message); setLoading(false); return }
    await supabase.from('notifications').insert([{
      user_id: mister.id, type: 'payslip_generated',
      message: `Cedolino ${MONTHS[form.month - 1]} ${form.year} disponibile — €${form.compenso}`, read: false
    }])
    generateMisterPDF({ ...form }, mister, teamSettings)
    toast.success('Cedolino generato!')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Genera Cedolino Mister</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-[#1ab394]/5 border border-[#1ab394]/20 rounded p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1ab394]/20 text-[#1ab394] flex items-center justify-center font-bold flex-shrink-0">
              {(mister?.nome?.[0]||'')+(mister?.cognome?.[0]||'')}
            </div>
            <div>
              <div className="text-[#2f4050] font-semibold text-sm">{mister?.cognome} {mister?.nome}</div>
              <div className="text-[#999] text-xs">Mister PS</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Mese</label>
              <select value={form.month} onChange={e => setForm(f => ({ ...f, month: +e.target.value }))}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Anno</label>
              <select value={form.year} onChange={e => setForm(f => ({ ...f, year: +e.target.value }))}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                {YEARS.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Compenso (€)</label>
            <input type="number" min="0" value={form.compenso} onChange={e => setForm(f => ({ ...f, compenso: +e.target.value }))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            {mister?.compenso_fisso && (
              <p className="text-xs text-[#999] mt-1">Compenso fisso configurato: €{mister.compenso_fisso}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Note</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"
              placeholder="Eventuali note sul cedolino..."/>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-3 flex justify-between items-center">
            <span className="text-sm text-[#676a6c]">Totale netto</span>
            <span className="text-[#1ab394] font-bold text-lg">€{form.compenso}</span>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Generando...' : 'Genera PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────
export default function Mister() {
  const [misters, setMisters] = useState([])
  const [payslips, setPayslips] = useState([])
  const [teamSettings, setTeamSettings] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [payslipModal, setPayslipModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('anagrafica')

  useEffect(() => { load() }, [tab])

  async function load() {
    setLoading(true)
    const [{ data: m }, { data: ts }] = await Promise.all([
      // Solo mister PS: category_id deve essere NULL
      supabase.from('profiles').select('*').eq('role', 'mister').is('category_id', null).order('cognome'),
      supabase.from('team_settings').select('*').single()
    ])
    setMisters(m || [])
    setTeamSettings(ts)
    if (tab === 'cedolini') {
      const { data: ps } = await supabase.from('coach_payslips')
        .select('*, profiles(nome,cognome)')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
      setPayslips(ps || [])
    }
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Gestione Mister</h1>
          <p className="text-sm text-[#999] mt-1">Anagrafica e cedolini dello staff tecnico PS</p>
        </div>
        {tab === 'anagrafica' && (
          <button onClick={() => setEditModal({})}
            className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
            <Plus size={16}/> Nuovo Mister
          </button>
        )}
      </div>

      {/* Tab */}
      <div className="flex gap-1 border-b border-[#e7eaec]">
        {[['anagrafica','Anagrafica'],['cedolini','Cedolini']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={clsx('px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === v ? 'border-[#1ab394] text-[#1ab394]' : 'border-transparent text-[#999] hover:text-[#676a6c]')}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : tab === 'anagrafica' ? (
        <div className="space-y-3">
          {misters.length === 0 ? (
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-8 text-center text-[#999] text-sm">
              Nessun mister PS trovato. Clicca "Nuovo Mister" per aggiungerne uno.
            </div>
          ) : misters.map(m => (
            <div key={m.id} className="bg-white border border-[#e7eaec] rounded shadow-sm p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
                    {(m.nome?.[0]||'')+(m.cognome?.[0]||'')}
                  </div>
                  <div>
                    <div className="text-[#2f4050] font-bold text-lg">{m.cognome} {m.nome}</div>
                    <div className="text-[#999] text-sm">{m.email}</div>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-600 font-medium">Mister PS</span>
                      <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', m.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500')}>
                        {m.active ? 'Attivo' : 'Non attivo'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPayslipModal(m)}
                    className="flex items-center gap-1 bg-[#1ab394] hover:bg-[#18a689] text-white px-3 py-1.5 rounded text-xs font-semibold">
                    <Euro size={13}/> Cedolino
                  </button>
                  <button onClick={() => setEditModal(m)}
                    className="flex items-center gap-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-3 py-1.5 rounded text-xs">
                    <Edit2 size={13}/> Modifica
                  </button>
                </div>
              </div>

              {/* Dettagli */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-[#e7eaec]">
                {[
                  ['Telefono', m.telefono],
                  ['Codice fiscale', m.codice_fiscale],
                  ['N° patente', m.numero_patente],
                  ['N° tessera FIGC', m.numero_tessera],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="text-xs text-[#999]">{l}</div>
                    <div className="text-[#2f4050] text-sm font-medium">{v || '—'}</div>
                  </div>
                ))}
              </div>

              {/* Visita medica */}
              <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-[#e7eaec]">
                <div>
                  <div className="text-xs text-[#999]">Data visita medica</div>
                  <div className="text-[#2f4050] text-sm font-medium">
                    {m.data_visita_medica ? format(new Date(m.data_visita_medica), 'dd/MM/yyyy') : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#999]">Scadenza visita</div>
                  <div className="text-[#2f4050] text-sm font-medium">
                    {m.scadenza_visita_medica ? format(new Date(m.scadenza_visita_medica), 'dd/MM/yyyy') : '—'}
                  </div>
                </div>
              </div>

              {/* Compenso */}
              <div className="mt-3 pt-3 border-t border-[#e7eaec]">
                <div className="flex items-center gap-2">
                  <Euro size={14} className="text-[#1ab394]"/>
                  <span className="text-xs text-[#999]">Compenso fisso mensile:</span>
                  <span className="text-[#1ab394] font-bold">
                    {m.compenso_fisso ? `€${m.compenso_fisso}` : 'Non configurato'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Cedolini */
        <div className="space-y-3">
          <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
            {payslips.length === 0 ? (
              <div className="text-center text-[#999] py-10 text-sm">Nessun cedolino generato</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e7eaec] bg-gray-50">
                    <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Mister</th>
                    <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Periodo</th>
                    <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Compenso</th>
                    <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Note</th>
                    <th className="px-4 py-3"/>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map(p => (
                    <tr key={p.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                      <td className="px-4 py-3 text-[#2f4050] font-medium">{p.profiles?.cognome} {p.profiles?.nome}</td>
                      <td className="px-4 py-3 text-[#999]">{MONTHS[p.month - 1]} {p.year}</td>
                      <td className="px-4 py-3 text-[#1ab394] font-bold">€{p.compenso}</td>
                      <td className="px-4 py-3 text-[#999] text-xs">{p.note || '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => {
                          const mister = misters.find(m => m.id === p.player_id)
                          generateMisterPDF(p, mister || p.profiles, teamSettings)
                        }} className="text-[#999] hover:text-[#1ab394] flex items-center gap-1 text-xs">
                          <Download size={13}/> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {editModal !== null && (
        <MisterModal mister={editModal} onClose={() => setEditModal(null)} onSaved={() => { setEditModal(null); load() }}/>
      )}
      {payslipModal && (
        <PayslipModal mister={payslipModal} teamSettings={teamSettings} onClose={() => setPayslipModal(null)} onSaved={() => { setPayslipModal(null); load() }}/>
      )}
    </div>
  )
}

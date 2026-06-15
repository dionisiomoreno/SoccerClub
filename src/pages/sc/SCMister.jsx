import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { UserCog, Plus, Edit2, X, Check, Trash2, Euro, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { registraCedolinoInContabilita } from '../../lib/contabilitaHelper'

const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const YEARS = [2024, 2025, 2026]

// ── PDF cedolino mister SC ───────────────────────────────────
function generateMisterPDF(payslip, mister, teamSettings) {
  const doc = new jsPDF()
  doc.setFillColor(39, 174, 96)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18); doc.setFont('helvetica', 'bold')
  doc.text(teamSettings?.nome_squadra || 'SoccerClub', 14, 13)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text(teamSettings?.citta || '', 14, 22)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14); doc.setFont('helvetica', 'bold')
  doc.text(`Cedolino Mister SC — ${MONTHS[payslip.month - 1]} ${payslip.year}`, 14, 45)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text(`Allenatore: ${mister?.cognome} ${mister?.nome}`, 14, 55)
  doc.text(`Categoria: ${mister?.categories?.nome || '—'}`, 14, 62)
  doc.text(`Generato il: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 69)

  autoTable(doc, {
    startY: 78,
    head: [['Voce', 'Importo']],
    body: [
      ['Compenso fisso mensile', `€${payslip.compenso}`],
      ...(payslip.note ? [['Note', payslip.note]] : [])
    ],
    headStyles: { fillColor: [39, 174, 96] },
    styles: { fontSize: 10 }
  })

  const y = doc.lastAutoTable.finalY + 15
  doc.setFillColor(245, 245, 245)
  doc.rect(14, y, 182, 24, 'F')
  doc.setFontSize(12); doc.setFont('helvetica', 'bold')
  doc.setTextColor(39, 174, 96)
  doc.text(`Totale netto: €${payslip.compenso}`, 20, y + 15)
  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text('Firma: ______________________', 120, y + 15)
  doc.save(`cedolino_misterSC_${mister?.cognome}_${MONTHS[payslip.month - 1]}_${payslip.year}.pdf`)
}

// ── Modal modifica mister ────────────────────────────────────
function MisterModal({ mister, categories, onClose, onSaved }) {
  const { profile } = useAuth()
  const isEdit = !!mister?.id
  const [form, setForm] = useState({
    nome: '', cognome: '', email: '', telefono: '',
    codice_fiscale: '', numero_patente: '', numero_tessera: '',
    compenso_fisso: '', taglia: 'M', active: true,
    category_id: '',
    ...mister,
    category_id: mister?.category_id || '',
  })
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.nome || !form.cognome) return toast.error('Nome e cognome obbligatori')
    if (!isEdit && !form.email) return toast.error('Email obbligatoria')
    if (!isEdit && password.length < 8) return toast.error('Password minimo 8 caratteri')
    setLoading(true)
    try {
      if (isEdit) {
        const { error } = await supabase.from('profiles').update({
          nome: form.nome, cognome: form.cognome, telefono: form.telefono,
          codice_fiscale: form.codice_fiscale, numero_patente: form.numero_patente,
          numero_tessera: form.numero_tessera,
          compenso_fisso: form.compenso_fisso !== '' ? +form.compenso_fisso : null,
          taglia: form.taglia, active: form.active,
          category_id: form.category_id || null,
        }).eq('id', form.id)
        if (error) throw new Error(error.message)
        toast.success('Mister aggiornato')
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email: form.email, password })
        if (authError) throw new Error('Errore creazione account: ' + authError.message)
        const userId = authData.user?.id
        if (!userId) throw new Error('ID utente non disponibile')
        const { error: profileError } = await supabase.from('profiles').upsert([{
          id: userId, club_id: profile?.club_id, role: 'mister',
          nome: form.nome, cognome: form.cognome, email: form.email,
          telefono: form.telefono, codice_fiscale: form.codice_fiscale,
          numero_patente: form.numero_patente, numero_tessera: form.numero_tessera,
          compenso_fisso: form.compenso_fisso !== '' ? +form.compenso_fisso : null,
          taglia: form.taglia, active: form.active,
          category_id: form.category_id || null,
        }])
        if (profileError) throw new Error('Errore profilo: ' + profileError.message)
        toast.success('Mister aggiunto!')
      }
      onSaved()
    } catch(e) { toast.error(e.message) }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit ? 'Modifica' : 'Nuovo'} Mister SC</h2>
          <button onClick={onClose}><X size={18} className="text-[#999]"/></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[['nome','Nome *'],['cognome','Cognome *']].map(([k,l]) => (
              <div key={k}>
                <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">{l}</label>
                <input value={form[k]||''} onChange={e=>set(k,e.target.value)}
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]"/>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Email *</label>
            <input type="email" value={form.email||''} onChange={e=>set('email',e.target.value)}
              disabled={isEdit}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60] disabled:opacity-50 disabled:bg-gray-50"/>
          </div>
          {!isEdit && (
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Password *</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="Minimo 8 caratteri"
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]"/>
            </div>
          )}
          {[['telefono','Telefono'],['codice_fiscale','Codice fiscale'],['numero_patente','N° patente'],['numero_tessera','N° tessera FIGC']].map(([k,l]) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">{l}</label>
              <input value={form[k]||''} onChange={e=>set(k,e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]"/>
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Compenso fisso mensile (€)</label>
            <input type="number" min="0" value={form.compenso_fisso||''} onChange={e=>set('compenso_fisso',e.target.value)}
              placeholder="Es. 300"
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Categoria SC</label>
            <select value={form.category_id} onChange={e=>set('category_id',e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]">
              <option value="">— Seleziona categoria —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e=>set('active',e.target.checked)} className="accent-[#27ae60]"/>
            <span className="text-sm text-[#676a6c]">Attivo</span>
          </label>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-[#27ae60] hover:bg-[#229954] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal cedolino mister SC ─────────────────────────────────
function PayslipModal({ mister, teamSettings, onClose, onSaved }) {
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
      .upsert([{ player_id: mister.id, ...form }], { onConflict: 'player_id,month,year' })
      .select().single()
    if (error) { toast.error(error.message); setLoading(false); return }
    await supabase.from('notifications').insert([{
      user_id: mister.id, type: 'payslip_generated',
      message: `Cedolino ${MONTHS[form.month - 1]} ${form.year} — €${form.compenso}`, read: false
    }])
    generateMisterPDF({ ...form }, mister, teamSettings)
    if (form.compenso > 0) {
  await registraCedolinoInContabilita({
    club_id:    profile?.club_id,
    created_by: profile?.id,
    modulo:     'sc',
    tipo:       'mister_sc',
    cognome:    mister?.cognome || '',
    nome:       mister?.nome || '',
    importo:    form.compenso,
    month:      form.month,
    year:       form.year,
    riferimento: `CED-SC-${ps.id?.slice(0,8)}`,
  })
}   
    toast.success('Cedolino generato!')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Genera Cedolino Mister SC</h2>
          <button onClick={onClose}><X size={18} className="text-[#999]"/></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-[#27ae60]/5 border border-[#27ae60]/20 rounded p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#27ae60]/20 text-[#27ae60] flex items-center justify-center font-bold flex-shrink-0">
              {(mister?.nome?.[0]||'')+(mister?.cognome?.[0]||'')}
            </div>
            <div>
              <div className="text-[#2f4050] font-semibold text-sm">{mister?.cognome} {mister?.nome}</div>
              <div className="text-[#999] text-xs">{mister?.categories?.nome || 'Mister SC'}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Mese</label>
              <select value={form.month} onChange={e=>setForm(f=>({...f,month:+e.target.value}))}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]">
                {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Anno</label>
              <select value={form.year} onChange={e=>setForm(f=>({...f,year:+e.target.value}))}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]">
                {YEARS.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Compenso (€)</label>
            <input type="number" min="0" value={form.compenso}
              onChange={e=>setForm(f=>({...f,compenso:+e.target.value}))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]"/>
            {mister?.compenso_fisso && (
              <p className="text-xs text-[#999] mt-1">Compenso configurato: €{mister.compenso_fisso}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Note</label>
            <textarea value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={2}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60] resize-none"
              placeholder="Eventuali note..."/>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-3 flex justify-between items-center">
            <span className="text-sm text-[#676a6c]">Totale netto</span>
            <span className="text-[#27ae60] font-bold text-lg">€{form.compenso}</span>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-[#27ae60] hover:bg-[#229954] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Generando...' : 'Genera PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principale ────────────────────────────────────
export default function SCMister() {
  const [misters, setMisters] = useState([])
  const [payslips, setPayslips] = useState([])
  const [categories, setCategories] = useState([])
  const [teamSettings, setTeamSettings] = useState(null)
  const [tab, setTab] = useState('anagrafica')
  const [editModal, setEditModal] = useState(null)
  const [payslipModal, setPayslipModal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [tab])

 async function load() {
  setLoading(true)
  const [{ data: c }, { data: ts }] = await Promise.all([
    supabase.from('categories').select('*').order('ordine'),
    supabase.from('team_settings').select('*').single()
  ])
  setCategories(c || [])
  setTeamSettings(ts)

  const { data: m } = await supabase.from('profiles')
    .select('*').eq('role', 'mister')
    .not('category_id', 'is', null).order('cognome')

  // Arricchisci con la categoria
  const enriched = (m || []).map(mister => ({
    ...mister,
    categories: (c || []).find(cat => cat.id === mister.category_id) || null
  }))
  setMisters(enriched)

  if (tab === 'cedolini') {
    const { data: ps } = await supabase.from('coach_payslips')
      .select('*, profiles(nome,cognome,category_id)')
      .in('player_id', (m||[]).map(x => x.id))
      .order('year', { ascending: false })
      .order('month', { ascending: false })
    // Arricchisci cedolini con categoria
    const enrichedPs = (ps || []).map(p => ({
      ...p,
      profiles: p.profiles ? {
        ...p.profiles,
        categories: (c || []).find(cat => cat.id === p.profiles.category_id) || null
      } : null
    }))
    setPayslips(enrichedPs)
  }
  setLoading(false)
}

  async function deleteMister(m) {
    if (!confirm(`Eliminare ${m.nome} ${m.cognome}?`)) return
    await supabase.from('profiles').delete().eq('id', m.id)
    toast.success('Mister eliminato')
    load()
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Mister SC</h1>
          <p className="text-sm text-[#999] mt-1">Anagrafica e cedolini mister Scuola Calcio</p>
        </div>
        {tab === 'anagrafica' && (
          <button onClick={() => setEditModal({})}
            className="flex items-center gap-2 bg-[#27ae60] hover:bg-[#229954] text-white px-4 py-2 rounded text-sm font-semibold">
            <Plus size={16}/> Nuovo mister
          </button>
        )}
      </div>

      {/* Tab */}
      <div className="flex gap-1 border-b border-[#e7eaec]">
        {[['anagrafica','Anagrafica'],['cedolini','Cedolini']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={clsx('px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab===v ? 'border-[#27ae60] text-[#27ae60]' : 'border-transparent text-[#999] hover:text-[#676a6c]')}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[#27ae60] border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : tab === 'anagrafica' ? (

        /* ── ANAGRAFICA ── */
        <div className="space-y-3">
          {/* Riepilogo categorie */}
          {categories.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.map(cat => {
                const misterCat = misters.find(m => m.category_id === cat.id)
                return (
                  <div key={cat.id} className="bg-white border border-[#e7eaec] rounded shadow-sm p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.colore }}/>
                      <span className="text-xs font-semibold text-[#2f4050]">{cat.nome}</span>
                    </div>
                    {misterCat ? (
                      <div className="text-xs text-[#27ae60] font-medium flex items-center gap-1">
                        <Check size={11}/> {misterCat.cognome} {misterCat.nome}
                      </div>
                    ) : (
                      <div className="text-xs text-[#999]">Nessun mister</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {misters.length === 0 ? (
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-8 text-center">
              <UserCog size={32} className="mx-auto text-[#999] mb-2"/>
              <p className="text-[#999] text-sm">Nessun mister SC trovato.</p>
            </div>
          ) : misters.map(m => (
            <div key={m.id} className="bg-white border border-[#e7eaec] rounded shadow-sm p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                    style={{ background: m.categories?.colore || '#27ae60' }}>
                    {(m.nome?.[0]||'')+(m.cognome?.[0]||'')}
                  </div>
                  <div>
                    <div className="text-[#2f4050] font-bold text-lg">{m.cognome} {m.nome}</div>
                    <div className="text-[#999] text-sm">{m.email}</div>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {m.categories && (
                        <span className="px-2 py-0.5 rounded text-xs text-white font-medium"
                          style={{ background: m.categories.colore }}>
                          {m.categories.nome}
                        </span>
                      )}
                      <span className={clsx('px-2 py-0.5 rounded text-xs font-medium',
                        m.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500')}>
                        {m.active ? 'Attivo' : 'Non attivo'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPayslipModal(m)}
                    className="flex items-center gap-1 bg-[#27ae60] hover:bg-[#229954] text-white px-3 py-1.5 rounded text-xs font-semibold">
                    <Euro size={13}/> Cedolino
                  </button>
                  <button onClick={() => setEditModal(m)}
                    className="flex items-center gap-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-3 py-1.5 rounded text-xs">
                    <Edit2 size={13}/> Modifica
                  </button>
                  <button onClick={() => deleteMister(m)}
                    className="text-[#999] hover:text-red-500 p-1.5">
                    <Trash2 size={15}/>
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
                ].map(([l,v]) => (
                  <div key={l}>
                    <div className="text-xs text-[#999]">{l}</div>
                    <div className="text-[#2f4050] text-sm font-medium">{v||'—'}</div>
                  </div>
                ))}
              </div>

              {/* Compenso */}
              <div className="mt-3 pt-3 border-t border-[#e7eaec]">
                <div className="flex items-center gap-2">
                  <Euro size={14} className="text-[#27ae60]"/>
                  <span className="text-xs text-[#999]">Compenso fisso mensile:</span>
                  <span className="text-[#27ae60] font-bold">
                    {m.compenso_fisso ? `€${m.compenso_fisso}` : 'Non configurato'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

      ) : (

        /* ── CEDOLINI ── */
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
          {payslips.length === 0 ? (
            <div className="text-center text-[#999] py-10 text-sm">Nessun cedolino generato</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e7eaec] bg-gray-50">
                  {['Mister','Categoria','Periodo','Compenso','Note',''].map(h => (
                    <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payslips.map(p => (
                  <tr key={p.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                    <td className="px-4 py-3 text-[#2f4050] font-medium">{p.profiles?.cognome} {p.profiles?.nome}</td>
                    <td className="px-4 py-3 text-[#999] text-xs">{p.profiles?.categories?.nome || '—'}</td>
                    <td className="px-4 py-3 text-[#999]">{MONTHS[p.month-1]} {p.year}</td>
                    <td className="px-4 py-3 text-[#27ae60] font-bold">€{p.compenso}</td>
                    <td className="px-4 py-3 text-[#999] text-xs">{p.note||'—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => {
                        const mister = misters.find(m => m.id === p.player_id) || p.profiles
                        generateMisterPDF(p, mister, teamSettings)
                      }} className="text-[#999] hover:text-[#27ae60] flex items-center gap-1 text-xs">
                        <Download size={13}/> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {editModal !== null && (
        <MisterModal mister={editModal} categories={categories}
          onClose={() => setEditModal(null)} onSaved={() => { setEditModal(null); load() }}/>
      )}
      {payslipModal && (
        <PayslipModal mister={payslipModal} teamSettings={teamSettings}
          onClose={() => setPayslipModal(null)} onSaved={() => { setPayslipModal(null); load() }}/>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Download, Plus, Fuel } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { registraCedolinoInContabilita } from '../lib/contabilitaHelper'

const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const YEARS = [2024, 2025, 2026]

function generatePDF(payslip, player, attendances, sanctions, teamSettings) {
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
  doc.text(`Cedolino — ${MONTHS[payslip.month - 1]} ${payslip.year}`, 14, 45)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Calciatore: ${player?.cognome} ${player?.nome}`, 14, 55)
  doc.text(`Generato il: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 62)

  autoTable(doc, {
    startY: 72,
    head: [['Tipo', 'Data', 'Base', 'Carburante', 'Totale']],
    body: attendances.map(a => [
      a.type === 'training' ? 'Allenamento' : 'Partita',
      format(new Date(a.date), 'dd/MM/yyyy'),
      `€${a.amount}`,
      a.rimborso_carburante > 0 ? `€${a.rimborso_carburante}` : '—',
      `€${(a.amount || 0) + (a.rimborso_carburante || 0)}`
    ]),
    headStyles: { fillColor: [26, 179, 148] },
    styles: { fontSize: 9 }
  })

  if (sanctions.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Sanzione', 'Data', 'Importo']],
      body: sanctions.map(s => [s.motivazione || '-', format(new Date(s.date), 'dd/MM/yyyy'), `-€${s.amount}`]),
      headStyles: { fillColor: [100, 100, 100] },
      styles: { fontSize: 9 }
    })
  }

  const y = doc.lastAutoTable.finalY + 15
  doc.setFillColor(245, 245, 245)
  doc.rect(14, y, 182, 38, 'F')
  doc.setFontSize(10)
  doc.setTextColor(0,0,0)
  doc.text(`Presenze: €${payslip.lordo - (payslip.carburante || 0)}`, 20, y + 9)
  doc.setTextColor(59, 130, 246)
  doc.text(`Carburante: €${payslip.carburante || 0}`, 20, y + 17)
  doc.setTextColor(192, 0, 0)
  doc.text(`Sanzioni: -€${payslip.sanzioni}`, 20, y + 25)
  doc.setTextColor(26, 179, 148)
  doc.setFont('helvetica', 'bold')
  doc.text(`Netto totale: €${payslip.netto}`, 20, y + 33)
  doc.setTextColor(0,0,0)
  doc.setFont('helvetica', 'normal')
  doc.text('Firma: ______________________', 120, y + 33)
  doc.save(`cedolino_${player?.cognome}_${MONTHS[payslip.month - 1]}_${payslip.year}.pdf`)
}

function GenerateModal({ onClose, onSaved }) {
  const { profile } = useAuth()
  const [players, setPlayers] = useState([])
  const [teamSettings, setTeamSettings] = useState(null)
  const [form, setForm] = useState({ player_id: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() })
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'player_paid').eq('active', true).order('cognome').then(({ data }) => setPlayers(data || []))
    supabase.from('team_settings').select('*').single().then(({ data }) => setTeamSettings(data))
  }, [])

  async function calcola() {
    if (!form.player_id) return toast.error('Seleziona un calciatore')
    setLoading(true)
    const start = startOfMonth(new Date(form.year, form.month - 1)).toISOString()
    const end = endOfMonth(new Date(form.year, form.month - 1)).toISOString()
    const [{ data: att }, { data: san }] = await Promise.all([
      supabase.from('attendances').select('*').eq('player_id', form.player_id).gte('date', start).lte('date', end),
      supabase.from('sanctions').select('*').eq('player_id', form.player_id).gte('date', start).lte('date', end)
    ])
    const presenze = (att || []).reduce((s, a) => s + (a.amount || 0), 0)
    const carburante = (att || []).reduce((s, a) => s + (a.rimborso_carburante || 0), 0)
    const lordo = presenze + carburante
    const sanzioni = (san || []).reduce((s, a) => s + (a.amount || 0), 0)
    setPreview({ att: att || [], san: san || [], presenze, carburante, lordo, sanzioni, netto: lordo - sanzioni })
    setLoading(false)
  }

  async function save() {
    if (!preview) return
    setLoading(true)
    const player = players.find(p => p.id === form.player_id)
    const payslipData = {
      player_id: form.player_id, month: form.month, year: form.year,
      lordo: preview.lordo, sanzioni: preview.sanzioni, netto: preview.netto,
      carburante: preview.carburante
    }
    const { data: ps, error } = await supabase.from('payslips')
      .upsert([payslipData], { onConflict: 'player_id,month,year' }).select().single()
    if (error) { toast.error(error.message); setLoading(false); return }
   await supabase.from('notifications').insert([{
      user_id: form.player_id, club_id: profile?.club_id, type: 'payslip_generated',
      message: `Cedolino ${MONTHS[form.month - 1]} ${form.year} — Netto: €${preview.netto}`, read: false
    }])
    generatePDF({ ...payslipData, ...ps }, player, preview.att, preview.san, teamSettings)
    if (preview.netto > 0) {
  await registraCedolinoInContabilita({
    club_id:    profile?.club_id,
    created_by: profile?.id,
    modulo:     'ps',
    tipo:       'calciatore',
    cognome:    player?.cognome || '',
    nome:       player?.nome || '',
    importo:    preview.netto,
    month:      form.month,
    year:       form.year,
    riferimento: `CED-${ps.id?.slice(0,8)}`,
  })
}
    toast.success('Cedolino generato!')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Genera Cedolino</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Calciatore</label>
            <select value={form.player_id} onChange={e => setForm(f => ({ ...f, player_id: e.target.value }))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              <option value="">Seleziona...</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
            </select>
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
          <button onClick={calcola} disabled={loading}
            className="w-full border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">
            Calcola anteprima
          </button>
          {preview && (
            <div className="bg-gray-50 border border-[#e7eaec] rounded p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-[#676a6c]"><span>Allenamenti</span><span>{preview.att.filter(a=>a.type==='training').length}</span></div>
              <div className="flex justify-between text-[#676a6c]"><span>Partite</span><span>{preview.att.filter(a=>a.type==='match').length}</span></div>
              <div className="flex justify-between text-[#676a6c]"><span>Presenze</span><span>€{preview.presenze}</span></div>
              <div className="flex justify-between text-blue-500 items-center"><span className="flex items-center gap-1"><Fuel size={12}/>Carburante</span><span>€{preview.carburante}</span></div>
              <div className="flex justify-between text-[#676a6c]"><span>Lordo</span><span>€{preview.lordo}</span></div>
              <div className="flex justify-between text-red-500"><span>Sanzioni</span><span>-€{preview.sanzioni}</span></div>
              <div className="flex justify-between text-[#1ab394] font-bold border-t border-[#e7eaec] pt-1.5"><span>Netto</span><span>€{preview.netto}</span></div>
            </div>
          )}
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading || !preview}
            className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            Genera PDF
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Payslips() {
  const { profile, isAdmin, isMister } = useAuth()
  const [payslips, setPayslips] = useState([])
  const [teamSettings, setTeamSettings] = useState(null)
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  useEffect(() => { supabase.from('team_settings').select('*').single().then(({ data }) => setTeamSettings(data)) }, [])

  async function load() {
    setLoading(true)
    let q = supabase.from('payslips').select('*, profiles(nome,cognome)').order('year', { ascending: false }).order('month', { ascending: false })
    if (!isAdmin) q = q.eq('player_id', profile.id)
    const { data } = await q
    setPayslips(data || [])
    setLoading(false)
  }

  async function downloadPDF(p) {
    const start = startOfMonth(new Date(p.year, p.month - 1)).toISOString()
    const end = endOfMonth(new Date(p.year, p.month - 1)).toISOString()
    const [{ data: att }, { data: san }] = await Promise.all([
      supabase.from('attendances').select('*').eq('player_id', p.player_id).gte('date', start).lte('date', end),
      supabase.from('sanctions').select('*').eq('player_id', p.player_id).gte('date', start).lte('date', end)
    ])
    generatePDF(p, p.profiles, att || [], san || [], teamSettings)
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
         <h1 className="text-2xl font-bold text-[#2f4050]">{isAdmin ? 'Cedolini Calciatori' : 'I miei cedolini'}</h1>
          <p className="text-sm text-[#999] mt-1">{isAdmin ? 'Rimborsi mensili calciatori' : 'I tuoi rimborsi mensili'}</p>
        </div>
       {isAdmin && (
  <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
    <Plus size={16}/> Genera
  </button>
)}
      </div>

      <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-24"><div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/></div>
        ) : payslips.length === 0 ? (
          <div className="text-center text-[#999] py-10 text-sm">Nessun cedolino</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e7eaec] bg-gray-50">
                {(isAdmin) && <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Calciatore</th>}
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Periodo</th>
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Presenze</th>
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Carb.</th>
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Sanzioni</th>
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Netto</th>
                <th className="px-4 py-3"/>
              </tr>
            </thead>
            <tbody>
              {payslips.map(p => (
                <tr key={p.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                  {(isAdmin) && <td className="px-4 py-3 text-[#2f4050] font-medium">{p.profiles?.cognome} {p.profiles?.nome}</td>}
                  <td className="px-4 py-3 text-[#999]">{MONTHS[p.month - 1]} {p.year}</td>
                  <td className="px-4 py-3 text-[#676a6c]">€{(p.lordo || 0) - (p.carburante || 0)}</td>
                  <td className="px-4 py-3">
                    {p.carburante > 0
                      ? <span className="text-blue-500 flex items-center gap-1"><Fuel size={11}/>€{p.carburante}</span>
                      : <span className="text-[#999]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-red-500">-€{p.sanzioni}</td>
                  <td className="px-4 py-3 text-[#1ab394] font-bold">€{p.netto}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => downloadPDF(p)} className="text-[#999] hover:text-[#1ab394] flex items-center gap-1 text-xs">
                      <Download size={13}/> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && <GenerateModal onClose={() => setModal(false)} onSaved={() => { setModal(false); load() }}/>}
    </div>
  )
}

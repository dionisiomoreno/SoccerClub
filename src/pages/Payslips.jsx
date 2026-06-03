import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Download, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const YEARS = [2024, 2025, 2026]

function generatePDF(payslip, player, attendances, sanctions) {
  const doc = new jsPDF()
  doc.setFillColor(192, 0, 0)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('SoccerClub', 14, 13)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('ASD Castelmauro Calcio 1986', 14, 22)
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
    head: [['Tipo', 'Data', 'Importo']],
    body: attendances.map(a => [a.type === 'training' ? 'Allenamento' : 'Partita', format(new Date(a.date), 'dd/MM/yyyy'), `€${a.amount}`]),
    headStyles: { fillColor: [192, 0, 0] },
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
  doc.rect(14, y, 182, 30, 'F')
  doc.setFontSize(10)
  doc.text(`Lordo: €${payslip.lordo}`, 20, y + 10)
  doc.setTextColor(192, 0, 0)
  doc.text(`Sanzioni: -€${payslip.sanzioni}`, 20, y + 18)
  doc.setTextColor(0, 150, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(`Netto: €${payslip.netto}`, 20, y + 26)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.text('Firma: ______________________', 120, y + 26)
  doc.save(`cedolino_${player?.cognome}_${MONTHS[payslip.month - 1]}_${payslip.year}.pdf`)
}

function GenerateModal({ onClose, onSaved }) {
  const [players, setPlayers] = useState([])
  const [form, setForm] = useState({ player_id: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() })
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'player_paid').eq('active', true).order('cognome').then(({ data }) => setPlayers(data || []))
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
    const lordo = (att || []).reduce((s, a) => s + (a.amount || 0), 0)
    const sanzioni = (san || []).reduce((s, a) => s + (a.amount || 0), 0)
    setPreview({ att: att || [], san: san || [], lordo, sanzioni, netto: lordo - sanzioni })
    setLoading(false)
  }

  async function save() {
    if (!preview) return
    setLoading(true)
    const player = players.find(p => p.id === form.player_id)
    const payslipData = { player_id: form.player_id, month: form.month, year: form.year, lordo: preview.lordo, sanzioni: preview.sanzioni, netto: preview.netto }
    const { data: ps, error } = await supabase.from('payslips').upsert([payslipData], { onConflict: 'player_id,month,year' }).select().single()
    if (error) { toast.error(error.message); setLoading(false); return }
    await supabase.from('notifications').insert([{ user_id: form.player_id, type: 'payslip_generated', message: `Cedolino ${MONTHS[form.month - 1]} ${form.year} disponibile`, read: false }])
    generatePDF({ ...payslipData, ...ps }, player, preview.att, preview.san)
    toast.success('Cedolino generato')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <h2 className="text-white font-semibold">Genera Cedolino</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-white">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Calciatore</label>
            <select value={form.player_id} onChange={e => setForm(f => ({ ...f, player_id: e.target.value }))}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]">
              <option value="">Seleziona...</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Mese</label>
              <select value={form.month} onChange={e => setForm(f => ({ ...f, month: +e.target.value }))}
                className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Anno</label>
              <select value={form.year} onChange={e => setForm(f => ({ ...f, year: +e.target.value }))}
                className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]">
                {YEARS.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <button onClick={calcola} disabled={loading} className="w-full bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-2 rounded-lg text-sm">Calcola anteprima</button>
          {preview && (
            <div className="bg-[#121212] border border-[#2A2A2A] rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between text-white"><span>Allenamenti</span><span>{preview.att.filter(a => a.type === 'training').length}</span></div>
              <div className="flex justify-between text-white"><span>Partite</span><span>{preview.att.filter(a => a.type === 'match').length}</span></div>
              <div className="flex justify-between text-white"><span>Lordo</span><span>€{preview.lordo}</span></div>
              <div className="flex justify-between text-red-400"><span>Sanzioni</span><span>-€{preview.sanzioni}</span></div>
              <div className="flex justify-between text-green-400 font-bold border-t border-[#2A2A2A] pt-1"><span>Netto</span><span>€{preview.netto}</span></div>
            </div>
          )}
        </div>
        <div className="flex gap-2 p-4 border-t border-[#2A2A2A]">
          <button onClick={onClose} className="flex-1 bg-[#2A2A2A] text-white py-2 rounded-lg text-sm">Annulla</button>
          <button onClick={save} disabled={loading || !preview} className="flex-1 bg-[#C00000] hover:bg-[#A00000] disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold">
            Genera PDF
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Payslips() {
  const { profile, isAdmin, isMister } = useAuth()
  const [tab, setTab] = useState('players')
  const [payslips, setPayslips] = useState([])
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [tab])

  async function load() {
    setLoading(true)
    if (tab === 'players') {
      let q = supabase.from('payslips').select('*, profiles(nome,cognome)').order('year', { ascending: false }).order('month', { ascending: false })
      if (!isAdmin && !isMister) q = q.eq('player_id', profile.id)
      const { data } = await q
      setPayslips(data || [])
    } else {
      const { data } = await supabase.from('coach_payslips').select('*, profiles(nome,cognome)').order('year', { ascending: false }).order('month', { ascending: false })
      setPayslips(data || [])
    }
    setLoading(false)
  }

  async function downloadPDF(p) {
    const start = startOfMonth(new Date(p.year, p.month - 1)).toISOString()
    const end = endOfMonth(new Date(p.year, p.month - 1)).toISOString()
    const [{ data: att }, { data: san }] = await Promise.all([
      supabase.from('attendances').select('*').eq('player_id', p.player_id).gte('date', start).lte('date', end),
      supabase.from('sanctions').select('*').eq('player_id', p.player_id).gte('date', start).lte('date', end)
    ])
    generatePDF(p, p.profiles, att || [], san || [])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Cedolini</h1>
        {(isAdmin || isMister) && (
          <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-[#C00000] hover:bg-[#A00000] text-white px-3 py-2 rounded-lg text-sm font-semibold">
            <Plus size={16}/> Genera
          </button>
        )}
      </div>

      {(isAdmin || isMister) && (
        <div className="flex gap-1 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg p-1 w-fit">
          {[['players','Calciatori'],['mister','Mister']].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} className={clsx('px-4 py-1.5 rounded-md text-sm font-medium transition-colors', tab === v ? 'bg-[#C00000] text-white' : 'text-[#6B7280] hover:text-white')}>{l}</button>
          ))}
        </div>
      )}

      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-24"><div className="w-6 h-6 border-2 border-[#C00000] border-t-transparent rounded-full animate-spin"/></div>
        ) : payslips.length === 0 ? (
          <div className="text-center text-[#6B7280] py-10 text-sm">Nessun cedolino</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                {(isAdmin || isMister) && <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Calciatore</th>}
                <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Periodo</th>
                {tab === 'players' && <>
                  <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Lordo</th>
                  <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Sanzioni</th>
                </>}
                <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Netto</th>
                <th className="px-4 py-3"/>
              </tr>
            </thead>
            <tbody>
              {payslips.map(p => (
                <tr key={p.id} className="border-b border-[#2A2A2A] hover:bg-[#2A2A2A]/30">
                  {(isAdmin || isMister) && <td className="px-4 py-3 text-white">{p.profiles?.cognome} {p.profiles?.nome}</td>}
                  <td className="px-4 py-3 text-[#6B7280]">{MONTHS[p.month - 1]} {p.year}</td>
                  {tab === 'players' && <>
                    <td className="px-4 py-3 text-white">€{p.lordo}</td>
                    <td className="px-4 py-3 text-red-400">-€{p.sanzioni}</td>
                  </>}
                  <td className="px-4 py-3 text-green-400 font-bold">€{p.netto ?? p.compenso}</td>
                  <td className="px-4 py-3">
                    {tab === 'players' && (
                      <button onClick={() => downloadPDF(p)} className="text-[#6B7280] hover:text-white flex items-center gap-1 text-xs">
                        <Download size={13}/> PDF
                      </button>
                    )}
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

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function generateDistintaPDF(match, players) {
  const doc = new jsPDF()
  doc.setFillColor(26, 35, 126)
  doc.rect(0, 0, 210, 35, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('DISTINTA DI GARA', 105, 15, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('F.I.G.C. — Federazione Italiana Giuoco Calcio', 105, 25, { align: 'center' })
  doc.setFillColor(240, 240, 240)
  doc.rect(10, 40, 190, 28, 'F')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Squadra:', 14, 50)
  doc.setFont('helvetica', 'normal')
  doc.text('ASD Castelmauro Calcio 1986', 45, 50)
  doc.setFont('helvetica', 'bold')
  doc.text('Avversario:', 14, 58)
  doc.setFont('helvetica', 'normal')
  doc.text(match.avversario || '-', 45, 58)
  doc.setFont('helvetica', 'bold')
  doc.text('Data:', 110, 50)
  doc.setFont('helvetica', 'normal')
  doc.text(match.date ? format(new Date(match.date), 'dd/MM/yyyy') : '-', 125, 50)
  doc.setFont('helvetica', 'bold')
  doc.text('Campo:', 155, 50)
  doc.setFont('helvetica', 'normal')
  doc.text(match.campo || '-', 172, 50)
  autoTable(doc, {
    startY: 75,
    head: [['N°', 'Cognome e Nome', 'N° Patente', 'Firma']],
    body: players.map((p, i) => [i + 1, `${p.profiles?.cognome || ''} ${p.profiles?.nome || ''}`, p.profiles?.numero_patente || '-', '']),
    headStyles: { fillColor: [26, 35, 126], textColor: 255, fontSize: 9 },
    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 70 }, 2: { cellWidth: 50 }, 3: { cellWidth: 50 } },
    styles: { fontSize: 9, minCellHeight: 10 }
  })
  const y = doc.lastAutoTable.finalY + 15
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Allenatore:', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text('_______________________________', 45, y)
  doc.text('Firma: ______________________', 130, y)
  doc.text('Firma Dirigente: ______________________', 14, y + 15)
  doc.text('Firma Direttore di Gara: _______________', 110, y + 15)
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('SoccerClub — ASD Castelmauro Calcio 1986', 105, 290, { align: 'center' })
  doc.save(`distinta_vs_${match.avversario}_${match.date}.pdf`)
}

function ReportModal({ onClose, onSaved }) {
  const [matches, setMatches] = useState([])
  const [players, setPlayers] = useState([])
  const [matchId, setMatchId] = useState('')
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('matches').select('*').order('date', { ascending: false }).then(({ data }) => setMatches(data || []))
    supabase.from('profiles').select('id,nome,cognome,numero_patente').eq('active', true).order('cognome').then(({ data }) => setPlayers(data || []))
  }, [])

  function toggle(id) { setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]) }
  function selectAll() { setSelected(players.map(p => p.id)) }
  function selectNone() { setSelected([]) }

  async function save() {
    if (!matchId) return toast.error('Seleziona una partita')
    if (selected.length === 0) return toast.error('Seleziona almeno un calciatore')
    setLoading(true)
    const { data: report, error } = await supabase.from('match_reports').insert([{ match_id: matchId }]).select().single()
    if (error) { toast.error(error.message); setLoading(false); return }
    await supabase.from('match_report_players').insert(selected.map(pid => ({ report_id: report.id, player_id: pid })))
    const match = matches.find(m => m.id === matchId)
    const reportPlayers = players.filter(p => selected.includes(p.id)).map(p => ({ profiles: p }))
    generateDistintaPDF(match, reportPlayers)
    toast.success('Distinta creata')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Nuova Distinta</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Partita</label>
            <select value={matchId} onChange={e => setMatchId(e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              <option value="">Seleziona partita...</option>
              {matches.map(m => <option key={m.id} value={m.id}>vs {m.avversario} — {format(new Date(m.date), 'dd/MM/yyyy')}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#999] uppercase tracking-wide">Calciatori ({selected.length})</label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-[#1ab394] hover:underline">Tutti</button>
                <button onClick={selectNone} className="text-xs text-[#999] hover:underline">Nessuno</button>
              </div>
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto border border-[#e7eaec] rounded p-2">
              {players.map(p => (
                <label key={p.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} className="accent-[#1ab394]"/>
                  <span className="text-[#676a6c] text-sm flex-1">{p.cognome} {p.nome}</span>
                  <span className="text-[#999] text-xs">{p.numero_patente || '-'}</span>
                </label>
              ))}
            </div>
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

export default function MatchReport() {
  const [reports, setReports] = useState([])
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('match_reports')
      .select('*, matches(avversario,date,time,campo), match_report_players(player_id, profiles(nome,cognome,numero_patente))')
      .order('created_at', { ascending: false })
    setReports(data || [])
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Distinta Gara</h1>
          <p className="text-sm text-[#999] mt-1">Generazione distinte ufficiali FIGC</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
          <Plus size={16}/> Nuova distinta
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/></div>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-8 text-center text-[#999] text-sm">Nessuna distinta creata</div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => {
            const players = r.match_report_players || []
            const shown = players.slice(0, 8)
            const extra = players.length - 8
            return (
              <div key={r.id} className="bg-white border border-[#e7eaec] rounded shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-2">
                    <div className="text-[#2f4050] font-semibold">vs {r.matches?.avversario}</div>
                    <div className="text-[#999] text-sm">
                      {r.matches?.date && format(new Date(r.matches.date), 'dd MMM yyyy', { locale: it })}
                      {r.matches?.campo && ` • ${r.matches.campo}`}
                      <span className="ml-2 text-xs">({players.length} calciatori)</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {shown.map(p => (
                        <span key={p.player_id} className="bg-gray-100 text-[#676a6c] text-xs px-2 py-0.5 rounded">
                          {p.profiles?.cognome}
                        </span>
                      ))}
                      {extra > 0 && <span className="bg-gray-100 text-[#999] text-xs px-2 py-0.5 rounded">+{extra} altri</span>}
                    </div>
                  </div>
                  <button onClick={() => generateDistintaPDF(r.matches, r.match_report_players || [])}
                    className="flex items-center gap-1 text-[#999] hover:text-[#1ab394] text-xs flex-shrink-0">
                    <Download size={14}/> PDF
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && <ReportModal onClose={() => setModal(false)} onSaved={() => { setModal(false); load() }}/>}
    </div>
  )
}

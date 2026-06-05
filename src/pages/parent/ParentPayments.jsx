import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Download, CreditCard, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const MONTHS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
const STATI = {
  pagato:              { label: 'Pagato',       color: 'bg-green-100 text-green-600',  icon: CheckCircle },
  parzialmente_pagato: { label: 'Parz. pagato', color: 'bg-yellow-100 text-yellow-600', icon: Clock },
  scaduto:             { label: 'Scaduto',      color: 'bg-red-100 text-red-600',      icon: XCircle },
  da_pagare:           { label: 'Da pagare',    color: 'bg-gray-100 text-gray-500',    icon: Clock },
}

function generateReceiptPDF(payment, receipt, player, teamSettings) {
  const doc = new jsPDF()
  doc.setFillColor(39, 174, 96); doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text(teamSettings?.nome_squadra || 'SoccerClub', 14, 13)
  doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.text('Ricevuta di pagamento', 14, 22)
  doc.setTextColor(0,0,0); doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text('N\u00B0 ' + receipt.numero_ricevuta, 14, 42)
  doc.setFont('helvetica','normal'); doc.setFontSize(10)
  doc.text('Data: ' + format(new Date(receipt.data_pagamento), 'dd/MM/yyyy'), 14, 50)
  doc.text('Atleta: ' + (player?.cognome || '') + ' ' + (player?.nome || ''), 14, 58)
  autoTable(doc, {
    startY: 68,
    head: [['Descrizione','Importo']],
    body: [['Quota ' + (payment?.tipo || '') + ' - ' + MONTHS[(payment?.mese || 1) - 1] + ' ' + (payment?.anno || ''), '\u20AC' + receipt.importo]],
    headStyles: { fillColor: [39,174,96] }, styles: { fontSize: 10 }
  })
  const y = doc.lastAutoTable.finalY + 15
  doc.setFillColor(245,245,245); doc.rect(14, y, 182, 20, 'F')
  doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(39,174,96)
  doc.text('Totale pagato: \u20AC' + receipt.importo, 20, y + 13)
  doc.save('ricevuta_' + receipt.numero_ricevuta + '.pdf')
}

export default function ParentPayments() {
  const { profile } = useAuth()
  const [child, setChild] = useState(null)
  const [payments, setPayments] = useState([])
  const [receipts, setReceipts] = useState([])
  const [teamSettings, setTeamSettings] = useState(null)
  const [tab, setTab] = useState('payments')
  const [loading, setLoading] = useState(true)
  const [filterAnno, setFilterAnno] = useState(new Date().getFullYear())

  useEffect(() => { load() }, [profile, tab, filterAnno])

  async function load() {
    if (!profile?.id) return
    setLoading(true)
    const { data: parent } = await supabase.from('parents').select('*, youth_players(*)').eq('user_id', profile.id).single()
    if (!parent?.youth_players) { setLoading(false); return }
    setChild(parent.youth_players)
    const { data: ts } = await supabase.from('team_settings').select('*').single()
    setTeamSettings(ts)
    if (tab === 'payments') {
      const { data } = await supabase.from('payments').select('*, payment_configs(nome,tipo)').eq('youth_player_id', parent.youth_players.id).eq('anno', filterAnno).order('mese', { ascending: true })
      setPayments(data || [])
    } else {
      const { data } = await supabase.from('payment_receipts').select('*, payments(mese,anno,tipo,payment_configs(nome,tipo))').eq('youth_player_id', parent.youth_players.id).order('data_pagamento', { ascending: false })
      setReceipts(data || [])
    }
    setLoading(false)
  }

  if (!loading && !child) return (
    <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
      <AlertTriangle size={32} className="mx-auto text-yellow-500 mb-2"/>
      <p className="text-yellow-700">Nessun atleta collegato. Contatta la segreteria.</p>
    </div>
  )

  const totaleDovuto = payments.reduce((s,p) => s + (p.importo_dovuto || 0), 0)
  const totalePagato = payments.reduce((s,p) => s + (p.importo_pagato || 0), 0)
  const totaleResiduo = payments.reduce((s,p) => s + (p.importo_residuo || 0), 0)
  const insoluti = payments.filter(p => p.stato === 'scaduto').length
  const anni = [new Date().getFullYear()-1, new Date().getFullYear(), new Date().getFullYear()+1]

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4">
        <h1 className="text-2xl font-bold text-[#2f4050]">Pagamenti</h1>
        <p className="text-sm text-[#999] mt-1">Quote e ricevute di {child?.nome} {child?.cognome}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <CreditCard size={20} className="mx-auto text-[#999] mb-2"/>
          <div className="text-xl font-bold text-[#2f4050]">{totaleDovuto > 0 ? '\u20AC' + totaleDovuto : '\u20AC0'}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Totale dovuto</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <CheckCircle size={20} className="mx-auto text-[#27ae60] mb-2"/>
          <div className="text-xl font-bold text-[#27ae60]">\u20AC{totalePagato}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Pagato</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <Clock size={20} className="mx-auto text-yellow-500 mb-2"/>
          <div className="text-xl font-bold text-yellow-500">\u20AC{totaleResiduo}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Residuo</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <XCircle size={20} className="mx-auto text-red-500 mb-2"/>
          <div className="text-xl font-bold text-red-500">{insoluti}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Insoluti</div>
        </div>
      </div>
      {insoluti > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded p-3 text-red-600 text-sm">
          <AlertTriangle size={16}/> Hai <strong>{insoluti}</strong> quota/e scaduta/e. Contatta la segreteria.
        </div>
      )}
      <div className="flex gap-1 border-b border-[#e7eaec]">
        {[['payments','Quote'],['receipts','Ricevute']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={clsx('px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab===v ? 'border-[#27ae60] text-[#27ae60]' : 'border-transparent text-[#999] hover:text-[#676a6c]')}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'payments' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#999]">Anno:</span>
          <div className="flex gap-1">
            {anni.map(a => (
              <button key={a} onClick={() => setFilterAnno(a)}
                className={clsx('px-3 py-1 rounded text-sm font-medium transition-colors',
                  filterAnno===a ? 'bg-[#27ae60] text-white' : 'bg-white border border-[#e7eaec] text-[#676a6c] hover:border-[#27ae60]')}>
                {a}
              </button>
            ))}
          </div>
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-[#27ae60] border-t-transparent rounded-full animate-spin"/></div>
      ) : tab === 'payments' ? (
        payments.length === 0 ? (
          <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-10 text-center text-[#999] text-sm">Nessuna quota per il {filterAnno}</div>
        ) : (
          <div className="space-y-3">
            {payments.map(p => {
              const S = STATI[p.stato] || STATI.da_pagare
              const Icon = S.icon
              return (
                <div key={p.id} className={clsx('bg-white border rounded shadow-sm p-4 flex items-center justify-between gap-3', p.stato==='scaduto' ? 'border-red-300' : 'border-[#e7eaec]')}>
                  <div className="flex items-center gap-3">
                    <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', S.color)}>
                      <Icon size={18}/>
                    </div>
                    <div>
                      <div className="text-[#2f4050] font-semibold text-sm">{MONTHS[(p.mese||1)-1]} {p.anno}</div>
                      <div className="text-xs text-[#999] mt-0.5">{p.payment_configs?.nome || 'Quota'}{p.data_scadenza && ' - scad. ' + format(new Date(p.data_scadenza),'dd/MM/yyyy')}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', S.color)}>{S.label}</span>
                    <div className="text-xs text-[#999] mt-1">
                      Dovuto: <strong>\u20AC{p.importo_dovuto}</strong>
                      {p.importo_pagato > 0 && <> · Pagato: <strong className="text-[#27ae60]">\u20AC{p.importo_pagato}</strong></>}
                    </div>
                  </div>
                </div>
              )
            })}
            <div className="bg-gray-50 border border-[#e7eaec] rounded p-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#2f4050] uppercase tracking-wide">Riepilogo {filterAnno}</span>
              <div className="flex gap-4 text-sm">
                <span>Dovuto: <strong>\u20AC{totaleDovuto}</strong></span>
                <span>Pagato: <strong className="text-[#27ae60]">\u20AC{totalePagato}</strong></span>
                {totaleResiduo > 0 && <span>Residuo: <strong className="text-red-500">\u20AC{totaleResiduo}</strong></span>}
              </div>
            </div>
          </div>
        )
      ) : (
        receipts.length === 0 ? (
          <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-10 text-center text-[#999] text-sm">Nessuna ricevuta disponibile</div>
        ) : (
          <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e7eaec] bg-gray-50">
                  {['N\u00B0 Ricevuta','Data','Importo','Metodo','Scarica'].map(h => (
                    <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-[#676a6c]">{r.numero_ricevuta}</td>
                    <td className="px-4 py-3 text-[#999]">{format(new Date(r.data_pagamento),'dd MMM yyyy',{locale:it})}</td>
                    <td className="px-4 py-3 text-[#27ae60] font-bold">\u20AC{r.importo}</td>
                    <td className="px-4 py-3 text-[#999] capitalize">{r.metodo_pagamento || '-'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => generateReceiptPDF(r.payments?.payment_configs, r, child, teamSettings)}
                        className="flex items-center gap-1 text-[#999] hover:text-[#27ae60] text-xs">
                        <Download size={13}/> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
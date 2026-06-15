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
const MONTHS_FULL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

const STATI = {
  pagato:    { label: 'Pagato',    color: 'bg-green-100 text-green-600',  icon: CheckCircle },
  scaduto:   { label: 'Scaduto',   color: 'bg-red-100 text-red-600',      icon: XCircle },
  da_pagare: { label: 'Da pagare', color: 'bg-gray-100 text-gray-500',    icon: Clock },
}

function generateReceiptPDF(scadenza, child, teamSettings) {
  const doc = new jsPDF()
  doc.setFillColor(39, 174, 96); doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text(teamSettings?.nome_squadra || 'SoccerClub', 14, 13)
  doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.text('Ricevuta di pagamento retta mensile', 14, 22)
  doc.setTextColor(0,0,0); doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text(`N° ${scadenza.numero_ricevuta || '—'}`, 14, 42)
  doc.setFont('helvetica','normal'); doc.setFontSize(10)
  doc.text(`Data pagamento: ${scadenza.data_pagamento ? format(new Date(scadenza.data_pagamento), 'dd/MM/yyyy') : '—'}`, 14, 50)
  doc.text(`Atleta: ${child?.cognome} ${child?.nome}`, 14, 58)
  doc.text(`Periodo: ${MONTHS_FULL[(scadenza.mese||1)-1]} ${scadenza.anno}`, 14, 66)
  autoTable(doc, {
    startY: 76,
    head: [['Descrizione','Importo','Metodo']],
    body: [[
      `Retta mensile — ${MONTHS_FULL[(scadenza.mese||1)-1]} ${scadenza.anno}`,
      `€${Number(scadenza.importo_pagato || scadenza.importo).toFixed(2)}`,
      scadenza.metodo_pagamento || '—'
    ]],
    headStyles: { fillColor: [39,174,96] }, styles: { fontSize: 10 }
  })
  const y = doc.lastAutoTable.finalY + 15
  doc.setFillColor(245,245,245); doc.rect(14, y, 182, 20, 'F')
  doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(39,174,96)
  doc.text(`Totale pagato: €${Number(scadenza.importo_pagato || scadenza.importo).toFixed(2)}`, 20, y+13)
  doc.save(`ricevuta_${MONTHS[scadenza.mese-1]}${scadenza.anno}_${child?.cognome}.pdf`)
}

export default function ParentPayments() {
  const { profile } = useAuth()
  const [child,        setChild]        = useState(null)
  const [scadenze,     setScadenze]     = useState([])
  const [teamSettings, setTeamSettings] = useState(null)
  const [filterAnno,   setFilterAnno]   = useState(new Date().getFullYear())
  const [loading,      setLoading]      = useState(true)

  const anni = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1]

  useEffect(() => { load() }, [profile, filterAnno])

  async function load() {
    if (!profile?.id) return
    setLoading(true)

    // Carica genitore + figlio
    const { data: parent } = await supabase
      .from('parents')
      .select('*, youth_players(*, categories(nome,colore))')
      .eq('user_id', profile.id)
      .single()

    if (!parent?.youth_players) { setLoading(false); return }
    const yp = parent.youth_players
    setChild(yp)

    // Carica team settings
    const { data: ts } = await supabase.from('team_settings').select('*').single()
    setTeamSettings(ts)

    // Carica rette scadenze dell'anno selezionato
    const { data: sc } = await supabase
      .from('rette_scadenze')
      .select('*')
      .eq('youth_player_id', yp.id)
      .eq('anno', filterAnno)
      .order('mese', { ascending: true })

    setScadenze(sc || [])
    setLoading(false)
  }

  if (!loading && !child) return (
    <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
      <AlertTriangle size={32} className="mx-auto text-yellow-500 mb-2"/>
      <p className="text-yellow-700">Nessun atleta collegato. Contatta la segreteria.</p>
    </div>
  )

  // KPI
  const totaleDovuto   = scadenze.reduce((s, r) => s + (+r.importo || 0), 0)
  const totalePagato   = scadenze.filter(r => r.stato === 'pagato').reduce((s, r) => s + (+r.importo_pagato || +r.importo || 0), 0)
  const totaleResiduo  = totaleDovuto - totalePagato
  const scadute        = scadenze.filter(r => r.stato === 'scaduto').length
  const daPagare       = scadenze.filter(r => r.stato === 'da_pagare').length
  const catColor       = child?.categories?.colore || '#27ae60'

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4">
        <h1 className="text-2xl font-bold text-[#2f4050]">Pagamenti</h1>
        <p className="text-sm text-[#999] mt-1">
          Rette mensili di {child?.nome} {child?.cognome}
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <CreditCard size={20} className="mx-auto text-[#999] mb-2"/>
          <div className="text-xl font-bold text-[#2f4050]">€{totaleDovuto.toFixed(2)}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Totale dovuto</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <CheckCircle size={20} className="mx-auto text-[#27ae60] mb-2"/>
          <div className="text-xl font-bold text-[#27ae60]">€{totalePagato.toFixed(2)}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Pagato</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <Clock size={20} className="mx-auto text-yellow-500 mb-2"/>
          <div className="text-xl font-bold text-yellow-500">€{totaleResiduo.toFixed(2)}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Residuo</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <XCircle size={20} className="mx-auto text-red-500 mb-2"/>
          <div className="text-xl font-bold text-red-500">{scadute}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Scadute</div>
        </div>
      </div>

      {/* Alert scadute */}
      {scadute > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded p-3 text-red-600 text-sm">
          <AlertTriangle size={16}/>
          Hai <strong>{scadute}</strong> retta/e scaduta/e. Contatta la segreteria per regolarizzare.
        </div>
      )}

      {/* Filtro anno */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#999]">Anno:</span>
        <div className="flex gap-1">
          {anni.map(a => (
            <button key={a} onClick={() => setFilterAnno(a)}
              className={clsx('px-3 py-1 rounded text-sm font-medium transition-colors',
                filterAnno === a ? 'text-white' : 'bg-white border border-[#e7eaec] text-[#676a6c] hover:border-[#27ae60]')}
              style={filterAnno === a ? { background: catColor } : {}}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Lista rette */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: catColor }}/>
        </div>
      ) : scadenze.length === 0 ? (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-10 text-center text-[#999] text-sm">
          <CreditCard size={32} className="mx-auto mb-2 opacity-30"/>
          Nessuna retta per il {filterAnno}
        </div>
      ) : (
        <div className="space-y-3">
          {scadenze.map(sc => {
            const S = STATI[sc.stato] || STATI.da_pagare
            const Icon = S.icon
            const isScaduta  = sc.stato === 'scaduto'
            const isPagata   = sc.stato === 'pagato'
            return (
              <div key={sc.id}
                className={clsx('bg-white border rounded shadow-sm p-4',
                  isScaduta ? 'border-red-300' : 'border-[#e7eaec]')}>
                <div className="flex items-center justify-between gap-3">
                  {/* Mese + stato */}
                  <div className="flex items-center gap-3">
                    <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', S.color)}>
                      <Icon size={18}/>
                    </div>
                    <div>
                      <div className="text-[#2f4050] font-bold">
                        {MONTHS_FULL[(sc.mese||1)-1]} {sc.anno}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', S.color)}>
                          {S.label}
                        </span>
                        <span className="text-xs text-[#999]">
                          Scadenza: {sc.data_scadenza
                            ? format(new Date(sc.data_scadenza), 'dd/MM/yyyy')
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Importo + azioni */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-[#2f4050]">
                      €{Number(sc.importo).toFixed(2)}
                    </div>
                    {isPagata && sc.data_pagamento && (
                      <div className="text-xs text-[#999] mt-0.5">
                        Pagato il {format(new Date(sc.data_pagamento), 'dd/MM/yyyy')}
                        {sc.metodo_pagamento && ` · ${sc.metodo_pagamento}`}
                      </div>
                    )}
                    {isPagata && sc.numero_ricevuta && (
                      <button
                        onClick={() => generateReceiptPDF(sc, child, teamSettings)}
                        className="flex items-center gap-1 text-xs text-[#27ae60] hover:underline mt-1 ml-auto">
                        <Download size={12}/> Ricevuta
                      </button>
                    )}
                    {!isPagata && (
                      <div className="text-xs text-[#999] mt-1">
                        {isScaduta
                          ? '⚠️ Contatta la segreteria'
                          : '⏳ In attesa di pagamento'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Note */}
                {sc.note && (
                  <div className="mt-2 pt-2 border-t border-[#e7eaec] text-xs text-[#999] italic">
                    📝 {sc.note}
                  </div>
                )}
              </div>
            )
          })}

          {/* Riepilogo anno */}
          <div className="bg-gray-50 border border-[#e7eaec] rounded p-4 flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-semibold text-[#2f4050] uppercase tracking-wide">
              Riepilogo {filterAnno}
            </span>
            <div className="flex gap-4 text-sm flex-wrap">
              <span>Dovuto: <strong>€{totaleDovuto.toFixed(2)}</strong></span>
              <span>Pagato: <strong className="text-[#27ae60]">€{totalePagato.toFixed(2)}</strong></span>
              {totaleResiduo > 0 && (
                <span>Residuo: <strong className="text-red-500">€{totaleResiduo.toFixed(2)}</strong></span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

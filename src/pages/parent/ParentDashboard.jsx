import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { CreditCard, FileText, ShoppingBag, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'
import { Link } from 'react-router-dom'

export default function ParentDashboard() {
  const { profile } = useAuth()
  const [child, setChild] = useState(null)
  const [payments, setPayments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [kitRequests, setKitRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [profile])

  async function load() {
    if (!profile?.id) return
    setLoading(true)

    const { data: parent } = await supabase.from('parents')
      .select('*, youth_players(*, categories(nome,colore))').eq('user_id', profile.id).single()

    if (!parent) { setLoading(false); return }
    const yp = parent.youth_players
    setChild(yp)

    const [{ data: pays }, { data: anns }, { data: kits }] = await Promise.all([
      supabase.from('payments').select('*').eq('youth_player_id', yp.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('announcements').select('*, categories(nome)').eq('pubblicato', true).order('created_at', { ascending: false }).limit(3),
      supabase.from('kit_requests').select('*, warehouse_items(nome)').eq('youth_player_id', yp.id).order('created_at', { ascending: false }).limit(3),
    ])
    setPayments(pays || [])
    setAnnouncements(anns || [])
    setKitRequests(kits || [])
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-[#27ae60] border-t-transparent rounded-full animate-spin"/></div>
  if (!child) return (
    <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
      <AlertTriangle size={32} className="mx-auto text-yellow-500 mb-2"/>
      <p className="text-yellow-700 font-semibold">Nessun atleta collegato al tuo account.</p>
      <p className="text-yellow-600 text-sm mt-1">Contatta la segreteria per collegare il profilo di tuo figlio/a.</p>
    </div>
  )

  const catColor = child.categories?.colore || '#27ae60'
  const medicalDays = child.scadenza_certificato_medico ? differenceInDays(new Date(child.scadenza_certificato_medico), new Date()) : null
  const pendingPayments = payments.filter(p => p.stato !== 'pagato').length
  const pendingKits = kitRequests.filter(k => k.stato === 'in_attesa').length

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4">
        <h1 className="text-2xl font-bold text-[#2f4050]">Benvenuto, {profile?.nome}! 👋</h1>
        <p className="text-sm text-[#999] mt-1">{format(new Date(), "EEEE d MMMM yyyy", { locale: it })}</p>
      </div>

      {/* Card figlio */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
          style={{ background: catColor }}>
          {(child.nome?.[0]||'')+(child.cognome?.[0]||'')}
        </div>
        <div className="flex-1">
          <div className="text-[#2f4050] font-bold text-lg">{child.nome} {child.cognome}</div>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="px-2 py-0.5 rounded text-xs text-white font-medium" style={{ background: catColor }}>{child.categories?.nome}</span>
            {child.squadra && <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-[#676a6c]">{child.squadra}</span>}
            {child.numero_maglia && <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-[#676a6c]">N° {child.numero_maglia}</span>}
          </div>
        </div>
        <Link to="/genitore/figlio" className="text-xs text-[#27ae60] hover:underline">Vedi scheda →</Link>
      </div>

      {/* Alert certificato */}
      {medicalDays !== null && medicalDays <= 30 && (
        <div className={clsx('flex items-center gap-2 rounded p-3 text-sm border',
          medicalDays < 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-yellow-50 border-yellow-200 text-yellow-700')}>
          <AlertTriangle size={16}/>
          {medicalDays < 0
            ? 'Il certificato medico è SCADUTO! Rinnovalo al più presto.'
            : `Il certificato medico scade tra ${medicalDays} giorni. Ricordati di rinnovarlo!`}
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        <Link to="/genitore/pagamenti" className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center hover:border-[#27ae60] transition-colors">
          <CreditCard size={20} className="mx-auto text-[#27ae60] mb-2"/>
          <div className="text-2xl font-bold text-[#2f4050]">{pendingPayments}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Quote da pagare</div>
        </Link>
        <Link to="/genitore/documenti" className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center hover:border-[#27ae60] transition-colors">
          <FileText size={20} className="mx-auto text-blue-500 mb-2"/>
          <div className="text-2xl font-bold text-[#2f4050]">{medicalDays !== null && medicalDays < 0 ? '⚠️' : '✅'}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Certificato medico</div>
        </Link>
        <Link to="/genitore/kit" className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center hover:border-[#27ae60] transition-colors">
          <ShoppingBag size={20} className="mx-auto text-purple-500 mb-2"/>
          <div className="text-2xl font-bold text-[#2f4050]">{pendingKits}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Richieste kit</div>
        </Link>
      </div>

      {/* Ultimi pagamenti */}
      {payments.length > 0 && (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide">Ultime quote</h2>
            <Link to="/genitore/pagamenti" className="text-xs text-[#27ae60] hover:underline">Vedi tutte →</Link>
          </div>
          <div className="space-y-2">
            {payments.slice(0,3).map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-[#e7eaec] last:border-0">
                <div>
                  <div className="text-[#2f4050] text-sm font-medium">
                    {['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][p.mese-1]} {p.anno}
                  </div>
                  <div className="text-xs text-[#999]">Dovuto: €{p.importo_dovuto}</div>
                </div>
                <div className="text-right">
                  <div className={clsx('text-xs font-medium px-2 py-0.5 rounded',
                    p.stato==='pagato' ? 'bg-green-100 text-green-600'
                    : p.stato==='scaduto' ? 'bg-red-100 text-red-600'
                    : p.stato==='parzialmente_pagato' ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-gray-100 text-gray-500')}>
                    {p.stato==='pagato'?'Pagato':p.stato==='scaduto'?'Scaduto':p.stato==='parzialmente_pagato'?'Parz. pagato':'Da pagare'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ultime comunicazioni */}
      {announcements.length > 0 && (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide">Ultime comunicazioni</h2>
            <Link to="/genitore/bacheca" className="text-xs text-[#27ae60] hover:underline">Vedi tutte →</Link>
          </div>
          <div className="space-y-2">
            {announcements.map(a => (
              <div key={a.id} className="py-2 border-b border-[#e7eaec] last:border-0">
                <div className="text-[#2f4050] text-sm font-medium">{a.titolo}</div>
                <div className="text-xs text-[#999] mt-0.5">{format(new Date(a.created_at), 'd MMM yyyy', { locale: it })}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

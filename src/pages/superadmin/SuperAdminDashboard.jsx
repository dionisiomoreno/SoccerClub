import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Building2, CreditCard, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

function KpiCard({ icon: Icon, label, value, color = '#e94560', sub }) {
  return (
    <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[#999] uppercase tracking-wide">{label}</span>
        <div className="w-9 h-9 rounded flex items-center justify-center" style={{ background: color + '18' }}>
          <Icon size={18} style={{ color }}/>
        </div>
      </div>
      <div className="text-2xl font-bold text-[#2f4050]">{value}</div>
      {sub && <div className="text-xs text-[#999] mt-1">{sub}</div>}
    </div>
  )
}

export default function SuperAdminDashboard() {
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('clubs')
      .select('*')
      .order('created_at', { ascending: false })
    setClubs(data || [])
    setLoading(false)
  }

  const active    = clubs.filter(c => c.stato === 'active').length
  const trial     = clubs.filter(c => c.stato === 'trial').length
  const suspended = clubs.filter(c => c.stato === 'suspended').length
  const expired   = clubs.filter(c => c.stato === 'expired').length

  // Licenze in scadenza entro 7 giorni
  const expiringSoon = clubs.filter(c => {
    if (!c.license_expires_at) return false
    const days = differenceInDays(new Date(c.license_expires_at), new Date())
    return days >= 0 && days <= 7
  })

  // MRR stimato
  const PREZZI = { starter: 19, pro: 39, full: 59 }
  const mrr = clubs
    .filter(c => c.stato === 'active')
    .reduce((s, c) => s + (PREZZI[c.piano] || 0), 0)

  const STATO_COLORS = {
    active:    'bg-green-100 text-green-600',
    trial:     'bg-blue-100 text-blue-600',
    suspended: 'bg-yellow-100 text-yellow-600',
    expired:   'bg-red-100 text-red-600',
  }
  const PIANO_COLORS = {
    starter: 'bg-gray-100 text-gray-600',
    pro:     'bg-purple-100 text-purple-600',
    full:    'bg-[#e94560]/10 text-[#e94560]',
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#e94560] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="border-b border-[#e7eaec] pb-4">
        <h1 className="text-2xl font-bold text-[#2f4050]">Dashboard</h1>
        <p className="text-sm text-[#999] mt-1">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: it })}
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Building2}  label="Squadre totali"  value={clubs.length}  color="#e94560"/>
        <KpiCard icon={CheckCircle} label="Attive"         value={active}        color="#1ab394"/>
        <KpiCard icon={Clock}       label="In trial"       value={trial}         color="#1c84c6"/>
        <KpiCard icon={TrendingUp}  label="MRR stimato"    value={`€${mrr}`}     color="#f8ac59" sub="solo piani attivi"/>
      </div>

      {/* Alert scadenze */}
      {expiringSoon.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-yellow-600"/>
            <span className="text-yellow-700 font-semibold text-sm">
              {expiringSoon.length} licenza/e in scadenza entro 7 giorni
            </span>
          </div>
          <div className="space-y-2">
            {expiringSoon.map(c => {
              const days = differenceInDays(new Date(c.license_expires_at), new Date())
              return (
                <div key={c.id} className="flex items-center justify-between bg-white rounded p-3 border border-yellow-200">
                  <div>
                    <span className="text-[#2f4050] font-medium text-sm">{c.nome}</span>
                    <span className="ml-2 text-xs text-[#999]">{c.citta}</span>
                  </div>
                  <span className="text-yellow-600 text-xs font-semibold">
                    {days === 0 ? 'Scade oggi!' : `${days} giorni`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista squadre */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e7eaec] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide">
            Tutte le squadre ({clubs.length})
          </h2>
        </div>
        {clubs.length === 0 ? (
          <div className="text-center text-[#999] py-10 text-sm">Nessuna squadra registrata</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e7eaec] bg-gray-50">
                  {['Squadra', 'Piano', 'Stato', 'Scadenza', 'Registrata'].map(h => (
                    <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clubs.map(c => {
                  const days = c.license_expires_at
                    ? differenceInDays(new Date(c.license_expires_at), new Date())
                    : null
                  return (
                    <tr key={c.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-[#2f4050] font-medium">{c.nome}</div>
                        <div className="text-xs text-[#999]">{c.citta} · {c.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium capitalize', PIANO_COLORS[c.piano])}>
                          {c.piano}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium capitalize', STATO_COLORS[c.stato])}>
                          {c.stato}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#999] text-xs">
                        {c.license_expires_at
                          ? <span className={clsx(days !== null && days <= 7 && 'text-yellow-600 font-semibold')}>
                              {format(new Date(c.license_expires_at), 'dd/MM/yyyy')}
                              {days !== null && days <= 7 && ` (${days}gg)`}
                            </span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-[#999] text-xs">
                        {format(new Date(c.created_at), 'dd/MM/yyyy')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats per piano */}
      <div className="grid grid-cols-3 gap-4">
        {['starter','pro','full'].map(piano => {
          const count = clubs.filter(c => c.piano === piano && c.stato === 'active').length
          return (
            <div key={piano} className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
              <span className={clsx('px-2 py-0.5 rounded text-xs font-medium capitalize', PIANO_COLORS[piano])}>{piano}</span>
              <div className="text-2xl font-bold text-[#2f4050] mt-2">{count}</div>
              <div className="text-xs text-[#999]">squadre attive</div>
              <div className="text-xs text-[#1ab394] font-semibold mt-1">€{count * (PREZZI[piano]||0)}/mese</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

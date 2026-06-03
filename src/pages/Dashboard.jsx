import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Users, Dumbbell, Trophy, Euro, FileText, Package, AlertTriangle } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'

function KpiCard({ icon: Icon, label, value, sub, color = '#1ab394' }) {
  return (
    <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[#999] uppercase tracking-wide">{label}</span>
        <div className="w-9 h-9 rounded flex items-center justify-center" style={{ background: color + '18' }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-[#2f4050]">{value}</div>
      {sub && <div className="text-xs text-[#999] mt-1">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { profile, isAdmin, isMister, isPlayer } = useAuth()
  const [kpi, setKpi] = useState({})
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) load() }, [profile])

  async function load() {
    const now = new Date()
    const monthStart = startOfMonth(now).toISOString()
    const monthEnd = endOfMonth(now).toISOString()

    if (isAdmin || isMister) {
      const [players, trainings, matches, payslips, requests, docs] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('active', true),
        supabase.from('attendances').select('id', { count: 'exact' }).eq('type', 'training'),
        supabase.from('attendances').select('id', { count: 'exact' }).eq('type', 'match'),
        supabase.from('payslips').select('netto').gte('created_at', monthStart).lte('created_at', monthEnd),
        supabase.from('material_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('documents').select('expiry_date').lte('expiry_date', format(subMonths(now, -1), 'yyyy-MM-dd'))
      ])
      const rimborsiMese = (payslips.data || []).reduce((s, p) => s + (p.netto || 0), 0)
      const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i))
      const chartArr = await Promise.all(months.map(async m => {
        const { data } = await supabase.from('payslips').select('netto')
          .gte('created_at', startOfMonth(m).toISOString())
          .lte('created_at', endOfMonth(m).toISOString())
        return { name: format(m, 'MMM', { locale: it }), rimborsi: (data || []).reduce((s, p) => s + (p.netto || 0), 0) }
      }))
      setKpi({ players: players.count || 0, trainings: trainings.count || 0, matches: matches.count || 0, rimborsiMese, requests: requests.count || 0, docs: docs.count || 0 })
      setChartData(chartArr)
    } else {
      const [attMese, attTotali, payslip] = await Promise.all([
        supabase.from('attendances').select('type').eq('player_id', profile.id).gte('date', monthStart).lte('date', monthEnd),
        supabase.from('attendances').select('type').eq('player_id', profile.id),
        supabase.from('payslips').select('netto').eq('player_id', profile.id).order('created_at', { ascending: false }).limit(1)
      ])
      const att = attMese.data || []
      const trainings = att.filter(a => a.type === 'training').length
      const matches = att.filter(a => a.type === 'match').length
      const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i))
      const chartArr = await Promise.all(months.map(async m => {
        const { data } = await supabase.from('attendances').select('id', { count: 'exact' }).eq('player_id', profile.id).gte('date', startOfMonth(m).toISOString()).lte('date', endOfMonth(m).toISOString())
        return { name: format(m, 'MMM', { locale: it }), presenze: data?.length || 0 }
      }))
      setKpi({ trainings, matches, rimborso: trainings * 20 + matches * 30, lastPayslip: payslip.data?.[0]?.netto ?? '-', totAtt: (attTotali.data || []).length })
      setChartData(chartArr)
    }
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="border-b border-[#e7eaec] pb-4">
        <h1 className="text-2xl font-bold text-[#2f4050]">Dashboard</h1>
        <p className="text-sm text-[#999] mt-1">
          Bentornato, <strong className="text-[#676a6c]">{profile?.nome}</strong> — {format(new Date(), "EEEE d MMMM yyyy", { locale: it })}
        </p>
      </div>

      {(isAdmin || isMister) ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={Users} label="Calciatori attivi" value={kpi.players} color="#1ab394"/>
            <KpiCard icon={Dumbbell} label="Allenamenti totali" value={kpi.trainings} color="#1c84c6"/>
            <KpiCard icon={Trophy} label="Partite totali" value={kpi.matches} color="#f8ac59"/>
            <KpiCard icon={Euro} label="Rimborsi mese" value={`€${kpi.rimborsiMese}`} color="#23c6c8"/>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <KpiCard icon={FileText} label="Cedolini pending" value="-" color="#9b59b6"/>
            <KpiCard icon={Package} label="Richieste materiale" value={kpi.requests} color="#f8ac59"/>
            <KpiCard icon={AlertTriangle} label="Documenti in scadenza" value={kpi.docs} color="#ed5565"/>
          </div>
          <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide">Rimborsi mensili</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: '#999', fontSize: 12 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#999', fontSize: 12 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e7eaec', borderRadius: 4, fontSize: 12 }}/>
                <Bar dataKey="rimborsi" fill="#1ab394" radius={[2,2,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={Dumbbell} label="Allenamenti mese" value={kpi.trainings} color="#1c84c6"/>
            <KpiCard icon={Trophy} label="Partite mese" value={kpi.matches} color="#f8ac59"/>
            <KpiCard icon={Euro} label="Rimborso stimato" value={`€${kpi.rimborso}`} color="#1ab394"/>
            <KpiCard icon={Users} label="Presenze totali" value={kpi.totAtt} color="#23c6c8"/>
          </div>
          <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide">Presenze per mese</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: '#999', fontSize: 12 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#999', fontSize: 12 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e7eaec', borderRadius: 4, fontSize: 12 }}/>
                <Line dataKey="presenze" stroke="#1ab394" strokeWidth={2} dot={{ fill: '#1ab394', r: 4 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

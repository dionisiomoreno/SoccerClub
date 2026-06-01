import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Users, Dumbbell, Trophy, Euro, FileText, Package, AlertTriangle } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'

function KpiCard({ icon: Icon, label, value, sub, color = '#C00000' }) {
  return (
    <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: color + '20' }}>
          <Icon size={18} style={{ color }} />
        </div>
        <span className="text-[#6B7280] text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-[#6B7280] mt-1">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { profile, isAdmin, isMister, isPlayer } = useAuth()
  const [kpi, setKpi] = useState({})
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) load()
  }, [profile])

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

      // Chart: rimborsi ultimi 6 mesi
      const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i))
      const chartArr = await Promise.all(months.map(async m => {
        const { data } = await supabase.from('payslips').select('netto')
          .gte('created_at', startOfMonth(m).toISOString())
          .lte('created_at', endOfMonth(m).toISOString())
        return {
          name: format(m, 'MMM', { locale: it }),
          rimborsi: (data || []).reduce((s, p) => s + (p.netto || 0), 0)
        }
      }))

      setKpi({
        players: players.count || 0,
        trainings: trainings.count || 0,
        matches: matches.count || 0,
        rimborsiMese,
        requests: requests.count || 0,
        docs: docs.count || 0
      })
      setChartData(chartArr)
    } else {
      const [attMese, attTotali, payslip] = await Promise.all([
        supabase.from('attendances').select('type').eq('player_id', profile.id)
          .gte('date', monthStart).lte('date', monthEnd),
        supabase.from('attendances').select('type').eq('player_id', profile.id),
        supabase.from('payslips').select('netto').eq('player_id', profile.id)
          .order('created_at', { ascending: false }).limit(1)
      ])

      const att = attMese.data || []
      const trainings = att.filter(a => a.type === 'training').length
      const matches = att.filter(a => a.type === 'match').length
      const rimborso = trainings * 20 + matches * 30

      const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i))
      const chartArr = await Promise.all(months.map(async m => {
        const { data } = await supabase.from('attendances').select('id', { count: 'exact' })
          .eq('player_id', profile.id)
          .gte('date', startOfMonth(m).toISOString())
          .lte('date', endOfMonth(m).toISOString())
        return { name: format(m, 'MMM', { locale: it }), presenze: data?.length || 0 }
      }))

      setKpi({
        trainings,
        matches,
        rimborso,
        lastPayslip: payslip.data?.[0]?.netto ?? '-',
        totAtt: (attTotali.data || []).length
      })
      setChartData(chartArr)
    }
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#C00000] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Ciao, {profile?.nome}! 👋</h1>
        <p className="text-[#6B7280] text-sm mt-1">{format(new Date(), "EEEE d MMMM yyyy", { locale: it })}</p>
      </div>

      {(isAdmin || isMister) ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard icon={Users} label="Calciatori attivi" value={kpi.players} color="#C00000"/>
            <KpiCard icon={Dumbbell} label="Allenamenti totali" value={kpi.trainings} color="#3B82F6"/>
            <KpiCard icon={Trophy} label="Partite totali" value={kpi.matches} color="#F59E0B"/>
            <KpiCard icon={Euro} label="Rimborsi mese" value={`€${kpi.rimborsiMese}`} color="#10B981"/>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <KpiCard icon={FileText} label="Cedolini pending" value="-" color="#8B5CF6"/>
            <KpiCard icon={Package} label="Richieste materiale" value={kpi.requests} color="#F59E0B"/>
            <KpiCard icon={AlertTriangle} label="Documenti in scadenza" value={kpi.docs} color="#EF4444"/>
          </div>
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-white mb-4">Rimborsi mensili</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} labelStyle={{ color: '#F5F5F5' }}/>
                <Bar dataKey="rimborsi" fill="#C00000" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard icon={Dumbbell} label="Allenamenti mese" value={kpi.trainings} color="#3B82F6"/>
            <KpiCard icon={Trophy} label="Partite mese" value={kpi.matches} color="#F59E0B"/>
            <KpiCard icon={Euro} label="Rimborso stimato" value={`€${kpi.rimborso}`} color="#10B981"/>
            <KpiCard icon={Users} label="Presenze totali" value={kpi.totAtt} color="#C00000"/>
          </div>
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-white mb-4">Presenze per mese</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} labelStyle={{ color: '#F5F5F5' }}/>
                <Line dataKey="presenze" stroke="#C00000" strokeWidth={2} dot={{ fill: '#C00000' }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

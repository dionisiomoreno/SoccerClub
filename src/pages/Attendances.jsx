import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Dumbbell, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

export default function Attendances() {
  const { profile, isAdmin, isMister } = useAuth()
  const [attendances, setAttendances] = useState([])
  const [players, setPlayers] = useState([])
  const [filterPlayer, setFilterPlayer] = useState('')
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [todayAtt, setTodayAtt] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [filterMonth, filterPlayer])

  async function load() {
    setLoading(true)
    const [y, m] = filterMonth.split('-')
    const start = startOfMonth(new Date(+y, +m - 1)).toISOString()
    const end = endOfMonth(new Date(+y, +m - 1)).toISOString()

    let q = supabase.from('attendances').select('*, profiles(nome,cognome)').gte('date', start).lte('date', end).order('date', { ascending: false })
    if (!isAdmin && !isMister) q = q.eq('player_id', profile.id)
    else if (filterPlayer) q = q.eq('player_id', filterPlayer)

    const { data } = await q
    setAttendances(data || [])

    if (!isAdmin && !isMister) {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: td } = await supabase.from('attendances').select('type').eq('player_id', profile.id).eq('date', today)
      setTodayAtt((td || []).map(a => a.type))
    }

    if (isAdmin || isMister) {
      const { data: pl } = await supabase.from('profiles').select('id,nome,cognome').eq('active', true).order('cognome')
      setPlayers(pl || [])
    }

    setLoading(false)
  }

  async function register(type) {
    const today = format(new Date(), 'yyyy-MM-dd')
    if (todayAtt.includes(type)) return
    const { error } = await supabase.from('attendances').insert([{ player_id: profile.id, type, date: today, amount: type === 'training' ? 20 : 30 }])
    if (error) toast.error(error.message)
    else { toast.success(`${type === 'training' ? 'Allenamento' : 'Partita'} registrata!`); load() }
  }

  const [y, m] = filterMonth.split('-')
  const monthAtt = attendances.filter(a => !isAdmin && !isMister ? true : true)
  const trainings = monthAtt.filter(a => a.type === 'training').length
  const matches = monthAtt.filter(a => a.type === 'match').length
  const total = trainings * 20 + matches * 30

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Presenze</h1>

      {!isAdmin && !isMister && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { type: 'training', label: 'Allenamento', sub: '+€20', icon: Dumbbell, color: '#3B82F6' },
            { type: 'match', label: 'Partita', sub: '+€30', icon: Trophy, color: '#F59E0B' }
          ].map(({ type, label, sub, icon: Icon, color }) => {
            const done = todayAtt.includes(type)
            return (
              <button key={type} onClick={() => register(type)} disabled={done}
                className={clsx('flex flex-col items-center justify-center gap-2 p-6 rounded-xl border transition-all',
                  done ? 'bg-green-500/10 border-green-500/30 cursor-default' : 'bg-[#1E1E1E] border-[#2A2A2A] hover:border-[#C00000] cursor-pointer')}>
                <Icon size={28} style={{ color: done ? '#4ade80' : color }}/>
                <span className="text-white font-semibold">{done ? '✓ ' : ''}{label}</span>
                <span className="text-xs" style={{ color: done ? '#4ade80' : '#6B7280' }}>{done ? 'Già registrato' : sub}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{trainings}</div>
          <div className="text-xs text-[#6B7280] mt-1">Allenamenti</div>
        </div>
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{matches}</div>
          <div className="text-xs text-[#6B7280] mt-1">Partite</div>
        </div>
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">€{total}</div>
          <div className="text-xs text-[#6B7280] mt-1">Totale mese</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"/>
        {(isAdmin || isMister) && (
          <select value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}
            className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none flex-1">
            <option value="">Tutti i calciatori</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
          </select>
        )}
      </div>

      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-24"><div className="w-6 h-6 border-2 border-[#C00000] border-t-transparent rounded-full animate-spin"/></div>
        ) : attendances.length === 0 ? (
          <div className="text-center text-[#6B7280] py-10 text-sm">Nessuna presenza registrata</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                {(isAdmin || isMister) && <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Calciatore</th>}
                <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Tipo</th>
                <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Data</th>
                <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Importo</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map(a => (
                <tr key={a.id} className="border-b border-[#2A2A2A] hover:bg-[#2A2A2A]/30">
                  {(isAdmin || isMister) && (
                    <td className="px-4 py-3 text-white">{a.profiles?.cognome} {a.profiles?.nome}</td>
                  )}
                  <td className="px-4 py-3">
                    <span className={clsx('flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full text-xs font-medium',
                      a.type === 'training' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400')}>
                      {a.type === 'training' ? <><Dumbbell size={11}/> Allenamento</> : <><Trophy size={11}/> Partita</>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6B7280]">{format(new Date(a.date), 'dd MMM yyyy', { locale: it })}</td>
                  <td className="px-4 py-3 text-green-400 font-medium">+€{a.amount}</td>
                </tr>
              ))}
              <tr className="bg-[#2A2A2A]/30">
                <td colSpan={(isAdmin || isMister) ? 3 : 2} className="px-4 py-3 text-[#6B7280] text-xs font-medium">Totale mese</td>
                <td className="px-4 py-3 text-green-400 font-bold">+€{total}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

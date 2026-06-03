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

  const trainings = attendances.filter(a => a.type === 'training').length
  const matches = attendances.filter(a => a.type === 'match').length
  const total = trainings * 20 + matches * 30

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4">
        <h1 className="text-2xl font-bold text-[#2f4050]">Presenze</h1>
        <p className="text-sm text-[#999] mt-1">Registro presenze allenamenti e partite</p>
      </div>

      {!isAdmin && !isMister && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { type: 'training', label: 'Allenamento', sub: '+€20', icon: Dumbbell, color: '#1c84c6' },
            { type: 'match', label: 'Partita', sub: '+€30', icon: Trophy, color: '#f8ac59' }
          ].map(({ type, label, sub, icon: Icon, color }) => {
            const done = todayAtt.includes(type)
            return (
              <button key={type} onClick={() => register(type)} disabled={done}
                className={clsx('flex flex-col items-center justify-center gap-2 p-6 rounded border transition-all shadow-sm',
                  done ? 'bg-green-50 border-green-200 cursor-default' : 'bg-white border-[#e7eaec] hover:border-[#1ab394] cursor-pointer hover:shadow-md')}>
                <Icon size={28} style={{ color: done ? '#1ab394' : color }}/>
                <span className="text-[#2f4050] font-semibold">{done ? '✓ ' : ''}{label}</span>
                <span className="text-xs" style={{ color: done ? '#1ab394' : '#999' }}>{done ? 'Già registrato oggi' : sub}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Allenamenti', value: trainings, color: '#1c84c6' },
          { label: 'Partite', value: matches, color: '#f8ac59' },
          { label: 'Totale mese', value: `€${total}`, color: '#1ab394' }
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs text-[#999] mt-1 uppercase tracking-wide font-semibold">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
        {(isAdmin || isMister) && (
          <select value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}
            className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none flex-1 focus:border-[#1ab394]">
            <option value="">Tutti i calciatori</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
          </select>
        )}
      </div>

      <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-24"><div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/></div>
        ) : attendances.length === 0 ? (
          <div className="text-center text-[#999] py-10 text-sm">Nessuna presenza registrata</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e7eaec] bg-gray-50">
                {(isAdmin || isMister) && <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Calciatore</th>}
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Tipo</th>
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Data</th>
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Importo</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map(a => (
                <tr key={a.id} className="border-b border-[#e7eaec] hover:bg-gray-50 transition-colors">
                  {(isAdmin || isMister) && <td className="px-4 py-3 text-[#2f4050] font-medium">{a.profiles?.cognome} {a.profiles?.nome}</td>}
                  <td className="px-4 py-3">
                    <span className={clsx('flex items-center gap-1.5 w-fit px-2 py-0.5 rounded text-xs font-medium',
                      a.type === 'training' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600')}>
                      {a.type === 'training' ? <><Dumbbell size={11}/> Allenamento</> : <><Trophy size={11}/> Partita</>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#999]">{format(new Date(a.date), 'dd MMM yyyy', { locale: it })}</td>
                  <td className="px-4 py-3 text-[#1ab394] font-medium">+€{a.amount}</td>
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td colSpan={(isAdmin || isMister) ? 3 : 2} className="px-4 py-3 text-[#999] text-xs font-semibold uppercase tracking-wide">Totale mese</td>
                <td className="px-4 py-3 text-[#1ab394] font-bold">+€{total}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

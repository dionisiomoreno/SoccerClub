import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Dumbbell, Trophy, MapPin, Loader, Fuel, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default function Attendances() {
  const { profile, isAdmin, isMister } = useAuth()
  const isVolunteer = profile?.role === 'player_volunteer'
  const isPaid      = profile?.role === 'player_paid'

  // Il mister PS non vede i rimborsi — solo admin li vede
  const showRimborsi = isAdmin || isPaid

  const [attendances, setAttendances]     = useState([])
  const [players, setPlayers]             = useState([])
  const [filterPlayer, setFilterPlayer]   = useState('')
  const [filterMonth, setFilterMonth]     = useState(format(new Date(), 'yyyy-MM'))
  const [todayAtt, setTodayAtt]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [geoLoading, setGeoLoading]       = useState(false)
  const [teamSettings, setTeamSettings]   = useState(null)
  const [todayTraining, setTodayTraining] = useState(null)
  const [todayMatch, setTodayMatch]       = useState(null)
  const [distance, setDistance]           = useState(null)
  const [geoTarget, setGeoTarget]         = useState(null)

  useEffect(() => { load() }, [filterMonth, filterPlayer])
  useEffect(() => { loadSettings(); loadTodayEvents() }, [profile])

  async function loadSettings() {
    const { data } = await supabase.from('team_settings').select('*').single()
    if (data) setTeamSettings(data)
  }

  async function loadTodayEvents() {
    const today = format(new Date(), 'yyyy-MM-dd')
    if (!profile?.category_id) {
      const { data: tr } = await supabase
        .from('trainings')
        .select('*, venues(nome,lat,lng,raggio_timbratura,indirizzo,citta)')
        .eq('data', today)
        .is('category_id', null)
        .limit(1)
        .maybeSingle()
      setTodayTraining(tr || null)
    }
    const { data: match } = await supabase
      .from('matches').select('*').eq('date', today).maybeSingle()
    setTodayMatch(match || null)
  }

  async function load() {
    setLoading(true)
    const [y, m] = filterMonth.split('-')
    const start = startOfMonth(new Date(+y, +m - 1)).toISOString()
    const end   = endOfMonth(new Date(+y, +m - 1)).toISOString()

    let q = supabase.from('attendances')
      .select('*, profiles(nome,cognome)')
      .gte('date', start).lte('date', end)
      .order('date', { ascending: false })

    if (!isAdmin && !isMister) q = q.eq('player_id', profile.id)
    else if (filterPlayer)     q = q.eq('player_id', filterPlayer)

    const { data } = await q
    setAttendances(data || [])

    if (!isAdmin && !isMister) {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: td } = await supabase.from('attendances').select('type')
        .eq('player_id', profile.id).eq('date', today)
      setTodayAtt((td || []).map(a => a.type))
    }

    if (isAdmin || isMister) {
      const { data: pl } = await supabase.from('profiles')
        .select('id,nome,cognome').eq('active', true).order('cognome')
      setPlayers(pl || [])
    }
    setLoading(false)
  }

  async function getTargetLocation(type) {
    if (type === 'training') {
      if (todayTraining?.venues?.lat && todayTraining?.venues?.lng) {
        const v = todayTraining.venues
        return {
          lat: v.lat, lng: v.lng,
          label: `${v.nome}${v.citta ? ` (${v.citta})` : ''}`,
          raggio: v.raggio_timbratura || 200
        }
      }
      if (teamSettings?.lat && teamSettings?.lng) {
        return {
          lat: teamSettings.lat, lng: teamSettings.lng,
          label: 'struttura principale',
          raggio: teamSettings.raggio_timbratura || 200
        }
      }
      return null
    }
    if (type === 'match' && todayMatch) {
      if (todayMatch.casa) {
        if (!teamSettings?.lat || !teamSettings?.lng) return null
        return {
          lat: teamSettings.lat, lng: teamSettings.lng,
          label: 'struttura di casa',
          raggio: teamSettings.raggio_timbratura || 200
        }
      } else {
        if (!todayMatch.indirizzo && !todayMatch.campo) return null
        toast.loading('Rilevando posizione campo avversario...')
        const address = todayMatch.indirizzo || todayMatch.campo
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
        const geodata = await res.json()
        toast.dismiss()
        if (!geodata?.length) {
          toast.error('Impossibile trovare il campo. Timbratura libera.')
          return null
        }
        return {
          lat: parseFloat(geodata[0].lat),
          lng: parseFloat(geodata[0].lon),
          label: `campo avversario (${todayMatch.avversario})`,
          raggio: teamSettings?.raggio_timbratura || 200
        }
      }
    }
    return null
  }

  async function register(type) {
    const today = format(new Date(), 'yyyy-MM-dd')
    if (todayAtt.includes(type)) return
    setGeoLoading(true)
    try {
      const target = await getTargetLocation(type)
      setGeoTarget(target)

      const importoBase = isVolunteer ? 0
        : type === 'training'
          ? (profile?.importo_allenamento ?? teamSettings?.importo_allenamento ?? 20)
          : (profile?.importo_partita ?? teamSettings?.importo_partita ?? 30)
      const carburante = isVolunteer ? 0
        : (profile?.importo_carburante ?? teamSettings?.importo_carburante ?? 0)

      if (type === 'training' && todayTraining && !target) {
        toast('Struttura senza GPS: timbratura libera', { icon: '⚠️' })
      }

      if (!target) {
        const { error } = await supabase.from('attendances').insert([{
          player_id: profile.id, type, date: today,
          amount: importoBase, rimborso_carburante: carburante,
          training_id: type === 'training' && todayTraining ? todayTraining.id : null
        }])
        if (error) toast.error(error.message)
        else {
          toast.success(
            !isVolunteer && carburante > 0
              ? `Registrata! +€${importoBase} + €${carburante} carburante`
              : `${type === 'training' ? 'Allenamento' : 'Partita'} registrata!`
          )
          load()
        }
        setGeoLoading(false)
        return
      }

      if (!navigator.geolocation) {
        toast.error('Geolocalizzazione non supportata')
        setGeoLoading(false)
        return
      }

      navigator.geolocation.getCurrentPosition(
        async pos => {
          const dist = getDistance(pos.coords.latitude, pos.coords.longitude, target.lat, target.lng)
          setDistance(Math.round(dist))
          if (dist > target.raggio) {
            toast.error(`Sei troppo lontano da ${target.label}! (${Math.round(dist)}m — max ${target.raggio}m)`)
            setGeoLoading(false)
            return
          }
          const { error } = await supabase.from('attendances').insert([{
            player_id: profile.id, type, date: today,
            amount: importoBase, rimborso_carburante: carburante,
            lat: pos.coords.latitude, lng: pos.coords.longitude,
            distance_meters: Math.round(dist),
            training_id: type === 'training' && todayTraining ? todayTraining.id : null
          }])
          if (error) toast.error(error.message)
          else {
            toast.success(
              !isVolunteer && carburante > 0
                ? `✅ Registrata a ${Math.round(dist)}m! +€${importoBase} + €${carburante} carburante`
                : `✅ Registrata a ${Math.round(dist)}m da ${target.label}!`
            )
            load()
          }
          setGeoLoading(false)
        },
        () => {
          toast.error('Impossibile rilevare la posizione. Controlla i permessi GPS.')
          setGeoLoading(false)
        }
      )
    } catch(e) {
      toast.error(e.message)
      setGeoLoading(false)
    }
  }

  const trainings = attendances.filter(a => a.type === 'training').length
  const matches   = attendances.filter(a => a.type === 'match').length
  const totalBase = attendances.reduce((s, a) => s + (a.amount || 0), 0)
  const totalCarb = attendances.reduce((s, a) => s + (a.rimborso_carburante || 0), 0)
  const total     = totalBase + totalCarb
  const geoActive = !!(todayTraining?.venues?.lat || teamSettings?.lat)

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4">
        <h1 className="text-2xl font-bold text-[#2f4050]">Presenze</h1>
        <p className="text-sm text-[#999] mt-1">Registro presenze allenamenti e partite</p>
      </div>

      {/* Info allenamento oggi — solo calciatori */}
      {!isAdmin && !isMister && todayTraining && (
        <div className="flex items-start gap-2 rounded p-3 text-sm border bg-blue-50 border-blue-200 text-blue-700">
          <Dumbbell size={15} className="mt-0.5 flex-shrink-0"/>
          <div>
            <span className="font-semibold">{todayTraining.titolo}</span>
            {todayTraining.ora_inizio && <span className="ml-1">— {todayTraining.ora_inizio.slice(0,5)}</span>}
            {todayTraining.venues && <span className="ml-1">@ {todayTraining.venues.nome}</span>}
            {todayTraining.venues?.lat
              ? <span className="ml-2 text-green-600 font-medium">✅ GPS attivo</span>
              : <span className="ml-2 text-yellow-600">⚠️ Nessun GPS</span>}
          </div>
        </div>
      )}

      {!isAdmin && !isMister && !todayTraining && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-700">
          <AlertTriangle size={15}/>
          Nessun allenamento pubblicato per oggi. La timbratura avverrà sulla struttura principale.
        </div>
      )}

      {!isAdmin && !isMister && todayMatch && (
        <div className={clsx('flex items-center gap-2 rounded p-3 text-sm border',
          todayMatch.casa ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-700')}>
          <Trophy size={15}/>
          {todayMatch.casa
            ? `Partita in casa oggi vs ${todayMatch.avversario}`
            : `Trasferta oggi vs ${todayMatch.avversario}${todayMatch.indirizzo ? ` — ${todayMatch.indirizzo}` : ''}`}
        </div>
      )}

      {!isAdmin && !isMister && isPaid && teamSettings?.importo_carburante > 0 && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
          <Fuel size={15}/>
          Rimborso carburante attivo: <strong className="mx-1">€{teamSettings.importo_carburante}</strong> per ogni presenza
        </div>
      )}

      {!isAdmin && !isMister && (
        <div className={clsx('flex items-center gap-2 rounded p-3 text-sm border',
          geoActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700')}>
          <MapPin size={15}/>
          {geoActive
            ? todayTraining?.venues
              ? `Timbratura su struttura allenamento: ${todayTraining.venues.nome} — raggio ${todayTraining.venues.raggio_timbratura}m`
              : `Timbratura sulla struttura principale — raggio ${teamSettings?.raggio_timbratura}m`
            : 'Timbratura libera — nessuna struttura GPS configurata'}
        </div>
      )}

      {distance !== null && !isAdmin && !isMister && (
        <div className={clsx('flex items-center gap-2 rounded p-3 text-sm border',
          distance <= (geoTarget?.raggio || 200)
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-600')}>
          <MapPin size={15}/>
          Sei a <strong className="mx-1">{distance}m</strong> da {geoTarget?.label || 'struttura'}
          {distance <= (geoTarget?.raggio || 200) ? ' ✅' : ' ❌ Troppo lontano'}
        </div>
      )}

      {/* Pulsanti timbratura — solo calciatori */}
      {!isAdmin && !isMister && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { type: 'training', label: 'Allenamento', icon: Dumbbell, color: '#1c84c6',
              importo: isPaid ? (profile?.importo_allenamento ?? teamSettings?.importo_allenamento ?? 20) : null },
            { type: 'match', label: 'Partita', icon: Trophy, color: '#f8ac59',
              importo: isPaid ? (profile?.importo_partita ?? teamSettings?.importo_partita ?? 30) : null }
          ].map(({ type, label, icon: Icon, color, importo }) => {
            const done = todayAtt.includes(type)
            const carb = isPaid ? (profile?.importo_carburante ?? teamSettings?.importo_carburante ?? 0) : 0
            return (
              <button key={type} onClick={() => register(type)} disabled={done || geoLoading}
                className={clsx(
                  'flex flex-col items-center justify-center gap-2 p-6 rounded border transition-all shadow-sm',
                  done ? 'bg-green-50 border-green-200 cursor-default'
                    : geoLoading ? 'bg-gray-50 border-[#e7eaec] cursor-wait'
                    : 'bg-white border-[#e7eaec] hover:border-[#1ab394] cursor-pointer hover:shadow-md'
                )}>
                {geoLoading
                  ? <Loader size={28} className="animate-spin text-[#999]"/>
                  : <Icon size={28} style={{ color: done ? '#1ab394' : color }}/>}
                <span className="text-[#2f4050] font-semibold">{done ? '✓ ' : ''}{label}</span>
                {!done && isPaid && importo != null && (
                  <span className="text-xs text-[#999]">
                    +€{importo}{carb > 0 ? ` + €${carb} carb.` : ''}
                  </span>
                )}
                {done && <span className="text-xs text-[#1ab394]">Già registrato oggi</span>}
                {geoActive && !done && (
                  <span className="text-xs text-[#999] flex items-center gap-1">
                    <MapPin size={10}/> Richiede GPS
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* KPI mese — mister vede solo allenamenti e partite, NO rimborsi */}
      <div className={clsx('grid gap-3', showRimborsi ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2')}>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{trainings}</div>
          <div className="text-xs text-[#999] mt-1 uppercase tracking-wide">Allenamenti</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{matches}</div>
          <div className="text-xs text-[#999] mt-1 uppercase tracking-wide">Partite</div>
        </div>
        {showRimborsi && (
          <>
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">€{totalCarb}</div>
              <div className="text-xs text-[#999] mt-1 uppercase tracking-wide flex items-center justify-center gap-1">
                <Fuel size={10}/> Carburante
              </div>
            </div>
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-[#1ab394]">€{total}</div>
              <div className="text-xs text-[#999] mt-1 uppercase tracking-wide">Totale mese</div>
            </div>
          </>
        )}
      </div>

      {/* Filtri */}
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

      {/* Tabella */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : attendances.length === 0 ? (
          <div className="text-center text-[#999] py-10 text-sm">Nessuna presenza registrata</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e7eaec] bg-gray-50">
                {(isAdmin || isMister) && (
                  <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Calciatore</th>
                )}
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Tipo</th>
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Data</th>
                {/* Colonne rimborsi — solo admin e calciatori paid */}
                {showRimborsi && (
                  <>
                    <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Base</th>
                    <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Carb.</th>
                  </>
                )}
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">GPS</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map(a => (
                <tr key={a.id} className="border-b border-[#e7eaec] hover:bg-gray-50 transition-colors">
                  {(isAdmin || isMister) && (
                    <td className="px-4 py-3 text-[#2f4050] font-medium">
                      {a.profiles?.cognome} {a.profiles?.nome}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'flex items-center gap-1.5 w-fit px-2 py-0.5 rounded text-xs font-medium',
                      a.type === 'training' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'
                    )}>
                      {a.type === 'training'
                        ? <><Dumbbell size={11}/> Allenamento</>
                        : <><Trophy size={11}/> Partita</>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#999]">
                    {format(new Date(a.date), 'dd MMM yyyy', { locale: it })}
                  </td>
                  {showRimborsi && (
                    <>
                      <td className="px-4 py-3 text-[#1ab394] font-medium">+€{a.amount}</td>
                      <td className="px-4 py-3">
                        {a.rimborso_carburante > 0
                          ? <span className="text-blue-500 font-medium flex items-center gap-1"><Fuel size={11}/>€{a.rimborso_carburante}</span>
                          : <span className="text-[#999]">—</span>}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    {a.distance_meters
                      ? <span className="flex items-center gap-1 text-xs text-green-600"><MapPin size={11}/>{a.distance_meters}m</span>
                      : <span className="text-xs text-[#999]">—</span>}
                  </td>
                </tr>
              ))}
              {/* Riga totale — solo admin e calciatori paid */}
              {showRimborsi && (
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={isAdmin ? 3 : 2} className="px-4 py-3 text-[#999] text-xs uppercase tracking-wide">
                    Totale mese
                  </td>
                  <td className="px-4 py-3 text-[#1ab394]">+€{totalBase}</td>
                  <td className="px-4 py-3 text-blue-500">+€{totalCarb}</td>
                  <td/>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

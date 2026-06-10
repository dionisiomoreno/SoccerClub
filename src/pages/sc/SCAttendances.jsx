import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Dumbbell, MapPin, Loader, AlertTriangle, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function SCAttendances() {
  const { profile, isAdmin, isSegreteria, isMister } = useAuth()
  const isStaff = isAdmin || isSegreteria || isMister

  const [attendances, setAttendances]     = useState([])
  const [players, setPlayers]             = useState([])
  const [filterPlayer, setFilterPlayer]   = useState('')
  const [filterMonth, setFilterMonth]     = useState(format(new Date(), 'yyyy-MM'))
  const [todayAtt, setTodayAtt]           = useState(false)   // già timbrato oggi
  const [loading, setLoading]             = useState(true)
  const [geoLoading, setGeoLoading]       = useState(false)
  const [teamSettings, setTeamSettings]   = useState(null)
  const [scTimbratura, setScTimbratura]   = useState(false)
  const [todayTraining, setTodayTraining] = useState(null)
  const [distance, setDistance]           = useState(null)
  const [geoTarget, setGeoTarget]         = useState(null)
  const [youthPlayer, setYouthPlayer]     = useState(null)   // profilo atleta SC

  useEffect(() => { loadSettings() }, [])
  useEffect(() => { loadTodayTraining() }, [profile])
  useEffect(() => { load() }, [filterMonth, filterPlayer])

  async function loadSettings() {
    const { data } = await supabase.from('team_settings').select('*').single()
    if (data) {
      setTeamSettings(data)
      setScTimbratura(data.sc_timbratura_abilitata ?? false)
    }
  }

  async function loadTodayTraining() {
    if (!profile?.category_id) return
    const today = format(new Date(), 'yyyy-MM-dd')

    // Allenamento SC di oggi per la categoria del mister/atleta
    const { data: tr } = await supabase
      .from('trainings')
      .select('*, venues(nome,lat,lng,raggio_timbratura,indirizzo,citta)')
      .eq('data', today)
      .eq('category_id', profile.category_id)
      .limit(1)
      .maybeSingle()
    setTodayTraining(tr || null)

    // Se è un atleta SC (tramite youth_players), carica il suo profilo atleta
    // e controlla se ha già timbrato oggi
    if (!isStaff) {
      const { data: yp } = await supabase
        .from('youth_players')
        .select('id, nome, cognome, categories(nome,colore)')
        .eq('user_id', profile.id)
        .maybeSingle()
      setYouthPlayer(yp || null)

      if (yp) {
        const { data: att } = await supabase
          .from('sc_attendances')
          .select('id')
          .eq('youth_player_id', yp.id)
          .eq('date', today)
          .maybeSingle()
        setTodayAtt(!!att)
      }
    }
  }

  async function load() {
    setLoading(true)
    const [y, m] = filterMonth.split('-')
    const start = startOfMonth(new Date(+y, +m - 1)).toISOString().split('T')[0]
    const end   = endOfMonth(new Date(+y, +m - 1)).toISOString().split('T')[0]

    if (isStaff) {
      // Staff vede tutti gli atleti della categoria
      let q = supabase
        .from('sc_attendances')
        .select('*, youth_players(nome,cognome,category_id), trainings(titolo,ora_inizio,venues(nome))')
        .gte('date', start).lte('date', end)
        .order('date', { ascending: false })

      if (profile?.category_id) q = q.eq('category_id', profile.category_id)
      if (filterPlayer)         q = q.eq('youth_player_id', filterPlayer)

      const { data } = await q
      setAttendances(data || [])

      // Lista atleti per filtro
      let pq = supabase.from('youth_players').select('id,nome,cognome').eq('active', true).order('cognome')
      if (profile?.category_id) pq = pq.eq('category_id', profile.category_id)
      const { data: pl } = await pq
      setPlayers(pl || [])
    } else {
      // Atleta vede solo le proprie
      if (!youthPlayer) { setLoading(false); return }
      const { data } = await supabase
        .from('sc_attendances')
        .select('*, trainings(titolo,ora_inizio,venues(nome))')
        .eq('youth_player_id', youthPlayer.id)
        .gte('date', start).lte('date', end)
        .order('date', { ascending: false })
      setAttendances(data || [])
    }
    setLoading(false)
  }

  async function register() {
    if (todayAtt || !youthPlayer) return
    if (!scTimbratura) return toast.error('Timbratura non abilitata dalla società')

    const today = format(new Date(), 'yyyy-MM-dd')
    setGeoLoading(true)

    try {
      // Struttura GPS: prima dall'allenamento pubblicato, poi dalla struttura principale
      let target = null
      if (todayTraining?.venues?.lat && todayTraining?.venues?.lng) {
        const v = todayTraining.venues
        target = {
          lat: v.lat, lng: v.lng,
          label: v.nome,
          raggio: v.raggio_timbratura || 200
        }
      } else if (teamSettings?.lat && teamSettings?.lng) {
        target = {
          lat: teamSettings.lat, lng: teamSettings.lng,
          label: 'struttura principale',
          raggio: teamSettings.raggio_timbratura || 200
        }
      }
      setGeoTarget(target)

      // Nessuna struttura GPS → timbratura libera
      if (!target) {
        const { error } = await supabase.from('sc_attendances').insert([{
          youth_player_id: youthPlayer.id,
          category_id: youthPlayer.category_id || profile.category_id,
          training_id: todayTraining?.id || null,
          date: today,
        }])
        if (error) toast.error(error.message)
        else { toast.success('Presenza registrata!'); setTodayAtt(true); load() }
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

          const { error } = await supabase.from('sc_attendances').insert([{
            youth_player_id: youthPlayer.id,
            category_id: youthPlayer.category_id || profile.category_id,
            training_id: todayTraining?.id || null,
            date: today,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            distance_meters: Math.round(dist),
          }])
          if (error) toast.error(error.message)
          else {
            toast.success(`✅ Presenza registrata a ${Math.round(dist)}m da ${target.label}!`)
            setTodayAtt(true)
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

  const totMese = attendances.length

  // --- RENDER ---

  // Atleta senza timbratura abilitata
  if (!isStaff && !scTimbratura) {
    return (
      <div className="space-y-5">
        <div className="border-b border-[#e7eaec] pb-4">
          <h1 className="text-2xl font-bold text-[#2f4050]">Presenze SC</h1>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-10 text-center">
          <Lock size={32} className="mx-auto text-[#999] mb-3"/>
          <p className="text-[#999] text-sm">La timbratura presenze non è attiva per la Scuola Calcio.</p>
          <p className="text-xs text-[#999] mt-1">Contatta la segreteria per informazioni.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4">
        <h1 className="text-2xl font-bold text-[#2f4050]">Presenze SC</h1>
        <p className="text-sm text-[#999] mt-1">
          {isStaff ? 'Registro presenze Scuola Calcio' : `Timbratura allenamenti`}
        </p>
      </div>

      {/* Info allenamento pubblicato oggi */}
      {todayTraining ? (
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
      ) : (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-700">
          <AlertTriangle size={15}/>
          Nessun allenamento pubblicato per oggi.
        </div>
      )}

      {/* Distanza rilevata */}
      {distance !== null && !isStaff && (
        <div className={clsx('flex items-center gap-2 rounded p-3 text-sm border',
          distance <= (geoTarget?.raggio || 200)
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-600')}>
          <MapPin size={15}/>
          Sei a <strong className="mx-1">{distance}m</strong> da {geoTarget?.label}
          {distance <= (geoTarget?.raggio || 200) ? ' ✅' : ' ❌ Troppo lontano'}
        </div>
      )}

      {/* Pulsante timbratura atleta */}
      {!isStaff && youthPlayer && (
        <button
          onClick={register}
          disabled={todayAtt || geoLoading}
          className={clsx(
            'w-full flex flex-col items-center justify-center gap-3 py-10 rounded border-2 transition-all',
            todayAtt
              ? 'bg-green-50 border-green-200 cursor-default'
              : geoLoading
                ? 'bg-gray-50 border-[#e7eaec] cursor-wait'
                : 'bg-white border-[#e7eaec] hover:border-[#27ae60] hover:shadow-md cursor-pointer'
          )}>
          {geoLoading
            ? <Loader size={36} className="animate-spin text-[#999]"/>
            : <Dumbbell size={36} style={{ color: todayAtt ? '#27ae60' : '#27ae60' }}/>}
          <span className="text-[#2f4050] font-bold text-lg">
            {todayAtt ? '✓ Presenza registrata' : 'Timbra presenza'}
          </span>
          {!todayAtt && (
            <span className="text-xs text-[#999] flex items-center gap-1">
              {todayTraining?.venues?.lat || teamSettings?.lat
                ? <><MapPin size={10}/> Richiede GPS</>
                : 'Timbratura libera'}
            </span>
          )}
          {todayAtt && <span className="text-sm text-green-600">Già registrato oggi</span>}
        </button>
      )}

      {/* Atleta non collegato */}
      {!isStaff && !youthPlayer && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
          <AlertTriangle size={28} className="mx-auto text-yellow-500 mb-2"/>
          <p className="text-yellow-700 text-sm">Nessun profilo atleta collegato al tuo account.</p>
          <p className="text-xs text-yellow-600 mt-1">Contatta la segreteria.</p>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-[#27ae60]">{totMese}</div>
          <div className="text-xs text-[#999] mt-1 uppercase tracking-wide">Presenze mese</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-[#2f4050]">
            {attendances.filter(a => a.distance_meters).length}
          </div>
          <div className="text-xs text-[#999] mt-1 uppercase tracking-wide">Con GPS</div>
        </div>
      </div>

      {/* Filtri staff */}
      {isStaff && (
        <div className="flex gap-2 flex-wrap">
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]"/>
          <select value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}
            className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none flex-1 focus:border-[#27ae60]">
            <option value="">Tutti gli atleti</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
          </select>
        </div>
      )}

      {/* Tabella */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-6 h-6 border-2 border-[#27ae60] border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : attendances.length === 0 ? (
          <div className="text-center text-[#999] py-10 text-sm">Nessuna presenza registrata</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e7eaec] bg-gray-50">
                {isStaff && <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Atleta</th>}
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Data</th>
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Allenamento</th>
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">GPS</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map(a => (
                <tr key={a.id} className="border-b border-[#e7eaec] hover:bg-gray-50 transition-colors">
                  {isStaff && (
                    <td className="px-4 py-3 text-[#2f4050] font-medium">
                      {a.youth_players?.cognome} {a.youth_players?.nome}
                    </td>
                  )}
                  <td className="px-4 py-3 text-[#999]">
                    {format(new Date(a.date), 'dd MMM yyyy', { locale: it })}
                  </td>
                  <td className="px-4 py-3 text-[#676a6c] text-xs">
                    {a.trainings
                      ? `${a.trainings.titolo}${a.trainings.ora_inizio ? ` — ${a.trainings.ora_inizio.slice(0,5)}` : ''}${a.trainings.venues ? ` @ ${a.trainings.venues.nome}` : ''}`
                      : <span className="text-[#999]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {a.distance_meters
                      ? <span className="flex items-center gap-1 text-xs text-green-600"><MapPin size={11}/>{a.distance_meters}m</span>
                      : <span className="text-xs text-[#999]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

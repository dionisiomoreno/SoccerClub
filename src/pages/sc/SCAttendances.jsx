import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Dumbbell, MapPin, AlertTriangle, Check, Save, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

export default function SCAttendances() {
  const { profile, isAdmin, isSegreteria, isMister } = useAuth()

  const [players, setPlayers]           = useState([])
  const [selected, setSelected]         = useState([])   // ids presenti oggi
  const [savedToday, setSavedToday]     = useState([])   // ids già salvati oggi
  const [todayTraining, setTodayTraining] = useState(null)
  const [attendances, setAttendances]   = useState([])   // storico
  const [filterMonth, setFilterMonth]   = useState(format(new Date(), 'yyyy-MM'))
  const [filterPlayer, setFilterPlayer] = useState('')
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [showHistory, setShowHistory]   = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const categoryId = profile?.category_id || null

  useEffect(() => { loadAll() }, [])
  useEffect(() => { loadHistory() }, [filterMonth, filterPlayer])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadPlayers(), loadTodayTraining(), loadTodayAttendances()])
    setLoading(false)
  }

  async function loadPlayers() {
    let q = supabase.from('youth_players')
      .select('id, nome, cognome, numero_maglia, categories(nome,colore)')
      .eq('active', true).order('cognome')
    if (categoryId) q = q.eq('category_id', categoryId)
    const { data } = await q
    setPlayers(data || [])
  }

  async function loadTodayTraining() {
    let q = supabase.from('trainings')
      .select('*, venues(nome,lat,lng,raggio_timbratura,citta)')
      .eq('data', today)
    if (categoryId) q = q.eq('category_id', categoryId)
    const { data } = await q
    setTodayTraining(data?.[0] || null)
  }

  async function loadTodayAttendances() {
    let q = supabase.from('sc_attendances')
      .select('youth_player_id')
      .eq('date', today)
    if (categoryId) q = q.eq('category_id', categoryId)
    const { data } = await q
    const ids = (data || []).map(a => a.youth_player_id)
    setSavedToday(ids)
    setSelected(ids)
  }

  async function loadHistory() {
    const [y, m] = filterMonth.split('-')
    const start = startOfMonth(new Date(+y, +m - 1)).toISOString().split('T')[0]
    const end   = endOfMonth(new Date(+y, +m - 1)).toISOString().split('T')[0]

    let q = supabase.from('sc_attendances')
      .select('*, youth_players(nome,cognome), trainings(titolo,ora_inizio,venues(nome))')
      .gte('date', start).lte('date', end)
      .order('date', { ascending: false })
    if (categoryId) q = q.eq('category_id', categoryId)
    if (filterPlayer) q = q.eq('youth_player_id', filterPlayer)
    const { data } = await q
    setAttendances(data || [])
  }

  function togglePlayer(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  function selectAll()  { setSelected(players.map(p => p.id)) }
  function selectNone() { setSelected([]) }

  async function saveAttendances() {
    setSaving(true)
    try {
      // Elimina le presenze di oggi per questa categoria (ricreazione completa)
      let delQ = supabase.from('sc_attendances').delete().eq('date', today)
      if (categoryId) delQ = delQ.eq('category_id', categoryId)
      await delQ

      // Inserisci le presenze selezionate
      if (selected.length > 0) {
        const rows = selected.map(pid => ({
          youth_player_id: pid,
          category_id: categoryId,
          training_id: todayTraining?.id || null,
          date: today,
        }))
        const { error } = await supabase.from('sc_attendances').insert(rows)
        if (error) throw new Error(error.message)
      }

      setSavedToday(selected)
      toast.success(`Presenze salvate: ${selected.length} atleti`)
      loadHistory()
    } catch(e) {
      toast.error(e.message)
    }
    setSaving(false)
  }

  // Raggruppa storico per data
  const byDate = attendances.reduce((acc, a) => {
    const d = a.date
    if (!acc[d]) acc[d] = []
    acc[d].push(a)
    return acc
  }, {})

  const hasChanges = JSON.stringify([...selected].sort()) !== JSON.stringify([...savedToday].sort())

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#27ae60] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4">
        <h1 className="text-2xl font-bold text-[#2f4050]">Presenze SC</h1>
        <p className="text-sm text-[#999] mt-1">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: it })}
        </p>
      </div>

      {/* Info allenamento oggi */}
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
          Nessun allenamento pubblicato per oggi — puoi comunque registrare le presenze.
        </div>
      )}

      {/* Lista atleti — presenze oggi */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e7eaec]">
          <h2 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide">
            Presenti oggi ({selected.length}/{players.length})
          </h2>
          <div className="flex gap-3">
            <button onClick={selectAll} className="text-xs text-[#1ab394] hover:underline">Tutti</button>
            <button onClick={selectNone} className="text-xs text-[#999] hover:underline">Nessuno</button>
          </div>
        </div>

        {players.length === 0 ? (
          <div className="text-center text-[#999] py-10 text-sm">
            Nessun atleta trovato per questa categoria.
          </div>
        ) : (
          <div className="divide-y divide-[#e7eaec]">
            {players.map(p => {
              const isPresent = selected.includes(p.id)
              const wasSaved  = savedToday.includes(p.id)
              return (
                <button key={p.id} onClick={() => togglePlayer(p.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                    isPresent ? 'bg-[#27ae60]/5' : 'hover:bg-gray-50'
                  )}>
                  {/* Checkbox */}
                  <div className={clsx(
                    'w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    isPresent ? 'bg-[#27ae60] border-[#27ae60]' : 'border-[#e7eaec]'
                  )}>
                    {isPresent && <Check size={13} className="text-white"/>}
                  </div>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: p.categories?.colore || '#27ae60' }}>
                    {(p.nome?.[0]||'')+(p.cognome?.[0]||'')}
                  </div>

                  {/* Nome */}
                  <div className="flex-1 min-w-0">
                    <div className={clsx('text-sm font-medium', isPresent ? 'text-[#2f4050]' : 'text-[#676a6c]')}>
                      {p.cognome} {p.nome}
                    </div>
                    {p.numero_maglia && (
                      <div className="text-xs text-[#999]">N° {p.numero_maglia}</div>
                    )}
                  </div>

                  {/* Badge salvato */}
                  {wasSaved && (
                    <span className="text-xs text-[#27ae60] font-medium flex-shrink-0">✓ salvato</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Bottone salva */}
        <div className="px-4 py-3 border-t border-[#e7eaec] bg-gray-50">
          <button
            onClick={saveAttendances}
            disabled={saving || !hasChanges}
            className="w-full flex items-center justify-center gap-2 bg-[#27ae60] hover:bg-[#229954] disabled:opacity-50 text-white py-2.5 rounded text-sm font-semibold transition-colors">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Salvataggio...</>
              : <><Save size={15}/> Salva presenze ({selected.length} atleti)</>}
          </button>
          {!hasChanges && savedToday.length > 0 && (
            <p className="text-xs text-center text-[#999] mt-2">✓ Presenze già salvate per oggi</p>
          )}
        </div>
      </div>

      {/* Storico presenze */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
        <button
          onClick={() => setShowHistory(h => !h)}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-[#e7eaec] hover:bg-gray-50">
          <h2 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide">Storico presenze</h2>
          {showHistory ? <ChevronUp size={16} className="text-[#999]"/> : <ChevronDown size={16} className="text-[#999]"/>}
        </button>

        {showHistory && (
          <>
            {/* Filtri */}
            <div className="flex gap-2 p-3 border-b border-[#e7eaec]">
              <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="border border-[#e7eaec] rounded px-3 py-1.5 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]"/>
              <select value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}
                className="border border-[#e7eaec] rounded px-3 py-1.5 text-[#676a6c] text-sm outline-none flex-1 focus:border-[#27ae60]">
                <option value="">Tutti gli atleti</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
              </select>
            </div>

            {Object.keys(byDate).length === 0 ? (
              <div className="text-center text-[#999] py-8 text-sm">Nessuna presenza nel periodo selezionato</div>
            ) : (
              <div className="divide-y divide-[#e7eaec]">
                {Object.entries(byDate).map(([date, atts]) => (
                  <div key={date} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#2f4050] capitalize">
                        {format(new Date(date), 'EEEE d MMMM yyyy', { locale: it })}
                      </span>
                      <span className="text-xs text-[#999]">{atts.length} presenti</span>
                    </div>
                    {atts[0]?.trainings && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 mb-2">
                        <Dumbbell size={11}/>
                        {atts[0].trainings.titolo}
                        {atts[0].trainings.ora_inizio && ` — ${atts[0].trainings.ora_inizio.slice(0,5)}`}
                        {atts[0].trainings.venues && ` @ ${atts[0].trainings.venues.nome}`}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {atts.map(a => (
                        <span key={a.id} className="bg-[#27ae60]/10 text-[#27ae60] text-xs px-2 py-0.5 rounded font-medium">
                          {a.youth_players?.cognome} {a.youth_players?.nome}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

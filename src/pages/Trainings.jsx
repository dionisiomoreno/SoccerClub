import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, X, Dumbbell, MapPin, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

function TrainingModal({ training, onClose, onSaved, misterId }) {
  const isEdit = !!training?.id
  const [venues, setVenues] = useState([])
  const [form, setForm] = useState({
    titolo: 'Allenamento',
    data: format(new Date(), 'yyyy-MM-dd'),
    ora_inizio: '18:00',
    ora_fine: '20:00',
    venue_id: '',
    note: '',
    ...training
  })
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  useEffect(() => {
    supabase.from('venues').select('*').eq('active', true).order('nome').then(({ data }) => setVenues(data || []))
  }, [])

  const selectedVenue = venues.find(v => v.id === form.venue_id)

  async function save() {
    if (!form.data) return toast.error('Data obbligatoria')
    setLoading(true)
    const payload = {
      titolo: form.titolo,
      data: form.data,
      ora_inizio: form.ora_inizio || null,
      ora_fine: form.ora_fine || null,
      venue_id: form.venue_id || null,
      note: form.note,
      creato_da: misterId,
    }
    const { error } = isEdit
      ? await supabase.from('trainings').update(payload).eq('id', training.id)
      : await supabase.from('trainings').insert([payload])
    if (error) toast.error(error.message)
    else { toast.success(isEdit ? 'Allenamento aggiornato' : 'Allenamento aggiunto'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit ? 'Modifica' : 'Nuovo'} Allenamento</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Titolo</label>
            <input value={form.titolo} onChange={e=>set('titolo',e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Data *</label>
            <input type="date" value={form.data} onChange={e=>set('data',e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Ora inizio</label>
              <input type="time" value={form.ora_inizio} onChange={e=>set('ora_inizio',e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Ora fine</label>
              <input type="time" value={form.ora_fine} onChange={e=>set('ora_fine',e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Struttura</label>
            <select value={form.venue_id} onChange={e=>set('venue_id',e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              <option value="">— Seleziona struttura —</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>
                  {v.nome}{v.citta ? ` — ${v.citta}` : ''}
                </option>
              ))}
            </select>
            {selectedVenue && (
              <div className={clsx('mt-1 text-xs flex items-center gap-1',
                selectedVenue.lat && selectedVenue.lng ? 'text-green-600' : 'text-yellow-600')}>
                <MapPin size={10}/>
                {selectedVenue.lat && selectedVenue.lng
                  ? `GPS attivo — raggio ${selectedVenue.raggio_timbratura}m`
                  : 'GPS non configurato per questa struttura'}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Note</label>
            <textarea value={form.note} onChange={e=>set('note',e.target.value)} rows={3}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Trainings() {
  const { profile, isAdmin, isMister } = useAuth()
  const [trainings, setTrainings] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [currentDate])

  async function load() {
    setLoading(true)
    const start = startOfMonth(currentDate).toISOString().split('T')[0]
    const end = endOfMonth(currentDate).toISOString().split('T')[0]
    let q = supabase.from('trainings').select('*, profiles(nome,cognome), venues(nome,indirizzo,citta,lat,lng,raggio_timbratura)')
      .gte('data', start).lte('data', end).order('data').order('ora_inizio')

    // Mister vede solo i propri allenamenti
    if (isMister && !isAdmin) {
      q = q.eq('creato_da', profile.id)
    }

    const { data } = await q
    setTrainings(data || [])
    setLoading(false)
  }

  async function deleteTraining(id) {
    if (!confirm('Eliminare questo allenamento?')) return
    await supabase.from('trainings').delete().eq('id', id)
    toast.success('Eliminato')
    load()
  }

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  })

  const firstDayOfMonth = getDay(startOfMonth(currentDate))
  const emptyDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

  const selectedDayTrainings = selectedDay
    ? trainings.filter(t => isSameDay(new Date(t.data), selectedDay))
    : []

  const canEdit = isAdmin || isMister

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Allenamenti</h1>
          <p className="text-sm text-[#999] mt-1">Calendario allenamenti Prima Squadra</p>
        </div>
        {canEdit && (
          <button onClick={() => setModal({ data: selectedDay ? format(selectedDay, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd') })}
            className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
            <Plus size={16}/> Nuovo
          </button>
        )}
      </div>

      {/* Navigazione mese */}
      <div className="flex items-center justify-between bg-white border border-[#e7eaec] rounded shadow-sm px-4 py-3">
        <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="text-[#999] hover:text-[#2f4050] text-sm font-medium px-3 py-1 rounded hover:bg-gray-50">
          ← Prec
        </button>
        <h2 className="text-[#2f4050] font-bold capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: it })}
        </h2>
        <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="text-[#999] hover:text-[#2f4050] text-sm font-medium px-3 py-1 rounded hover:bg-gray-50">
          Succ →
        </button>
      </div>

      {/* Calendario */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
        {/* Intestazione giorni */}
        <div className="grid grid-cols-7 border-b border-[#e7eaec]">
          {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-[#999] uppercase py-2">{d}</div>
          ))}
        </div>
        {/* Giorni */}
        <div className="grid grid-cols-7">
          {Array.from({ length: emptyDays }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-[#e7eaec] bg-gray-50"/>
          ))}
          {days.map(day => {
            const dayTrainings = trainings.filter(t => isSameDay(new Date(t.data), day))
            const isSelected = selectedDay && isSameDay(day, selectedDay)
            const today = isToday(day)
            return (
              <div key={day.toISOString()}
                onClick={() => setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
                className={clsx(
                  'min-h-[80px] border-b border-r border-[#e7eaec] p-1 cursor-pointer transition-colors',
                  isSelected ? 'bg-[#1ab394]/10' : 'hover:bg-gray-50'
                )}>
                <div className={clsx(
                  'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1',
                  today ? 'bg-[#1ab394] text-white' : 'text-[#676a6c]'
                )}>
                  {format(day, 'd')}
                </div>
                {dayTrainings.map(t => (
                  <div key={t.id} className="text-xs bg-[#1ab394]/20 text-[#1ab394] rounded px-1 py-0.5 mb-0.5 truncate font-medium">
                    {t.ora_inizio ? t.ora_inizio.slice(0,5) : ''} {t.titolo}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Dettaglio giorno selezionato */}
      {selectedDay && (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#2f4050] font-bold capitalize">
              {format(selectedDay, 'EEEE d MMMM yyyy', { locale: it })}
            </h3>
            {canEdit && (
              <button onClick={() => setModal({ data: format(selectedDay, 'yyyy-MM-dd') })}
                className="flex items-center gap-1 text-xs text-[#1ab394] hover:underline">
                <Plus size={13}/> Aggiungi
              </button>
            )}
          </div>
          {selectedDayTrainings.length === 0 ? (
            <p className="text-[#999] text-sm">Nessun allenamento in questo giorno.</p>
          ) : (
            <div className="space-y-3">
              {selectedDayTrainings.map(t => (
                <div key={t.id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded border border-[#e7eaec]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1ab394]/20 text-[#1ab394] flex items-center justify-center flex-shrink-0">
                      <Dumbbell size={15}/>
                    </div>
                    <div>
                      <div className="text-[#2f4050] font-semibold text-sm">{t.titolo}</div>
                      {(t.ora_inizio || t.ora_fine) && (
                        <div className="flex items-center gap-1 text-xs text-[#999] mt-0.5">
                          <Clock size={11}/>
                          {t.ora_inizio?.slice(0,5)}{t.ora_fine ? ` — ${t.ora_fine.slice(0,5)}` : ''}
                        </div>
                      )}
                      {t.venues && (
                        <div className="flex items-center gap-1 text-xs text-[#999] mt-0.5">
                          <MapPin size={11}/>
                          {t.venues.nome}{t.venues.citta ? ` — ${t.venues.citta}` : ''}
                          {t.venues.lat && t.venues.lng
                            ? <span className="text-green-600 ml-1">✅ GPS</span>
                            : <span className="text-yellow-600 ml-1">⚠️ No GPS</span>}
                        </div>
                      )}
                      {t.note && <div className="text-xs text-[#999] mt-1 italic">{t.note}</div>}
                      {isAdmin && t.profiles && (
                        <div className="text-xs text-[#999] mt-0.5">
                          Mister: {t.profiles.nome} {t.profiles.cognome}
                        </div>
                      )}
                    </div>
                  </div>
                  {canEdit && (profile.id === t.creato_da || isAdmin) && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => setModal(t)} className="text-[#999] hover:text-[#1c84c6]"><Edit2 size={14}/></button>
                      <button onClick={() => deleteTraining(t.id)} className="text-[#999] hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modal !== null && (
        <TrainingModal
          training={modal}
          misterId={profile.id}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}

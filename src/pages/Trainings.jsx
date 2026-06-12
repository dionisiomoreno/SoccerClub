import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, X, Dumbbell, MapPin, Clock, RefreshCw, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay, addDays } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

const GIORNI = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica']

// ── Modal allenamento singolo ─────────────────────────────────
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
                <option key={v.id} value={v.id}>{v.nome}{v.citta ? ` — ${v.citta}` : ''}</option>
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

// ── Modal template ricorrente ─────────────────────────────────
function TemplateModal({ template, onClose, onSaved, misterId }) {
  const isEdit = !!template?.id
  const [venues, setVenues] = useState([])
  const [form, setForm] = useState({
    titolo: 'Allenamento',
    giorno_settimana: 1, // Martedì
    ora_inizio: '18:00',
    ora_fine: '20:00',
    venue_id: '',
    note: '',
    ...template
  })
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  useEffect(() => {
    supabase.from('venues').select('*').eq('active', true).order('nome').then(({ data }) => setVenues(data || []))
  }, [])

  async function save() {
    setLoading(true)
    const payload = {
      titolo: form.titolo,
      giorno_settimana: +form.giorno_settimana,
      ora_inizio: form.ora_inizio || null,
      ora_fine: form.ora_fine || null,
      venue_id: form.venue_id || null,
      note: form.note,
      creato_da: misterId,
      active: true,
    }
    const { error } = isEdit
      ? await supabase.from('training_templates').update(payload).eq('id', template.id)
      : await supabase.from('training_templates').insert([payload])
    if (error) toast.error(error.message)
    else { toast.success(isEdit ? 'Template aggiornato' : 'Template creato'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit ? 'Modifica' : 'Nuovo'} Allenamento Fisso</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
            💡 Gli allenamenti fissi vengono generati automaticamente ogni mese per il giorno selezionato.
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Titolo</label>
            <input value={form.titolo} onChange={e=>set('titolo',e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Giorno della settimana</label>
            <select value={form.giorno_settimana} onChange={e=>set('giorno_settimana',+e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              {GIORNI.map((g, i) => <option key={i} value={i}>{g}</option>)}
            </select>
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
                <option key={v.id} value={v.id}>{v.nome}{v.citta ? ` — ${v.citta}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Note</label>
            <textarea value={form.note} onChange={e=>set('note',e.target.value)} rows={2}
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

// ── Componente principale ─────────────────────────────────────
export default function Trainings() {
  const { profile, isAdmin, isMister } = useAuth()
  const [trainings, setTrainings]       = useState([])
  const [templates, setTemplates]       = useState([])
  const [currentDate, setCurrentDate]   = useState(new Date())
  const [selectedDay, setSelectedDay]   = useState(null)
  const [modal, setModal]               = useState(null)
  const [templateModal, setTemplateModal] = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [loading, setLoading]           = useState(true)
  const [generating, setGenerating]     = useState(false)

  useEffect(() => { load() }, [currentDate])
  useEffect(() => { loadTemplates() }, [])

  async function load() {
    setLoading(true)
    const start = startOfMonth(currentDate).toISOString().split('T')[0]
    const end   = endOfMonth(currentDate).toISOString().split('T')[0]
    let q = supabase.from('trainings')
      .select('*, profiles(nome,cognome), venues(nome,indirizzo,citta,lat,lng,raggio_timbratura)')
      .gte('data', start).lte('data', end)
      .is('category_id', null)
      .order('data').order('ora_inizio')
    if (isMister && !isAdmin) q = q.eq('creato_da', profile.id)
    const { data } = await q
    setTrainings(data || [])
    setLoading(false)
  }

  async function loadTemplates() {
    let q = supabase.from('training_templates').select('*, venues(nome,citta)').eq('active', true).order('giorno_settimana')
    if (isMister && !isAdmin) q = q.eq('creato_da', profile.id)
    const { data } = await q
    setTemplates(data || [])
  }

  // Genera allenamenti dal template per il mese corrente
  async function generateFromTemplates() {
    if (templates.length === 0) return toast.error('Nessun template configurato')
    setGenerating(true)

    const start = startOfMonth(currentDate)
    const end   = endOfMonth(currentDate)
    const days  = eachDayOfInterval({ start, end })

    let created = 0
    for (const tmpl of templates) {
      // getDay() ritorna 0=Dom, 1=Lun... noi usiamo 0=Lun, 6=Dom
      const targetDayJS = tmpl.giorno_settimana === 6 ? 0 : tmpl.giorno_settimana + 1

      for (const day of days) {
        if (getDay(day) !== targetDayJS) continue
        const dataStr = format(day, 'yyyy-MM-dd')

        // Controlla se esiste già
        const { count } = await supabase.from('trainings')
          .select('id', { count: 'exact' })
          .eq('data', dataStr)
          .eq('creato_da', profile.id)
          .is('category_id', null)
        if (count > 0) continue

        await supabase.from('trainings').insert([{
          titolo:    tmpl.titolo,
          data:      dataStr,
          ora_inizio: tmpl.ora_inizio,
          ora_fine:   tmpl.ora_fine,
          venue_id:   tmpl.venue_id,
          note:       tmpl.note,
          creato_da:  profile.id,
          category_id: null,
        }])
        created++
      }
    }

    if (created === 0) toast('Tutti gli allenamenti erano già presenti', { icon: 'ℹ️' })
    else toast.success(`${created} allenamenti generati!`)
    setGenerating(false)
    load()
  }

  async function deleteTraining(id) {
    if (!confirm('Eliminare questo allenamento?')) return
    await supabase.from('trainings').delete().eq('id', id)
    toast.success('Eliminato')
    load()
  }

  async function deleteTemplate(id) {
    if (!confirm('Eliminare questo template ricorrente?')) return
    await supabase.from('training_templates').update({ active: false }).eq('id', id)
    toast.success('Template eliminato')
    loadTemplates()
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) })
  const firstDayOfMonth = getDay(startOfMonth(currentDate))
  const emptyDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1
  const selectedDayTrainings = selectedDay ? trainings.filter(t => isSameDay(new Date(t.data), selectedDay)) : []
  const canEdit = isAdmin || isMister

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Allenamenti</h1>
          <p className="text-sm text-[#999] mt-1">Calendario allenamenti Prima Squadra</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {/* Genera dal template */}
            <button onClick={generateFromTemplates} disabled={generating}
              className="flex items-center gap-2 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-3 py-2 rounded text-sm">
              <RefreshCw size={14} className={generating ? 'animate-spin' : ''}/>
              Genera mese
            </button>
            {/* Gestione template */}
            <button onClick={() => setShowTemplates(s => !s)}
              className={clsx('flex items-center gap-2 border px-3 py-2 rounded text-sm',
                showTemplates ? 'border-[#1ab394] text-[#1ab394] bg-[#1ab394]/5' : 'border-[#e7eaec] text-[#676a6c] hover:bg-gray-50')}>
              <Settings size={14}/> Template fissi
            </button>
            {/* Nuovo allenamento singolo */}
            <button onClick={() => setModal({ data: selectedDay ? format(selectedDay, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd') })}
              className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
              <Plus size={16}/> Nuovo
            </button>
          </div>
        )}
      </div>

      {/* ── Sezione template fissi ── */}
      {showTemplates && canEdit && (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide">⚙️ Allenamenti Fissi</h3>
            <button onClick={() => setTemplateModal({})}
              className="flex items-center gap-1 text-xs bg-[#1ab394] hover:bg-[#18a689] text-white px-3 py-1.5 rounded font-semibold">
              <Plus size={12}/> Aggiungi giorno fisso
            </button>
          </div>
          {templates.length === 0 ? (
            <p className="text-xs text-[#999]">Nessun allenamento fisso configurato. Aggiungine uno per generare automaticamente gli allenamenti mensili.</p>
          ) : (
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 border border-[#e7eaec] rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1ab394]/20 text-[#1ab394] flex items-center justify-center text-xs font-bold">
                      {GIORNI[t.giorno_settimana]?.slice(0,2)}
                    </div>
                    <div>
                      <div className="text-[#2f4050] font-medium text-sm">
                        {GIORNI[t.giorno_settimana]} — {t.titolo}
                      </div>
                      <div className="text-xs text-[#999]">
                        {t.ora_inizio?.slice(0,5)}{t.ora_fine ? ` — ${t.ora_fine.slice(0,5)}` : ''}
                        {t.venues && ` @ ${t.venues.nome}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setTemplateModal(t)} className="text-[#999] hover:text-[#1c84c6]"><Edit2 size={14}/></button>
                    <button onClick={() => deleteTemplate(t.id)} className="text-[#999] hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-[#999] border-t border-[#e7eaec] pt-2">
            💡 Clicca <strong>"Genera mese"</strong> per creare automaticamente gli allenamenti del mese corrente basandoti su questi template.
          </p>
        </div>
      )}

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
        <div className="grid grid-cols-7 border-b border-[#e7eaec]">
          {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-[#999] uppercase py-2">{d}</div>
          ))}
        </div>
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

      {/* Modali */}
      {modal !== null && (
        <TrainingModal
          training={modal}
          misterId={profile.id}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
      {templateModal !== null && (
        <TemplateModal
          template={templateModal}
          misterId={profile.id}
          onClose={() => setTemplateModal(null)}
          onSaved={() => { setTemplateModal(null); loadTemplates() }}
        />
      )}
    </div>
  )
}

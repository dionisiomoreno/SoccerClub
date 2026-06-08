import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Check, ChevronRight, ChevronLeft, MapPin, Loader2, Users, Trophy, Baby } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

const TAGLIE = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export default function Onboarding() {
  const navigate = useNavigate()
  const location = useLocation()
  const { clubId, piano } = location.state || {}

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)

  const [settings, setSettings] = useState({
    nome_squadra: '',
    indirizzo: '',
    citta: '',
    telefono: '',
    email: '',
    anno_fondazione: new Date().getFullYear(),
    lat: null,
    lng: null,
    raggio_timbratura: 200,
    modulo_prima_squadra: true,
    modulo_scuola_calcio: piano === 'pro' || piano === 'full',
    importo_allenamento: 20,
    importo_partita: 30,
    importo_carburante: 0,
  })

  const [categorie, setCategorie] = useState([
    { nome: 'Pulcini', colore: '#e74c3c', ordine: 1 },
    { nome: 'Esordienti', colore: '#e67e22', ordine: 2 },
    { nome: 'Giovanissimi', colore: '#f1c40f', ordine: 3 },
    { nome: 'Allievi', colore: '#2ecc71', ordine: 4 },
  ])

  const [nuovaCategoria, setNuovaCategoria] = useState({ nome: '', colore: '#1ab394' })

  function setS(k, v) { setSettings(f => ({ ...f, [k]: v })) }

  async function geocodeAddress() {
    if (!settings.indirizzo) return toast.error('Inserisci un indirizzo')
    setGeoLoading(true)
    try {
      const addr = `${settings.indirizzo}, ${settings.citta}`
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`)
      const data = await res.json()
      if (data?.length > 0) {
        setS('lat', parseFloat(data[0].lat))
        setS('lng', parseFloat(data[0].lon))
        toast.success('Coordinate GPS rilevate!')
      } else toast.error('Indirizzo non trovato')
    } catch { toast.error('Errore geocoding') }
    setGeoLoading(false)
  }

  function addCategoria() {
    if (!nuovaCategoria.nome.trim()) return
    setCategorie(c => [...c, { ...nuovaCategoria, ordine: c.length + 1 }])
    setNuovaCategoria({ nome: '', colore: '#1ab394' })
  }

  function removeCategoria(i) {
    setCategorie(c => c.filter((_, idx) => idx !== i))
  }

  async function handleFinish() {
    if (!clubId) { toast.error('Errore: club non trovato'); return }
    setLoading(true)
    try {
      // Salva team_settings
      await supabase.from('team_settings').upsert([{
        club_id: clubId,
        ...settings,
        updated_at: new Date().toISOString(),
      }])

      // Aggiorna nome club
      await supabase.from('clubs').update({
        nome: settings.nome_squadra || undefined,
        citta: settings.citta || undefined,
        updated_at: new Date().toISOString(),
      }).eq('id', clubId)

      // Salva categorie SC
      if (settings.modulo_scuola_calcio && categorie.length > 0) {
        await supabase.from('categories').insert(
          categorie.map(c => ({ ...c, club_id: clubId, active: true }))
        )
      }

      toast.success('Setup completato! Benvenuto in SoccerClub 🎉')
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  // Se non c'è clubId redirige
  if (!clubId) {
    return (
      <div className="min-h-screen bg-[#f3f3f4] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#999] mb-4">Sessione non valida.</p>
          <button onClick={() => navigate('/registrati')}
            className="bg-[#1ab394] text-white px-4 py-2 rounded text-sm">
            Torna alla registrazione
          </button>
        </div>
      </div>
    )
  }

  const totalSteps = settings.modulo_scuola_calcio ? 3 : 2
  const stepLabels = settings.modulo_scuola_calcio
    ? ['Squadra', 'Valori', 'Categorie SC']
    : ['Squadra', 'Valori']

  return (
    <div className="min-h-screen bg-[#f3f3f4] flex flex-col">
      <header className="bg-white border-b border-[#e7eaec] px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#1ab394] flex items-center justify-center text-white text-sm font-bold">SC</div>
        <div>
          <span className="font-bold text-[#2f4050] text-sm">Setup iniziale</span>
          <span className="text-xs text-[#999] ml-2">Configura la tua squadra</span>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center p-4 pt-8">
        <div className="w-full max-w-xl">

          {/* Progress */}
          <div className="flex items-center justify-center mb-8">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step > i+1 ? 'bg-[#1ab394] text-white' :
                    step === i+1 ? 'bg-[#2f4050] text-white' :
                    'bg-white border-2 border-[#e7eaec] text-[#999]'
                  }`}>
                    {step > i+1 ? <Check size={14}/> : i+1}
                  </div>
                  <span className={`text-xs mt-1 ${step === i+1 ? 'text-[#2f4050] font-semibold' : 'text-[#999]'}`}>{label}</span>
                </div>
                {i < totalSteps-1 && <div className={`w-16 h-0.5 mx-1 mb-4 ${step > i+1 ? 'bg-[#1ab394]' : 'bg-[#e7eaec]'}`}/>}
              </div>
            ))}
          </div>

          {/* STEP 1 — Dati squadra */}
          {step === 1 && (
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={18} className="text-[#1ab394]"/>
                <h2 className="font-bold text-[#2f4050]">Dati della squadra</h2>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Nome squadra</label>
                <input value={settings.nome_squadra} onChange={e => setS('nome_squadra', e.target.value)}
                  placeholder="es. ASD Rossi Calcio 2000"
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Anno fondazione</label>
                  <input type="number" value={settings.anno_fondazione} onChange={e => setS('anno_fondazione', +e.target.value)}
                    className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Città</label>
                  <input value={settings.citta} onChange={e => setS('citta', e.target.value)}
                    className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Email</label>
                  <input type="email" value={settings.email} onChange={e => setS('email', e.target.value)}
                    className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Telefono</label>
                  <input value={settings.telefono} onChange={e => setS('telefono', e.target.value)}
                    className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                </div>
              </div>

              {/* GPS */}
              <div className="border-t border-[#e7eaec] pt-4">
                <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-2">
                  📍 Struttura sportiva (per timbratura GPS)
                </label>
                <div className="flex gap-2">
                  <input value={settings.indirizzo} onChange={e => setS('indirizzo', e.target.value)}
                    placeholder="es. Via dello Sport 1, Roma"
                    className="flex-1 border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                  <button onClick={geocodeAddress} disabled={geoLoading}
                    className="bg-[#1c84c6] hover:bg-[#1a75b0] disabled:opacity-50 text-white px-3 py-2 rounded text-sm flex items-center gap-1">
                    {geoLoading ? <Loader2 size={14} className="animate-spin"/> : <MapPin size={14}/>}
                    GPS
                  </button>
                </div>
                {settings.lat && settings.lng && (
                  <p className="text-xs text-[#1ab394] mt-1">
                    ✅ GPS configurato: {Number(settings.lat).toFixed(5)}, {Number(settings.lng).toFixed(5)}
                  </p>
                )}
                <div className="mt-2">
                  <label className="block text-xs text-[#999] mb-1">Raggio timbratura (metri)</label>
                  <input type="number" min="50" max="2000" value={settings.raggio_timbratura}
                    onChange={e => setS('raggio_timbratura', +e.target.value)}
                    className="w-32 border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={() => setStep(2)}
                  className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-6 py-2.5 rounded text-sm font-semibold">
                  Continua <ChevronRight size={16}/>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 — Valori economici */}
          {step === 2 && (
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-[#1ab394]"/>
                <h2 className="font-bold text-[#2f4050]">Valori economici</h2>
              </div>
              <p className="text-xs text-[#999]">Importi di rimborso per i calciatori. Potrai modificarli in seguito dalle impostazioni.</p>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Allenamento (€)</label>
                  <input type="number" min="0" value={settings.importo_allenamento}
                    onChange={e => setS('importo_allenamento', +e.target.value)}
                    className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Partita (€)</label>
                  <input type="number" min="0" value={settings.importo_partita}
                    onChange={e => setS('importo_partita', +e.target.value)}
                    className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Carburante (€)</label>
                  <input type="number" min="0" value={settings.importo_carburante}
                    onChange={e => setS('importo_carburante', +e.target.value)}
                    className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                </div>
              </div>

              {/* Moduli */}
              <div className="border-t border-[#e7eaec] pt-4">
                <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Moduli abilitati</label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 border border-[#e7eaec] rounded">
                    <div>
                      <div className="text-[#2f4050] font-medium text-sm">⚽ Prima Squadra</div>
                      <div className="text-xs text-[#999]">Sempre incluso</div>
                    </div>
                    <div className="w-11 h-6 bg-[#1ab394] rounded-full relative">
                      <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full"/>
                    </div>
                  </div>
                  {(piano === 'pro' || piano === 'full') && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-[#e7eaec] rounded">
                      <div>
                        <div className="text-[#2f4050] font-medium text-sm">🏫 Scuola Calcio</div>
                        <div className="text-xs text-[#999]">Incluso nel piano {piano}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={settings.modulo_scuola_calcio}
                          onChange={e => setS('modulo_scuola_calcio', e.target.checked)} className="sr-only peer"/>
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1ab394]"/>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-[#999] hover:text-[#676a6c] text-sm">
                  <ChevronLeft size={16}/> Indietro
                </button>
                <button onClick={() => settings.modulo_scuola_calcio ? setStep(3) : handleFinish()}
                  disabled={loading}
                  className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white px-6 py-2.5 rounded text-sm font-semibold">
                  {loading ? <><Loader2 size={15} className="animate-spin"/> Salvataggio...</> :
                    settings.modulo_scuola_calcio ? <>Continua <ChevronRight size={16}/></> : '🎉 Completa setup'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Categorie SC */}
          {step === 3 && settings.modulo_scuola_calcio && (
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Baby size={18} className="text-[#27ae60]"/>
                <h2 className="font-bold text-[#2f4050]">Categorie Scuola Calcio</h2>
              </div>
              <p className="text-xs text-[#999]">Configura le categorie del settore giovanile. Puoi aggiungerne altre in seguito.</p>

              {/* Lista categorie */}
              <div className="space-y-2">
                {categorie.map((cat, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border border-[#e7eaec] rounded bg-gray-50">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: cat.colore }}/>
                    <span className="flex-1 text-sm text-[#2f4050] font-medium">{cat.nome}</span>
                    <button onClick={() => removeCategoria(i)} className="text-[#999] hover:text-red-500 text-xs">
                      Rimuovi
                    </button>
                  </div>
                ))}
              </div>

              {/* Aggiungi categoria */}
              <div className="border-t border-[#e7eaec] pt-3">
                <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-2">Aggiungi categoria</label>
                <div className="flex gap-2">
                  <input value={nuovaCategoria.nome} onChange={e => setNuovaCategoria(c => ({ ...c, nome: e.target.value }))}
                    placeholder="Nome categoria..."
                    className="flex-1 border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]"
                    onKeyDown={e => e.key === 'Enter' && addCategoria()}/>
                  <input type="color" value={nuovaCategoria.colore}
                    onChange={e => setNuovaCategoria(c => ({ ...c, colore: e.target.value }))}
                    className="w-10 h-9 border border-[#e7eaec] rounded cursor-pointer"/>
                  <button onClick={addCategoria}
                    className="bg-[#27ae60] hover:bg-[#229954] text-white px-3 py-2 rounded text-sm font-semibold">
                    + Aggiungi
                  </button>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 text-[#999] hover:text-[#676a6c] text-sm">
                  <ChevronLeft size={16}/> Indietro
                </button>
                <button onClick={handleFinish} disabled={loading}
                  className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white px-6 py-2.5 rounded text-sm font-semibold">
                  {loading
                    ? <><Loader2 size={15} className="animate-spin"/> Salvataggio...</>
                    : '🎉 Completa setup'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

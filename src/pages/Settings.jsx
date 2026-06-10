import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { User, Lock, Shield, MapPin, Loader, Plus, Edit2, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLE_LABELS = { admin: 'Società', mister: 'Mister', player_paid: 'Calciatore', player_volunteer: 'Volontario' }
const TAGLIE = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

// ── Modal struttura ────────────────────────────────────────────
function VenueModal({ venue, onClose, onSaved, clubId }) {
  const isEdit = !!venue?.id
  const [form, setForm] = useState({
    nome: '', indirizzo: '', citta: '', lat: '', lng: '', raggio_timbratura: 200, active: true,
    ...venue
  })
  const [geoLoading, setGeoLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function geocode() {
    if (!form.indirizzo) return toast.error('Inserisci un indirizzo')
    setGeoLoading(true)
    try {
      const addr = `${form.indirizzo}, ${form.citta || ''}`
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`)
      const data = await res.json()
      if (data?.length > 0) {
        set('lat', parseFloat(data[0].lat))
        set('lng', parseFloat(data[0].lon))
        toast.success('Coordinate GPS rilevate!')
      } else toast.error('Indirizzo non trovato')
    } catch { toast.error('Errore geocoding') }
    setGeoLoading(false)
  }

  async function save() {
    if (!form.nome) return toast.error('Nome obbligatorio')
    setLoading(true)
    const payload = {
      nome: form.nome,
      indirizzo: form.indirizzo,
      citta: form.citta,
      lat: form.lat || null,
      lng: form.lng || null,
      raggio_timbratura: +form.raggio_timbratura || 200,
      active: form.active,
      club_id: clubId,
    }
    const { error } = isEdit
      ? await supabase.from('venues').update(payload).eq('id', venue.id)
      : await supabase.from('venues').insert([payload])
    if (error) toast.error(error.message)
    else { toast.success(isEdit ? 'Struttura aggiornata' : 'Struttura aggiunta'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit ? 'Modifica' : 'Nuova'} Struttura</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Nome *</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
              placeholder="Es. Campo Sportivo Comunale"
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Indirizzo</label>
            <div className="flex gap-2">
              <input value={form.indirizzo} onChange={e => set('indirizzo', e.target.value)}
                placeholder="Es. Via dello Sport 1"
                className="flex-1 border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
              <button onClick={geocode} disabled={geoLoading}
                className="bg-[#1c84c6] hover:bg-[#1a75b0] disabled:opacity-50 text-white px-3 py-2 rounded text-sm flex items-center gap-1">
                {geoLoading ? <Loader size={14} className="animate-spin"/> : <MapPin size={14}/>}
                GPS
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Città</label>
            <input value={form.citta} onChange={e => set('citta', e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Latitudine</label>
              <input type="number" step="0.0000001" value={form.lat || ''}
                onChange={e => set('lat', parseFloat(e.target.value))}
                placeholder="41.7654321"
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Longitudine</label>
              <input type="number" step="0.0000001" value={form.lng || ''}
                onChange={e => set('lng', parseFloat(e.target.value))}
                placeholder="14.7654321"
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>
          {form.lat && form.lng && (
            <div className="bg-green-50 border border-green-200 rounded p-2 flex items-center gap-2 text-xs text-green-700">
              <MapPin size={12}/> GPS: {Number(form.lat).toFixed(5)}, {Number(form.lng).toFixed(5)}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Raggio timbratura (metri)</label>
            <input type="number" min="50" max="2000" value={form.raggio_timbratura}
              onChange={e => set('raggio_timbratura', +e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="accent-[#1ab394]"/>
            <span className="text-sm text-[#676a6c]">Attiva</span>
          </label>
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

// ── Componente principale ──────────────────────────────────────
export default function Settings() {
  const { profile, user, isAdmin, club } = useAuth()
  const [form, setForm] = useState({
    nome: profile?.nome || '',
    cognome: profile?.cognome || '',
    telefono: profile?.telefono || '',
    taglia: profile?.taglia || 'M',
    codice_fiscale: profile?.codice_fiscale || '',
    numero_patente: profile?.numero_patente || ''
  })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [teamSettings, setTeamSettings] = useState(null)
  const [savingTeam, setSavingTeam] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [venues, setVenues] = useState([])
  const [venueModal, setVenueModal] = useState(null)

  const initials = `${profile?.nome?.[0] || ''}${profile?.cognome?.[0] || ''}`.toUpperCase()

  useEffect(() => {
    if (isAdmin) {
      loadTeamSettings()
      loadVenues()
    }
  }, [isAdmin])

  async function loadTeamSettings() {
    const { data } = await supabase.from('team_settings').select('*').single()
    if (data) setTeamSettings(data)
    else setTeamSettings({
  nome_squadra: '', indirizzo: '', citta: '', telefono: '', email: '',
  sito_web: '', anno_fondazione: new Date().getFullYear(),
  lat: null, lng: null, raggio_timbratura: 200,
  modulo_prima_squadra: true, modulo_scuola_calcio: false,
  sc_timbratura_abilitata: false
})
  }

  async function loadVenues() {
    const { data } = await supabase.from('venues').select('*').order('nome')
    setVenues(data || [])
  }

  async function deleteVenue(id) {
    if (!confirm('Eliminare questa struttura?')) return
    await supabase.from('venues').delete().eq('id', id)
    toast.success('Struttura eliminata')
    loadVenues()
  }

  function setTeam(k, v) { setTeamSettings(t => ({ ...t, [k]: v })) }
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function saveProfile() {
    setSavingProfile(true)
    const { error } = await supabase.from('profiles').update(form).eq('id', profile.id)
    if (error) toast.error(error.message)
    else toast.success('Profilo aggiornato')
    setSavingProfile(false)
  }

  async function savePassword() {
    if (password.length < 6) return toast.error('La password deve essere di almeno 6 caratteri')
    if (password !== confirmPassword) return toast.error('Le password non coincidono')
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) toast.error(error.message)
    else { toast.success('Password aggiornata'); setPassword(''); setConfirmPassword('') }
    setSavingPassword(false)
  }

  async function saveTeamSettings() {
    setSavingTeam(true)
    let error
    if (teamSettings.id) {
      ;({ error } = await supabase.from('team_settings').update({
        nome_squadra: teamSettings.nome_squadra,
        indirizzo: teamSettings.indirizzo,
        citta: teamSettings.citta,
        telefono: teamSettings.telefono,
        email: teamSettings.email,
        sito_web: teamSettings.sito_web,
        anno_fondazione: teamSettings.anno_fondazione,
        lat: teamSettings.lat,
        lng: teamSettings.lng,
        raggio_timbratura: teamSettings.raggio_timbratura,
        modulo_prima_squadra: teamSettings.modulo_prima_squadra ?? true,
        modulo_scuola_calcio: teamSettings.modulo_scuola_calcio ?? false,
        sc_timbratura_abilitata: teamSettings.sc_timbratura_abilitata ?? false,
        updated_at: new Date().toISOString()
      }).eq('id', teamSettings.id))
    } else {
      ;({ error } = await supabase.from('team_settings').insert([{
        nome_squadra: teamSettings.nome_squadra,
        indirizzo: teamSettings.indirizzo,
        citta: teamSettings.citta,
        telefono: teamSettings.telefono,
        email: teamSettings.email,
        sito_web: teamSettings.sito_web,
        anno_fondazione: teamSettings.anno_fondazione,
        lat: teamSettings.lat,
        lng: teamSettings.lng,
        raggio_timbratura: teamSettings.raggio_timbratura
      }]))
    }
    if (error) toast.error(error.message)
    else { toast.success('Impostazioni salvate! Ricarico...'); loadTeamSettings(); setTimeout(() => window.location.reload(), 1000) }
    setSavingTeam(false)
  }

  async function geocodeAddress() {
    if (!teamSettings?.indirizzo) return toast.error('Inserisci un indirizzo')
    setGeoLoading(true)
    try {
      const address = `${teamSettings.indirizzo}, ${teamSettings.citta || ''}`
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
      const data = await res.json()
      if (data && data.length > 0) {
        setTeamSettings(t => ({ ...t, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }))
        toast.success('Coordinate GPS rilevate!')
      } else toast.error('Indirizzo non trovato')
    } catch { toast.error('Errore nel rilevamento coordinate') }
    setGeoLoading(false)
  }

  async function useCurrentPosition() {
    if (!navigator.geolocation) return toast.error('Geolocalizzazione non supportata')
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setTeamSettings(t => ({ ...t, lat: pos.coords.latitude, lng: pos.coords.longitude }))
        toast.success('Posizione attuale salvata!')
        setGeoLoading(false)
      },
      () => { toast.error('Impossibile rilevare la posizione'); setGeoLoading(false) }
    )
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="border-b border-[#e7eaec] pb-4">
        <h1 className="text-2xl font-bold text-[#2f4050]">Impostazioni</h1>
        <p className="text-sm text-[#999] mt-1">Gestisci profilo, sicurezza e configurazione squadra</p>
      </div>

      {/* Avatar */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#1ab394]/20 text-[#1ab394] flex items-center justify-center text-2xl font-bold flex-shrink-0">
          {initials || '?'}
        </div>
        <div>
          <div className="text-[#2f4050] font-bold text-lg">{profile?.nome} {profile?.cognome}</div>
          <div className="text-[#999] text-sm">{user?.email}</div>
          <span className="mt-1 inline-block px-2 py-0.5 rounded text-xs bg-[#1ab394]/10 text-[#1ab394] font-medium">
            {ROLE_LABELS[profile?.role] || profile?.role}
          </span>
        </div>
      </div>

      {/* Dati personali */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#e7eaec] pb-3">
          <User size={16} className="text-[#1ab394]"/>
          <h2 className="text-[#2f4050] font-bold text-sm uppercase tracking-wide">Dati personali</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[['nome','Nome'],['cognome','Cognome'],['telefono','Telefono'],['codice_fiscale','Codice fiscale'],['numero_patente','N° patente']].map(([k, l]) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">{l}</label>
              <input value={form[k]} onChange={e => set(k, e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Taglia</label>
            <select value={form.taglia} onChange={e => set('taglia', e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              {TAGLIE.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <button onClick={saveProfile} disabled={savingProfile}
          className="bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-semibold">
          {savingProfile ? 'Salvataggio...' : 'Salva modifiche'}
        </button>
      </div>

      {/* Cambia password */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#e7eaec] pb-3">
          <Lock size={16} className="text-[#1ab394]"/>
          <h2 className="text-[#2f4050] font-bold text-sm uppercase tracking-wide">Cambia password</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Nuova password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"
              placeholder="Minimo 6 caratteri"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Conferma password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"
              placeholder="Ripeti la password"/>
          </div>
        </div>
        <button onClick={savePassword} disabled={savingPassword}
          className="bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-semibold">
          {savingPassword ? 'Aggiornamento...' : 'Aggiorna password'}
        </button>
      </div>

      {/* Solo admin */}
      {isAdmin && (
        <>
          {/* Impostazioni Squadra */}
          <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#e7eaec] pb-3">
              <Shield size={16} className="text-[#1ab394]"/>
              <h2 className="text-[#2f4050] font-bold text-sm uppercase tracking-wide">Impostazioni Squadra</h2>
            </div>
            {!teamSettings ? (
              <div className="flex items-center justify-center h-24">
                <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Nome squadra</label>
                    <input value={teamSettings.nome_squadra || ''} onChange={e => setTeam('nome_squadra', e.target.value)}
                      className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Anno fondazione</label>
                    <input type="number" value={teamSettings.anno_fondazione || ''} onChange={e => setTeam('anno_fondazione', +e.target.value)}
                      className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Città</label>
                    <input value={teamSettings.citta || ''} onChange={e => setTeam('citta', e.target.value)}
                      className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Telefono</label>
                    <input value={teamSettings.telefono || ''} onChange={e => setTeam('telefono', e.target.value)}
                      className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Email</label>
                    <input value={teamSettings.email || ''} onChange={e => setTeam('email', e.target.value)}
                      className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Sito web</label>
                    <input value={teamSettings.sito_web || ''} onChange={e => setTeam('sito_web', e.target.value)}
                      className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                  </div>
                </div>

               // Trova questo blocco in Settings.jsx (sezione "Moduli abilitati")
// e SOSTITUISCI con quello qui sotto

{/* Moduli */}
<div className="border-t border-[#e7eaec] pt-4 space-y-3">
  <div className="flex items-center gap-2">
    <Shield size={16} className="text-[#1ab394]"/>
    <h3 className="text-[#2f4050] font-bold text-sm uppercase tracking-wide">Moduli abilitati</h3>
  </div>
  <div className="space-y-3">
    {[
      ['modulo_prima_squadra', '⚽ Prima Squadra', 'Gestione calciatori, presenze, cedolini, convocazioni'],
      ['modulo_scuola_calcio', '🏫 Scuola Calcio', 'Gestione atleti, pagamenti, magazzino, bacheca']
    ].map(([k, label, desc]) => (
      <div key={k} className="flex items-center justify-between p-3 bg-gray-50 border border-[#e7eaec] rounded">
        <div>
          <div className="text-[#2f4050] font-medium text-sm">{label}</div>
          <div className="text-xs text-[#999]">{desc}</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={teamSettings[k] ?? false}
            onChange={e => setTeam(k, e.target.checked)} className="sr-only peer"/>
          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1ab394]"></div>
        </label>
      </div>
    ))}

    {/* Toggle timbratura SC — visibile solo se modulo SC attivo */}
    {teamSettings.modulo_scuola_calcio && (
      <div className="flex items-center justify-between p-3 bg-[#27ae60]/5 border border-[#27ae60]/30 rounded">
        <div>
          <div className="text-[#2f4050] font-medium text-sm">📍 Timbratura presenze SC</div>
          <div className="text-xs text-[#999]">
            Abilita la timbratura GPS per gli atleti della Scuola Calcio
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={teamSettings.sc_timbratura_abilitata ?? false}
            onChange={e => setTeam('sc_timbratura_abilitata', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#27ae60]"></div>
        </label>
      </div>
    )}
  </div>
</div>

                {/* Geo struttura principale */}
                <div className="border-t border-[#e7eaec] pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-[#1ab394]"/>
                    <h3 className="text-[#2f4050] font-bold text-sm uppercase tracking-wide">Struttura principale</h3>
                  </div>
                  <p className="text-xs text-[#999]">Struttura principale per la timbratura GPS delle presenze PS.</p>
                  <div>
                    <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Indirizzo</label>
                    <div className="flex gap-2">
                      <input value={teamSettings.indirizzo || ''} onChange={e => setTeam('indirizzo', e.target.value)}
                        placeholder="Es. Via dello Sport 1, Castelmauro"
                        className="flex-1 border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                      <button onClick={geocodeAddress} disabled={geoLoading}
                        className="bg-[#1c84c6] hover:bg-[#1a75b0] disabled:opacity-50 text-white px-3 py-2 rounded text-sm font-semibold flex items-center gap-1">
                        {geoLoading ? <Loader size={14} className="animate-spin"/> : <MapPin size={14}/>}
                        Rileva
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Raggio timbratura (metri)</label>
                    <input type="number" min="50" max="2000" value={teamSettings.raggio_timbratura || 200}
                      onChange={e => setTeam('raggio_timbratura', +e.target.value)}
                      className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Latitudine</label>
                      <input type="number" step="0.0000001" value={teamSettings.lat || ''}
                        onChange={e => setTeam('lat', parseFloat(e.target.value))} placeholder="41.7654321"
                        className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Longitudine</label>
                      <input type="number" step="0.0000001" value={teamSettings.lng || ''}
                        onChange={e => setTeam('lng', parseFloat(e.target.value))} placeholder="14.7654321"
                        className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                    </div>
                  </div>
                  {teamSettings.lat && teamSettings.lng && (
                    <div className="bg-green-50 border border-green-200 rounded p-3 flex items-center gap-2">
                      <MapPin size={14} className="text-green-600"/>
                      <span className="text-green-700 text-sm">
                        Configurata: {Number(teamSettings.lat).toFixed(5)}, {Number(teamSettings.lng).toFixed(5)} — raggio {teamSettings.raggio_timbratura}m
                      </span>
                    </div>
                  )}
                  <button onClick={useCurrentPosition} disabled={geoLoading}
                    className="w-full border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm flex items-center justify-center gap-2">
                    {geoLoading ? <Loader size={14} className="animate-spin"/> : <MapPin size={14}/>}
                    Usa posizione attuale del dispositivo
                  </button>
                </div>

                <button onClick={saveTeamSettings} disabled={savingTeam}
                  className="w-full bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
                  {savingTeam ? 'Salvataggio...' : 'Salva impostazioni squadra'}
                </button>
              </>
            )}
          </div>

          {/* Strutture sportive */}
          <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e7eaec] pb-3">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-[#1ab394]"/>
                <h2 className="text-[#2f4050] font-bold text-sm uppercase tracking-wide">Strutture sportive</h2>
              </div>
              <button onClick={() => setVenueModal({})}
                className="flex items-center gap-1 bg-[#1ab394] hover:bg-[#18a689] text-white px-3 py-1.5 rounded text-xs font-semibold">
                <Plus size={13}/> Nuova
              </button>
            </div>
            <p className="text-xs text-[#999]">
              Le strutture vengono usate dal mister per indicare il luogo degli allenamenti e per la timbratura GPS.
            </p>
            {venues.length === 0 ? (
              <div className="text-center text-[#999] py-6 text-sm">
                Nessuna struttura configurata. Clicca "Nuova" per aggiungerne una.
              </div>
            ) : (
              <div className="space-y-2">
                {venues.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 border border-[#e7eaec] rounded">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-[#2f4050] font-medium text-sm">{v.nome}</div>
                        {!v.active && <span className="text-xs text-[#999] bg-gray-200 px-1.5 py-0.5 rounded">Non attiva</span>}
                      </div>
                      {v.indirizzo && (
                        <div className="text-xs text-[#999] mt-0.5 flex items-center gap-1">
                          <MapPin size={10}/> {v.indirizzo}{v.citta ? `, ${v.citta}` : ''}
                        </div>
                      )}
                      {v.lat && v.lng ? (
                        <div className="text-xs text-green-600 mt-0.5">
                          ✅ GPS configurato — raggio {v.raggio_timbratura}m
                        </div>
                      ) : (
                        <div className="text-xs text-yellow-600 mt-0.5">⚠️ GPS non configurato</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setVenueModal(v)} className="text-[#999] hover:text-[#1c84c6]"><Edit2 size={15}/></button>
                      <button onClick={() => deleteVenue(v.id)} className="text-[#999] hover:text-red-500"><Trash2 size={15}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {venueModal !== null && (
        <VenueModal
          venue={venueModal}
          clubId={club?.id || profile?.club_id}
          onClose={() => setVenueModal(null)}
          onSaved={() => { setVenueModal(null); loadVenues() }}
        />
      )}
    </div>
  )
}

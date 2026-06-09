import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

const PIANI = [
  {
    id: 'starter',
    nome: 'Starter',
    prezzo: 19,
    descrizione: 'Solo Prima Squadra',
    moduli: ['Prima Squadra', 'Presenze & GPS', 'Convocazioni', 'Documenti', 'Chat interna'],
    colore: '#676a6c',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    borderActive: 'border-gray-400',
  },
  {
    id: 'pro',
    nome: 'Pro',
    prezzo: 39,
    descrizione: 'Prima Squadra + Scuola Calcio',
    moduli: ['Tutto Starter', 'Scuola Calcio', 'Atleti giovanili', 'Pagamenti SC', 'Magazzino'],
    colore: '#1ab394',
    bg: 'bg-[#1ab394]/5',
    border: 'border-[#1ab394]/30',
    borderActive: 'border-[#1ab394]',
    popolare: true,
  },
  {
    id: 'full',
    nome: 'Full',
    prezzo: 59,
    descrizione: 'PS + SC + Area Genitori',
    moduli: ['Tutto Pro', 'Area Genitori', 'Pagamenti online', 'Kit & Bacheca', 'Notifiche push'],
    colore: '#27ae60',
    bg: 'bg-[#27ae60]/5',
    border: 'border-[#27ae60]/30',
    borderActive: 'border-[#27ae60]',
  },
]

function generateSlug(nome) {
  const base = nome.toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u').replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '')
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [piano, setPiano] = useState('pro')
  const [club, setClub] = useState({ nome: '', citta: '', email: '', telefono: '' })
  const [admin, setAdmin] = useState({ nome: '', cognome: '', email: '', password: '', conferma: '' })
  const [showPw, setShowPw] = useState(false)
  const [showConferma, setShowConferma] = useState(false)

  function setC(k, v) { setClub(f => ({ ...f, [k]: v })) }
  function setA(k, v) { setAdmin(f => ({ ...f, [k]: v })) }

  function canGoStep2() { return !!piano }
  function canGoStep3() { return club.nome.trim().length >= 3 && club.citta.trim().length >= 2 }
  function canGoStep4() {
    return admin.nome.trim() && admin.cognome.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email) &&
      admin.password.length >= 8 &&
      admin.password === admin.conferma
  }

  async function handleSubmit() {
    if (!canGoStep4()) return
    setLoading(true)
    try {
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 14)

      // 1. Crea il club PRIMA usando service role via signUp metadata
      //    Usiamo il client anonimo — funziona grazie alla policy "allow_public_insert_clubs"
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .insert([{
          nome: club.nome,
          slug: generateSlug(club.nome),
          email: club.email || admin.email,
          telefono: club.telefono || null,
          citta: club.citta,
          piano: piano,
          stato: 'trial',
          trial_ends_at: trialEnd.toISOString(),
          license_expires_at: null,
          max_users: 50,
        }])
        .select()
        .single()

      if (clubError) throw new Error('Errore creazione club: ' + clubError.message)

      // 2. Crea l'utente Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: admin.email,
        password: admin.password,
        options: { data: { nome: admin.nome, cognome: admin.cognome } }
      })
      if (authError) throw new Error('Errore creazione utente: ' + authError.message)

      const userId = authData.user?.id
      if (!userId) throw new Error('ID utente non disponibile')

      // 3. Crea il profilo admin collegato al club
      const { error: profileError } = await supabase
  .from('profiles')
  .upsert([{
    id: userId,
    club_id: clubData.id,
    role: 'admin',
    nome: admin.nome,
    cognome: admin.cognome,
    email: admin.email,
  }])
      if (profileError) throw new Error('Errore creazione profilo: ' + profileError.message)

      // 4. Crea team_settings base
      await supabase.from('team_settings').upsert([{
        club_id: clubData.id,
        nome_squadra: club.nome,
        citta: club.citta,
        modulo_prima_squadra: true,
        modulo_scuola_calcio: piano === 'pro' || piano === 'full',
        updated_at: new Date().toISOString(),
      }])

      toast.success('Account creato! Benvenuto in SoccerClub 🎉')
      navigate('/onboarding', { state: { clubId: clubData.id, piano } })

    } catch (err) {
      toast.error(err.message || 'Errore durante la registrazione')
    } finally {
      setLoading(false)
    }
  }

  const pianoSelezionato = PIANI.find(p => p.id === piano)

  return (
    <div className="min-h-screen bg-[#f3f3f4] flex flex-col">
      <header className="bg-white border-b border-[#e7eaec] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1ab394] flex items-center justify-center text-white text-sm font-bold">SC</div>
          <span className="font-bold text-[#2f4050] text-sm">SoccerClub</span>
        </div>
        <Link to="/login" className="text-sm text-[#1ab394] hover:underline">Hai già un account? Accedi</Link>
      </header>

      <div className="flex-1 flex items-start justify-center p-4 pt-8">
        <div className="w-full max-w-2xl">

          {/* Progress steps */}
          <div className="flex items-center justify-center mb-8">
            {[{n:1,label:'Piano'},{n:2,label:'Squadra'},{n:3,label:'Account'},{n:4,label:'Conferma'}].map(({n,label},i) => (
              <div key={n} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step > n ? 'bg-[#1ab394] text-white' :
                    step === n ? 'bg-[#2f4050] text-white' :
                    'bg-white border-2 border-[#e7eaec] text-[#999]'
                  }`}>
                    {step > n ? <Check size={14}/> : n}
                  </div>
                  <span className={`text-xs mt-1 ${step === n ? 'text-[#2f4050] font-semibold' : 'text-[#999]'}`}>{label}</span>
                </div>
                {i < 3 && <div className={`w-16 h-0.5 mx-1 mb-4 ${step > n ? 'bg-[#1ab394]' : 'bg-[#e7eaec]'}`}/>}
              </div>
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-[#2f4050]">Scegli il tuo piano</h1>
                <p className="text-[#999] text-sm mt-1">14 giorni di prova gratuita, nessuna carta richiesta</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {PIANI.map(p => (
                  <div key={p.id} onClick={() => setPiano(p.id)}
                    className={`relative cursor-pointer rounded-lg border-2 p-5 transition-all ${
                      piano === p.id ? `${p.bg} ${p.borderActive} shadow-md` : `bg-white ${p.border} hover:shadow-sm`
                    }`}>
                    {p.popolare && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1ab394] text-white text-xs font-bold px-3 py-0.5 rounded-full">
                        Più scelto
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-[#2f4050]">{p.nome}</span>
                      {piano === p.id && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{background: p.colore}}>
                          <Check size={12} className="text-white"/>
                        </div>
                      )}
                    </div>
                    <div className="mb-3">
                      <span className="text-2xl font-bold" style={{color: p.colore}}>€{p.prezzo}</span>
                      <span className="text-[#999] text-xs">/mese</span>
                    </div>
                    <p className="text-xs text-[#999] mb-3">{p.descrizione}</p>
                    <ul className="space-y-1.5">
                      {p.moduli.map(m => (
                        <li key={m} className="flex items-center gap-2 text-xs text-[#676a6c]">
                          <Check size={11} style={{color: p.colore}} className="flex-shrink-0"/>{m}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center text-xs text-[#999]">
                ✓ Trial 14 giorni gratuiti · ✓ Nessuna carta richiesta · ✓ Cancella quando vuoi
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setStep(2)}
                  className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-6 py-2.5 rounded text-sm font-semibold">
                  Continua <ChevronRight size={16}/>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-6">
              <h1 className="text-xl font-bold text-[#2f4050] mb-1">La tua squadra</h1>
              <p className="text-[#999] text-sm mb-6">Inserisci i dati della tua società</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#676a6c] uppercase tracking-wide mb-1">Nome squadra *</label>
                  <input value={club.nome} onChange={e => setC('nome', e.target.value)}
                    placeholder="es. ASD Rossi Calcio 2000"
                    className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                  {club.nome.length >= 3 && (
                    <p className="text-xs text-[#999] mt-1">Slug: <code className="bg-gray-100 px-1 rounded">{generateSlug(club.nome)}</code></p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#676a6c] uppercase tracking-wide mb-1">Città *</label>
                  <input value={club.citta} onChange={e => setC('citta', e.target.value)}
                    placeholder="es. Roma"
                    className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#676a6c] uppercase tracking-wide mb-1">Email club</label>
                    <input type="email" value={club.email} onChange={e => setC('email', e.target.value)}
                      placeholder="info@asd..."
                      className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#676a6c] uppercase tracking-wide mb-1">Telefono</label>
                    <input value={club.telefono} onChange={e => setC('telefono', e.target.value)}
                      placeholder="+39 ..."
                      className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-between">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-[#999] hover:text-[#676a6c] text-sm">
                  <ChevronLeft size={16}/> Indietro
                </button>
                <button onClick={() => setStep(3)} disabled={!canGoStep3()}
                  className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white px-6 py-2.5 rounded text-sm font-semibold">
                  Continua <ChevronRight size={16}/>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-6">
              <h1 className="text-xl font-bold text-[#2f4050] mb-1">Il tuo account</h1>
              <p className="text-[#999] text-sm mb-6">Credenziali per l'amministratore</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#676a6c] uppercase tracking-wide mb-1">Nome *</label>
                    <input value={admin.nome} onChange={e => setA('nome', e.target.value)}
                      placeholder="Mario"
                      className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#676a6c] uppercase tracking-wide mb-1">Cognome *</label>
                    <input value={admin.cognome} onChange={e => setA('cognome', e.target.value)}
                      placeholder="Rossi"
                      className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#676a6c] uppercase tracking-wide mb-1">Email *</label>
                  <input type="email" value={admin.email} onChange={e => setA('email', e.target.value)}
                    placeholder="mario.rossi@email.it"
                    className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#676a6c] uppercase tracking-wide mb-1">Password *</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={admin.password} onChange={e => setA('password', e.target.value)}
                      placeholder="Minimo 8 caratteri"
                      className="w-full border border-[#e7eaec] rounded px-3 py-2 pr-10 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999]">
                      {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                  {admin.password && admin.password.length < 8 && (
                    <p className="text-xs text-red-400 mt-1">Minimo 8 caratteri</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#676a6c] uppercase tracking-wide mb-1">Conferma password *</label>
                  <div className="relative">
                    <input type={showConferma ? 'text' : 'password'} value={admin.conferma} onChange={e => setA('conferma', e.target.value)}
                      placeholder="Ripeti la password"
                      className="w-full border border-[#e7eaec] rounded px-3 py-2 pr-10 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                    <button type="button" onClick={() => setShowConferma(!showConferma)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999]">
                      {showConferma ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                  {admin.conferma && admin.password !== admin.conferma && (
                    <p className="text-xs text-red-400 mt-1">Le password non coincidono</p>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-between">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 text-[#999] hover:text-[#676a6c] text-sm">
                  <ChevronLeft size={16}/> Indietro
                </button>
                <button onClick={() => setStep(4)} disabled={!canGoStep4()}
                  className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white px-6 py-2.5 rounded text-sm font-semibold">
                  Continua <ChevronRight size={16}/>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-6">
              <h1 className="text-xl font-bold text-[#2f4050] mb-1">Riepilogo</h1>
              <p className="text-[#999] text-sm mb-6">Controlla i dati prima di confermare</p>
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-[#e7eaec] bg-gray-50">
                  <div className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-2">Piano scelto</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#2f4050]">{pianoSelezionato?.nome}</span>
                      <span className="text-xs text-[#999] ml-2">{pianoSelezionato?.descrizione}</span>
                    </div>
                    <div>
                      <span className="font-bold text-[#1ab394]">€{pianoSelezionato?.prezzo}/mese</span>
                      <span className="text-xs text-[#999] ml-1">(dopo il trial)</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-[#e7eaec] bg-gray-50">
                  <div className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-2">Squadra</div>
                  <div className="text-sm text-[#676a6c]">
                    <span className="font-medium text-[#2f4050]">{club.nome}</span> — {club.citta}
                    {club.email && <div className="text-xs mt-0.5">{club.email}</div>}
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-[#e7eaec] bg-gray-50">
                  <div className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-2">Amministratore</div>
                  <div className="text-sm text-[#676a6c]">
                    <span className="font-medium text-[#2f4050]">{admin.nome} {admin.cognome}</span>
                    <span className="text-xs ml-2">{admin.email}</span>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-[#1ab394]/30 bg-[#1ab394]/5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1ab394] text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">14</div>
                  <div>
                    <div className="text-sm font-semibold text-[#2f4050]">14 giorni di prova gratuita</div>
                    <div className="text-xs text-[#999] mt-0.5">
                      Nessuna carta richiesta. Accesso completo al piano {pianoSelezionato?.nome} per 14 giorni.
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[#999] text-center">
                  Registrandoti accetti i <span className="text-[#1ab394] cursor-pointer hover:underline">Termini di Servizio</span> e la <span className="text-[#1ab394] cursor-pointer hover:underline">Privacy Policy</span>
                </p>
              </div>
              <div className="mt-6 flex justify-between">
                <button onClick={() => setStep(3)} className="flex items-center gap-1 text-[#999] hover:text-[#676a6c] text-sm">
                  <ChevronLeft size={16}/> Indietro
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white px-6 py-2.5 rounded text-sm font-semibold min-w-[180px] justify-center">
                  {loading ? <><Loader2 size={15} className="animate-spin"/> Creazione...</> : '🎉 Inizia il trial gratuito'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

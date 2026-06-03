import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { User, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLE_LABELS = { admin: 'Admin', mister: 'Mister', player_paid: 'Calciatore', player_volunteer: 'Volontario' }
const TAGLIE = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export default function Settings() {
  const { profile, user } = useAuth()
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

  const initials = `${profile?.nome?.[0] || ''}${profile?.cognome?.[0] || ''}`.toUpperCase()

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

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-white">Impostazioni</h1>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#C00000]/20 text-[#C00000] flex items-center justify-center text-2xl font-bold">
          {initials || '?'}
        </div>
        <div>
          <div className="text-white font-semibold text-lg">{profile?.nome} {profile?.cognome}</div>
          <div className="text-[#6B7280] text-sm">{user?.email}</div>
          <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs bg-[#C00000]/20 text-[#C00000]">
            {ROLE_LABELS[profile?.role] || profile?.role}
          </span>
        </div>
      </div>

      {/* Dati personali */}
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User size={16} className="text-[#C00000]"/>
          <h2 className="text-white font-semibold">Dati personali</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[['nome','Nome'],['cognome','Cognome'],['telefono','Telefono'],['codice_fiscale','Codice fiscale'],['numero_patente','N° patente']].map(([k, l]) => (
            <div key={k}>
              <label className="block text-xs text-[#6B7280] mb-1">{l}</label>
              <input value={form[k]} onChange={e => set(k, e.target.value)}
                className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"/>
            </div>
          ))}
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Taglia</label>
            <select value={form.taglia} onChange={e => set('taglia', e.target.value)}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]">
              {TAGLIE.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <button onClick={saveProfile} disabled={savingProfile}
          className="bg-[#C00000] hover:bg-[#A00000] disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-semibold">
          {savingProfile ? 'Salvataggio...' : 'Salva modifiche'}
        </button>
      </div>

      {/* Cambia password */}
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock size={16} className="text-[#C00000]"/>
          <h2 className="text-white font-semibold">Cambia password</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Nuova password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"
              placeholder="Minimo 6 caratteri"/>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Conferma password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"
              placeholder="Ripeti la password"/>
          </div>
        </div>
        <button onClick={savePassword} disabled={savingPassword}
          className="bg-[#C00000] hover:bg-[#A00000] disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-semibold">
          {savingPassword ? 'Aggiornamento...' : 'Aggiorna password'}
        </button>
      </div>
    </div>
  )
}

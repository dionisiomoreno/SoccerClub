import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const DEMO = [
  { label: 'Admin',      email: 'admin@soccer.com',     password: 'password123' },
  { label: 'Mister',     email: 'mister@soccer.com',    password: 'password123' },
  { label: 'Calciatore', email: 'player@soccer.com',    password: 'password123' },
  { label: 'Volontario', email: 'volunteer@soccer.com', password: 'password123' },
]

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      toast.error('Credenziali non valide')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f3f4] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1ab394] text-white text-xl font-bold mb-3">
            SC
          </div>
          <h1 className="text-2xl font-bold text-[#2f4050]">SoccerClub</h1>
          <p className="text-[#999] text-sm mt-1">ASD Castelmauro Calcio 1986</p>
        </div>

        {/* Form */}
        <div className="bg-white border border-[#e7eaec] rounded shadow-card p-6 space-y-4">
          <h2 className="text-center text-[#676a6c] font-semibold mb-2">Accedi al tuo account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#676a6c] mb-1 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] focus:ring-1 focus:ring-[#1ab394] transition-colors"
                placeholder="email@esempio.it"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#676a6c] mb-1 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 pr-10 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] focus:ring-1 focus:ring-[#1ab394] transition-colors"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#676a6c]">
                  {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white font-semibold py-2 rounded text-sm transition-colors">
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>
        </div>

        {/* Demo buttons */}
        <div className="mt-4 bg-white border border-[#e7eaec] rounded shadow-card p-4">
          <p className="text-xs text-[#999] text-center mb-3 uppercase tracking-wide font-semibold">Accesso rapido demo</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO.map(d => (
              <button key={d.label}
                onClick={() => { setEmail(d.email); setPassword(d.password) }}
                className="border border-[#e7eaec] hover:border-[#1ab394] hover:text-[#1ab394] text-[#676a6c] text-xs py-2 rounded transition-colors">
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

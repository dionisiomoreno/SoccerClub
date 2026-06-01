import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const DEMO = [
  { label: 'Admin',      email: 'admin@test.it',     password: 'password123' },
  { label: 'Mister',     email: 'mister@test.it',    password: 'password123' },
  { label: 'Calciatore', email: 'player@test.it',    password: 'password123' },
  { label: 'Volontario', email: 'volunteer@test.it', password: 'password123' },
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
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#C00000] flex items-center justify-center text-white text-2xl font-bold mb-3">
            SC
          </div>
          <h1 className="text-2xl font-bold text-white">SoccerClub</h1>
          <p className="text-[#6B7280] text-sm mt-1">ASD Castelmauro Calcio 1986</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"
              placeholder="email@esempio.it"
            />
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Password</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 pr-10 text-white text-sm outline-none focus:border-[#C00000]"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white">
                {show ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C00000] hover:bg-[#A00000] disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        {/* Demo buttons */}
        <div className="mt-4">
          <p className="text-xs text-[#6B7280] text-center mb-2">Accesso rapido demo</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO.map(d => (
              <button key={d.label}
                onClick={() => { setEmail(d.email); setPassword(d.password) }}
                className="bg-[#1E1E1E] border border-[#2A2A2A] hover:border-[#C00000] text-white text-xs py-2 rounded-lg transition-colors">
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

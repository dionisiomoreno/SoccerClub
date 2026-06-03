import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-center p-4">
      <div className="text-8xl font-bold text-[#C00000] mb-4">404</div>
      <h1 className="text-2xl font-bold text-white mb-2">Pagina non trovata</h1>
      <p className="text-[#6B7280] mb-8">La pagina che cerchi non esiste o è stata spostata.</p>
      <Link to="/" className="bg-[#C00000] hover:bg-[#A00000] text-white px-6 py-3 rounded-lg font-semibold transition-colors">
        Torna alla dashboard
      </Link>
    </div>
  )
}

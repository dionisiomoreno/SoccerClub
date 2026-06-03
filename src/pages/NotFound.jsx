import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f3f3f4] flex flex-col items-center justify-center text-center p-4">
      <div className="text-8xl font-bold text-[#1ab394] mb-4">404</div>
      <h1 className="text-2xl font-bold text-[#2f4050] mb-2">Pagina non trovata</h1>
      <p className="text-[#999] mb-8">La pagina che cerchi non esiste o è stata spostata.</p>
      <Link to="/" className="bg-[#1ab394] hover:bg-[#18a689] text-white px-6 py-3 rounded font-semibold transition-colors">
        Torna alla dashboard
      </Link>
    </div>
  )
}

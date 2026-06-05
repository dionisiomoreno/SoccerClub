import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Megaphone, AlertTriangle, Calendar, Users, Trophy, Coffee, Bell } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

const TIPI = {
  generale:          { label: 'Comunicazione generale', icon: Megaphone,     color: 'bg-blue-100 text-blue-600' },
  evento:            { label: 'Evento',                 icon: Calendar,      color: 'bg-purple-100 text-purple-600' },
  convocazione:      { label: 'Convocazione',           icon: Users,         color: 'bg-green-100 text-green-600' },
  torneo:            { label: 'Torneo',                 icon: Trophy,        color: 'bg-yellow-100 text-yellow-600' },
  riunione_genitori: { label: 'Riunione genitori',      icon: Coffee,        color: 'bg-orange-100 text-orange-600' },
  avviso_urgente:    { label: 'Avviso urgente',         icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
}

export default function ParentBacheca() {
  const { profile } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [categories, setCategories] = useState([])
  const [childCategoryId, setChildCategoryId] = useState(null)
  const [filterTipo, setFilterTipo] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [profile])
  useEffect(() => { if (childCategoryId !== null) fetchAnnouncements() }, [filterTipo, childCategoryId])

  async function load() {
    if (!profile?.id) return
    setLoading(true)

    // Recupera la categoria del figlio
    const { data: parent } = await supabase
      .from('parents')
      .select('youth_players(category_id)')
      .eq('user_id', profile.id)
      .single()
    const catId = parent?.youth_players?.category_id || null
    setChildCategoryId(catId)

    const { data: cat } = await supabase.from('categories').select('*').order('ordine')
    setCategories(cat || [])
  }

  async function fetchAnnouncements() {
    setLoading(true)
    // Mostra comunicazioni generali (senza categoria) O della categoria del figlio
    let q = supabase
      .from('announcements')
      .select('*, profiles(nome,cognome), categories(nome,colore)')
      .eq('pubblicato', true)
      .order('created_at', { ascending: false })

    const { data } = await q
    let filtered = (data || []).filter(a =>
      !a.category_id || a.category_id === childCategoryId
    )
    if (filterTipo) filtered = filtered.filter(a => a.tipo === filterTipo)
    setAnnouncements(filtered)

    // Marca notifiche come lette
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', profile.id)
      .eq('type', 'new_announcement')

    setLoading(false)
  }

  const urgenti = announcements.filter(a => a.tipo === 'avviso_urgente')
  const altri = announcements.filter(a => a.tipo !== 'avviso_urgente')

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4">
        <h1 className="text-2xl font-bold text-[#2f4050]">Bacheca</h1>
        <p className="text-sm text-[#999] mt-1">Comunicazioni dalla società</p>
      </div>

      {/* Filtro tipo */}
      <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
        className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60] w-full sm:w-auto">
        <option value="">Tutti i tipi</option>
        {Object.entries(TIPI).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
      </select>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[#27ae60] border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-12 text-center">
          <Megaphone size={36} className="mx-auto text-[#999] mb-3"/>
          <p className="text-[#999] text-sm">Nessuna comunicazione disponibile</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Avvisi urgenti in evidenza */}
          {urgenti.length > 0 && (
            <div className="space-y-3">
              {urgenti.map(a => <AnnouncementCard key={a.id} ann={a}/>)}
            </div>
          )}
          {/* Altri annunci */}
          {altri.length > 0 && (
            <div className="space-y-3">
              {altri.map(a => <AnnouncementCard key={a.id} ann={a}/>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AnnouncementCard({ ann }) {
  const T = TIPI[ann.tipo] || TIPI.generale
  const Icon = T.icon
  const [expanded, setExpanded] = useState(ann.tipo === 'avviso_urgente')

  return (
    <div className={clsx(
      'bg-white border rounded shadow-sm overflow-hidden',
      ann.tipo === 'avviso_urgente' ? 'border-red-300' : 'border-[#e7eaec]'
    )}>
      <button className="w-full p-4 text-left" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start gap-3">
          <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', T.color)}>
            <Icon size={17}/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', T.color)}>{T.label}</span>
              {ann.categories && (
                <span className="px-2 py-0.5 rounded text-xs text-white font-medium"
                  style={{ background: ann.categories.colore }}>
                  {ann.categories.nome}
                </span>
              )}
              {!ann.category_id && (
                <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-[#999]">Tutte le categorie</span>
              )}
            </div>
            <h3 className="text-[#2f4050] font-bold text-sm">{ann.titolo}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-[#999]">
              <span>{format(new Date(ann.created_at), "d MMMM yyyy 'alle' HH:mm", { locale: it })}</span>
              {ann.profiles && <span>— {ann.profiles.nome} {ann.profiles.cognome}</span>}
              {ann.data_evento && (
                <span className="text-[#27ae60] font-medium">
                  📅 {format(new Date(ann.data_evento), 'dd/MM/yyyy')}
                </span>
              )}
            </div>
          </div>
          <span className="text-[#999] text-xs flex-shrink-0 mt-1">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && ann.contenuto && (
        <div className="px-4 pb-4 pt-0">
          <div className="ml-12 border-t border-[#e7eaec] pt-3">
            <p className="text-[#676a6c] text-sm whitespace-pre-line leading-relaxed">{ann.contenuto}</p>
          </div>
        </div>
      )}
    </div>
  )
}

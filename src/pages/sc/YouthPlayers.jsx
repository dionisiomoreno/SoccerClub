import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { UserPlus, Search, Edit2, Trash2, Eye, Download, X, AlertTriangle, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const DOC_TYPES = {
  documento_identita: 'Documento identità',
  certificato_medico: 'Certificato medico',
  modulo_iscrizione: 'Modulo iscrizione',
  liberatoria_privacy: 'Liberatoria privacy'
}

function MedicalBadge({ date }) {
  if (!date) return <span className="text-xs text-[#999]">—</span>
  const days = differenceInDays(new Date(date), new Date())
  if (days < 0) return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-100 text-red-600"><AlertTriangle size={10}/> Scaduto</span>
  if (days <= 30) return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-600"><AlertTriangle size={10}/> {days}gg</span>
  return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-600">Valido</span>
}

function PlayerModal({ player, categories, onClose, onSaved }) {
  const isEdit = !!player?.id
  const [form, setForm] = useState({
    nome: '', cognome: '', data_nascita: '', luogo_nascita: '',
    codice_fiscale: '', indirizzo: '', telefono: '', email: '',
    category_id: categories[0]?.id || '', squadra: '', numero_maglia: '',
    numero_tessera: '', data_iscrizione: format(new Date(), 'yyyy-MM-dd'),
    data_certificato_medico: '', scadenza_certificato_medico: '',
    note: '', active: true, ...player
  })
  const [parents, setParents] = useState([
    { tipo: 'padre', nome: '', cognome: '', telefono: '', email: '' },
    { tipo: 'madre', nome: '', cognome: '', telefono: '', email: '' }
  ])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isEdit) loadParents()
  }, [])

  async function loadParents() {
    const { data } = await supabase.from('parents').select('*').eq('youth_player_id', player.id)
    if (data && data.length > 0) {
      const padre = data.find(p => p.tipo === 'padre') || { tipo: 'padre', nome: '', cognome: '', telefono: '', email: '' }
      const madre = data.find(p => p.tipo === 'madre') || { tipo: 'madre', nome: '', cognome: '', telefono: '', email: '' }
      setParents([padre, madre])
    }
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function setParent(idx, k, v) { setParents(p => p.map((x, i) => i === idx ? { ...x, [k]: v } : x)) }

  async function save() {
    if (!form.nome || !form.cognome) return toast.error('Nome e cognome obbligatori')
    setLoading(true)
    let playerId = form.id

    if (isEdit) {
      const { error } = await supabase.from('youth_players').update({ ...form, updated_at: new Date().toISOString() }).eq('id', form.id)
      if (error) { toast.error(error.message); setLoading(false); return }
    } else {
      const { data, error } = await supabase.from('youth_players').insert([{ ...form }]).select().single()
      if (error) { toast.error(error.message); setLoading(false); return }
      playerId = data.id
    }

    // Salva genitori
    for (const p of parents) {
      if (!p.nome) continue
      if (p.id) {
        await supabase.from('parents').update(p).eq('id', p.id)
      } else {
        await supabase.from('parents').insert([{ ...p, youth_player_id: playerId }])
      }
    }

    toast.success(isEdit ? 'Atleta aggiornato' : 'Atleta aggiunto')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit ? 'Modifica' : 'Nuovo'} Atleta</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-4">

          {/* Dati personali */}
          <div>
            <h3 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Dati personali</h3>
            <div className="grid grid-cols-2 gap-3">
              {[['nome','Nome *'],['cognome','Cognome *'],['luogo_nascita','Luogo nascita'],['codice_fiscale','Codice fiscale'],['indirizzo','Indirizzo'],['telefono','Telefono'],['email','Email']].map(([k,l]) => (
                <div key={k}>
                  <label className="block text-xs text-[#999] mb-1">{l}</label>
                  <input value={form[k]||''} onChange={e=>set(k,e.target.value)}
                    className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                </div>
              ))}
              <div>
                <label className="block text-xs text-[#999] mb-1">Data nascita</label>
                <input type="date" value={form.data_nascita||''} onChange={e=>set('data_nascita',e.target.value)}
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
              </div>
            </div>
          </div>

          {/* Dati sportivi */}
          <div className="border-t border-[#e7eaec] pt-4">
            <h3 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Dati sportivi</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#999] mb-1">Categoria</label>
                <select value={form.category_id||''} onChange={e=>set('category_id',e.target.value)}
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              {[['squadra','Squadra'],['numero_maglia','N° maglia'],['numero_tessera','N° tessera FIGC']].map(([k,l]) => (
  <div key={k}>
    <label className="block text-xs text-[#999] mb-1">{l}</label>
    <input value={form[k]||''} onChange={e=>set(k,e.target.value)}
      className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
  </div>
))}
<div>
  <label className="block text-xs text-[#999] mb-1">Taglia</label>
  <select value={form.taglia||'M'} onChange={e=>set('taglia',e.target.value)}
    className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
    {['XS','S','M','L','XL','XXL','4','5','6','7','8','9','10','11','12'].map(t=><option key={t}>{t}</option>)}
  </select>
</div>
              <div>
                <label className="block text-xs text-[#999] mb-1">Data iscrizione</label>
                <input type="date" value={form.data_iscrizione||''} onChange={e=>set('data_iscrizione',e.target.value)}
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
              </div>
            </div>
          </div>

          {/* Certificato medico */}
          <div className="border-t border-[#e7eaec] pt-4">
            <h3 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Certificato medico</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#999] mb-1">Data certificato</label>
                <input type="date" value={form.data_certificato_medico||''} onChange={e=>set('data_certificato_medico',e.target.value)}
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">Scadenza certificato</label>
                <input type="date" value={form.scadenza_certificato_medico||''} onChange={e=>set('scadenza_certificato_medico',e.target.value)}
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
              </div>
            </div>
          </div>

          {/* Genitori */}
          <div className="border-t border-[#e7eaec] pt-4">
            <h3 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Dati genitori</h3>
            {parents.map((p, idx) => (
              <div key={idx} className="mb-4">
                <div className="text-xs font-semibold text-[#1ab394] uppercase mb-2">{p.tipo === 'padre' ? '👨 Padre' : '👩 Madre'}</div>
                <div className="grid grid-cols-2 gap-2">
                  {[['nome','Nome'],['cognome','Cognome'],['telefono','Telefono'],['email','Email']].map(([k,l]) => (
                    <div key={k}>
                      <label className="block text-xs text-[#999] mb-1">{l}</label>
                      <input value={p[k]||''} onChange={e=>setParent(idx,k,e.target.value)}
                        className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Note */}
          <div className="border-t border-[#e7eaec] pt-4">
            <label className="block text-xs text-[#999] mb-1">Note</label>
            <textarea value={form.note||''} onChange={e=>set('note',e.target.value)} rows={2}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PlayerDetail({ player, categories, onClose, onEdit }) {
  const [parents, setParents] = useState([])
  const [docs, setDocs] = useState([])
  const cat = categories.find(c => c.id === player.category_id)

  useEffect(() => {
    supabase.from('parents').select('*').eq('youth_player_id', player.id).then(({ data }) => setParents(data || []))
    supabase.from('youth_documents').select('*').eq('youth_player_id', player.id).then(({ data }) => setDocs(data || []))
  }, [])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Scheda Atleta</h2>
          <div className="flex gap-2">
            <button onClick={onEdit} className="text-xs text-[#1c84c6] hover:underline flex items-center gap-1"><Edit2 size={12}/> Modifica</button>
            <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
              style={{ background: cat?.colore || '#1ab394' }}>
              {(player.nome?.[0]||'')+(player.cognome?.[0]||'')}
            </div>
            <div>
              <div className="text-[#2f4050] font-bold text-lg">{player.nome} {player.cognome}</div>
              <div className="flex gap-2 mt-1 flex-wrap">
                {cat && <span className="px-2 py-0.5 rounded text-xs text-white font-medium" style={{ background: cat.colore }}>{cat.nome}</span>}
                {player.squadra && <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-[#676a6c]">{player.squadra}</span>}
                <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', player.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500')}>
                  {player.active ? 'Attivo' : 'Non attivo'}
                </span>
              </div>
            </div>
          </div>

          {/* Dati */}
          <div className="bg-gray-50 rounded p-4">
            <h3 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Dati personali</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ['Data nascita', player.data_nascita ? format(new Date(player.data_nascita), 'dd/MM/yyyy') : null],
                ['Luogo nascita', player.luogo_nascita],
                ['Codice fiscale', player.codice_fiscale],
                ['Telefono', player.telefono],
                ['Email', player.email],
                ['Indirizzo', player.indirizzo],
                ['N° tessera', player.numero_tessera],
                ['N° maglia', player.numero_maglia],
                ['Iscritto il', player.data_iscrizione ? format(new Date(player.data_iscrizione), 'dd/MM/yyyy') : null],
              ].map(([l, v]) => v ? (
                <div key={l}>
                  <div className="text-[#999] text-xs">{l}</div>
                  <div className="text-[#2f4050] font-medium text-sm">{v}</div>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Certificato */}
          <div className="bg-gray-50 rounded p-4">
            <h3 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Certificato medico</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[#999]">Scadenza</div>
                <div className="text-[#2f4050] font-medium text-sm">
                  {player.scadenza_certificato_medico ? format(new Date(player.scadenza_certificato_medico), 'dd/MM/yyyy') : '—'}
                </div>
              </div>
              <MedicalBadge date={player.scadenza_certificato_medico}/>
            </div>
          </div>

          {/* Genitori */}
          {parents.length > 0 && (
            <div className="bg-gray-50 rounded p-4">
              <h3 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Genitori</h3>
              {parents.map(p => (
                <div key={p.id} className="mb-3 last:mb-0">
                  <div className="text-xs font-semibold text-[#1ab394] mb-1">{p.tipo === 'padre' ? '👨 Padre' : '👩 Madre'}: {p.nome} {p.cognome}</div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-[#676a6c]">
                    {p.telefono && <span>📞 {p.telefono}</span>}
                    {p.email && <span>✉️ {p.email}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Documenti */}
          <div className="bg-gray-50 rounded p-4">
            <h3 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Documenti ({docs.length})</h3>
            {docs.length === 0 ? (
              <p className="text-xs text-[#999]">Nessun documento caricato</p>
            ) : docs.map(d => (
              <a key={d.id} href={d.file_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 py-1 text-xs text-[#1ab394] hover:underline">
                <FileText size={12}/> {DOC_TYPES[d.tipo] || d.tipo}
              </a>
            ))}
          </div>

          {player.note && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-700">
              📝 {player.note}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function exportPDF(players, categories) {
  const doc = new jsPDF()
  doc.setFillColor(26, 179, 148)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255,255,255)
  doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text('Lista Atleti Scuola Calcio', 14, 13)
  doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.text(`ASD Castelmauro Calcio 1986 — ${new Date().toLocaleDateString('it-IT')}`, 14, 22)
  autoTable(doc, {
    startY: 35,
    head: [['#', 'Cognome e Nome', 'Categoria', 'Data Nascita', 'N° Tessera', 'Cert. Medico']],
    body: players.map((p, i) => [
      i + 1,
      `${p.cognome} ${p.nome}`,
      categories.find(c => c.id === p.category_id)?.nome || '—',
      p.data_nascita ? format(new Date(p.data_nascita), 'dd/MM/yyyy') : '—',
      p.numero_tessera || '—',
      p.scadenza_certificato_medico ? format(new Date(p.scadenza_certificato_medico), 'dd/MM/yyyy') : '—'
    ]),
    headStyles: { fillColor: [26, 179, 148], fontSize: 8 },
    styles: { fontSize: 7 }
  })
  doc.save('atleti_scuola_calcio.pdf')
  toast.success('PDF esportato!')
}

// Fix: import mancante
import { FileText } from 'lucide-react'

export default function YouthPlayers() {
  const { profile, isAdmin, isMister } = useAuth()
  const [players, setPlayers] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterActive, setFilterActive] = useState('1')
  const [modal, setModal] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadCategories(); loadPlayers() }, [])

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').order('ordine')
    setCategories(data || [])
  }

  async function loadPlayers() {
  setLoading(true)
  let q = supabase.from('youth_players').select('*, categories(nome,colore)').order('cognome')
  // Mister SC vede solo gli atleti della sua categoria
  if (isMister && profile?.category_id) {
    q = q.eq('category_id', profile.category_id)
  }
  const { data } = await q
  setPlayers(data || [])
  setLoading(false)
}

  async function deletePlayer(p) {
    if (!confirm(`Eliminare ${p.nome} ${p.cognome}?`)) return
    await supabase.from('youth_players').delete().eq('id', p.id)
    toast.success('Atleta eliminato')
    loadPlayers()
  }

  const filtered = players.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${p.nome} ${p.cognome}`.toLowerCase().includes(q)
    const matchCat = !filterCat || p.category_id === filterCat
    const matchActive = filterActive === '' || (filterActive === '1' ? p.active : !p.active)
    return matchSearch && matchCat && matchActive
  })

  const medicalExpiring = filtered.filter(p => {
    if (!p.scadenza_certificato_medico) return false
    const days = differenceInDays(new Date(p.scadenza_certificato_medico), new Date())
    return days >= 0 && days <= 30
  }).length
  const medicalExpired = filtered.filter(p => {
    if (!p.scadenza_certificato_medico) return false
    return differenceInDays(new Date(p.scadenza_certificato_medico), new Date()) < 0
  }).length

  return (
    <div className="space-y-4">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Atleti Scuola Calcio</h1>
          <p className="text-sm text-[#999] mt-1">Gestione iscritti scuola calcio e settore giovanile</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportPDF(filtered, categories)}
            className="flex items-center gap-2 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-3 py-2 rounded text-sm">
            <Download size={15}/> PDF
          </button>
          <button onClick={() => setModal({})}
            className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
            <UserPlus size={16}/> Nuovo
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-[#1ab394]">{filtered.length}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Totale atleti</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-blue-600">{categories.length}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Categorie</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-yellow-500">{medicalExpiring}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Cert. in scadenza</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-red-500">{medicalExpired}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Cert. scaduti</div>
        </div>
      </div>

      {/* Alert */}
      {(medicalExpired > 0 || medicalExpiring > 0) && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-700 text-sm">
          <AlertTriangle size={16}/>
          {medicalExpired > 0 && <span><strong>{medicalExpired}</strong> certificato/i scaduto/i.</span>}
          {medicalExpiring > 0 && <span><strong>{medicalExpiring}</strong> certificato/i in scadenza entro 30 giorni.</span>}
        </div>
      )}

      {/* Filtri */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca atleta..."
            className="w-full border border-[#e7eaec] rounded pl-8 pr-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
        </div>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
          className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
          <option value="">Tutte le categorie</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={filterActive} onChange={e=>setFilterActive(e.target.value)}
          className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
          <option value="">Tutti</option>
          <option value="1">Attivi</option>
          <option value="0">Non attivi</option>
        </select>
      </div>

      <div className="text-xs text-[#999]">{filtered.length} atleti trovati</div>

      {/* Tabella */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/></div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-[#999] py-12 text-sm">Nessun atleta trovato</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e7eaec] bg-gray-50">
                  {['Atleta','Categoria','Data Nascita','Telefono','Cert. Medico','Stato','Azioni'].map(h=>(
                    <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const cat = categories.find(c => c.id === p.category_id)
                  return (
                    <tr key={p.id} className="border-b border-[#e7eaec] hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: cat?.colore || '#1ab394' }}>
                            {(p.nome?.[0]||'')+(p.cognome?.[0]||'')}
                          </div>
                          <span className="text-[#2f4050] font-medium">{p.cognome} {p.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {cat && <span className="px-2 py-0.5 rounded text-xs text-white font-medium" style={{ background: cat.colore }}>{cat.nome}</span>}
                      </td>
                      <td className="px-4 py-3 text-[#999]">
                        {p.data_nascita ? format(new Date(p.data_nascita), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-[#999]">{p.telefono || '—'}</td>
                      <td className="px-4 py-3"><MedicalBadge date={p.scadenza_certificato_medico}/></td>
                      <td className="px-4 py-3">
                        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', p.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500')}>
                          {p.active ? 'Attivo' : 'Non attivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setDetail(p)} className="text-[#999] hover:text-[#1c84c6]" title="Scheda"><Eye size={15}/></button>
                          <button onClick={() => setModal(p)} className="text-[#999] hover:text-[#1c84c6]"><Edit2 size={15}/></button>
                          <button onClick={() => deletePlayer(p)} className="text-[#999] hover:text-red-500"><Trash2 size={15}/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && <PlayerModal player={modal} categories={categories} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);loadPlayers()}}/>}
      {detail && <PlayerDetail player={detail} categories={categories} onClose={()=>setDetail(null)} onEdit={()=>{setModal(detail);setDetail(null)}}/>}
    </div>
  )
}

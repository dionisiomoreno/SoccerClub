import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  Folder, FolderPlus, FileText, Upload, Trash2, Download,
  X, Edit2, Search, AlertTriangle,
  ChevronRight, Home, Lock, Users, User
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

// ── Costanti ──────────────────────────────────────────────────
const PERMESSI = {
  admin_only:     { label: 'Solo Admin',            icon: Lock,  color: 'bg-red-100 text-red-600' },
  mister:         { label: 'Admin + Mister',        icon: Users, color: 'bg-blue-100 text-blue-600' },
  players:        { label: 'Staff + Calciatori',    icon: User,  color: 'bg-green-100 text-green-600' },
  parent:         { label: 'Genitori',              icon: Users, color: 'bg-orange-100 text-orange-600' },
  players_parent: { label: 'Calciatori + Genitori', icon: Users, color: 'bg-purple-100 text-purple-600' },
}

const COLORI_PRESET = [
  '#1ab394','#1c84c6','#ed5565','#f8ac59',
  '#9b59b6','#27ae60','#e74c3c','#2c3e50',
]

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ExpiryBadge({ date }) {
  if (!date) return null
  const days = differenceInDays(new Date(date), new Date())
  if (days < 0)   return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-100 text-red-600"><AlertTriangle size={10}/> Scaduto</span>
  if (days <= 30) return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-600"><AlertTriangle size={10}/> {days}gg</span>
  return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-600">Valido</span>
}

// ── Modal Cartella ────────────────────────────────────────────
function FolderModal({ folder, parentFolder, onClose, onSaved, modulo }) {
  const { profile, club } = useAuth()
  const isEdit = !!folder?.id
  const [form, setForm] = useState({
    nome: '', descrizione: '', icona: '📁',
    colore: '#1ab394', permesso: parentFolder?.permesso || 'admin_only', ordine: 99,
    owner_can_upload: true,
    ...folder
  })
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.nome) return toast.error('Nome obbligatorio')
    setLoading(true)
    const payload = {
      ...form,
      club_id: club?.id || profile?.club_id,
      modulo,
      parent_id: form.parent_id ?? parentFolder?.id ?? null,
      // Eredita il collegamento personale dalla cartella padre, se presente
      linked_profile_id: form.linked_profile_id ?? parentFolder?.linked_profile_id ?? null,
      linked_youth_player_id: form.linked_youth_player_id ?? parentFolder?.linked_youth_player_id ?? null,
      created_by: profile?.id,
      updated_at: new Date().toISOString()
    }
    const { error } = isEdit
      ? await supabase.from('dms_folders').update(payload).eq('id', folder.id)
      : await supabase.from('dms_folders').insert([payload])
    if (error) toast.error(error.message)
    else { toast.success(isEdit ? 'Cartella aggiornata' : 'Cartella creata'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit ? 'Modifica cartella' : 'Nuova cartella'}</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          {parentFolder && (
            <div className="bg-gray-50 border border-[#e7eaec] rounded p-2 text-xs text-[#676a6c]">
              Dentro: <strong>{parentFolder.nome}</strong>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Nome *</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Descrizione</label>
            <input value={form.descrizione || ''} onChange={e => set('descrizione', e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Icona</label>
              <input value={form.icona} onChange={e => set('icona', e.target.value)} maxLength={2}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] text-center text-lg"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Ordine</label>
              <input type="number" value={form.ordine} onChange={e => set('ordine', +e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Colore</label>
            <div className="flex gap-2">
              {COLORI_PRESET.map(c => (
                <button key={c} onClick={() => set('colore', c)}
                  className={clsx('w-7 h-7 rounded-full border-2', form.colore === c ? 'border-[#2f4050]' : 'border-transparent')}
                  style={{ background: c }}/>
              ))}
            </div>
          </div>
          {!parentFolder?.linked_profile_id && !parentFolder?.linked_youth_player_id && (
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Visibilità</label>
              <select value={form.permesso} onChange={e => set('permesso', e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                {Object.entries(PERMESSI).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
          )}
          {(parentFolder?.linked_profile_id || parentFolder?.linked_youth_player_id) && (
            <div className="bg-teal-50 border border-teal-200 rounded p-2 space-y-2">
              <div className="text-xs text-teal-700">
                Cartella personale — sarà visibile solo al diretto interessato e alla società.
              </div>
              <label className="flex items-center gap-2 text-sm text-[#2f4050] cursor-pointer">
                <input type="checkbox" checked={form.owner_can_upload}
                  onChange={e => set('owner_can_upload', e.target.checked)}
                  className="w-4 h-4 accent-[#1ab394]"/>
                Il diretto interessato può caricare/modificare file qui
              </label>
              <p className="text-xs text-[#999]">
                {form.owner_can_upload
                  ? 'Cartella condivisa: sia tu che lui/lei potete caricare documenti.'
                  : 'Solo visualizzazione per lui/lei: vede e scarica, ma non può caricare né modificare. Solo la società può gestirla.'}
              </p>
            </div>
          )}
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

// ── Modal Carica Documento ────────────────────────────────────
function UploadModal({ folder, onClose, onSaved }) {
  const { profile, club, isAdmin } = useAuth()
  const isParent = profile?.role === 'parent'
  const fileRef = useRef()
  const [form, setForm] = useState({
    nome: '', descrizione: '', scadenza: '', tags: '',
    owner_id: folder?.linked_profile_id || profile?.id
  })
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function upload() {
    if (!file)      return toast.error('Seleziona un file')
    if (!form.nome) return toast.error('Inserisci un nome')
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `dms/${profile?.club_id || club?.id}/${folder.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('soccerclub').upload(path, file)
    if (upErr) { toast.error(upErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('soccerclub').getPublicUrl(path)
    const { error } = await supabase.from('dms_documents').insert([{
      club_id:     club?.id || profile?.club_id,
      folder_id:   folder.id,
      nome:        form.nome,
      descrizione: form.descrizione || null,
      file_url:    publicUrl,
      file_path:   path,
      file_size:   file.size,
      file_type:   file.type,
      scadenza:    form.scadenza || null,
      tags:        form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      owner_id:    form.owner_id || null,
      created_by:  profile?.id,
    }])
    if (error) { toast.error(error.message); setUploading(false); return }
    toast.success('Documento caricato!')
    onSaved()
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Carica documento</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <div onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); if (!form.nome) set('nome', f.name.replace(/\.[^.]+$/, '')) } }}
            className={clsx('border-2 border-dashed rounded p-6 text-center cursor-pointer transition-colors',
              dragging ? 'border-[#1ab394] bg-[#1ab394]/5' : 'border-[#e7eaec] hover:border-[#1ab394]/40')}>
            <Upload size={24} className="mx-auto text-[#999] mb-2"/>
            {file ? (
              <div className="text-sm text-[#2f4050] font-medium">{file.name} <span className="text-[#999]">({formatBytes(file.size)})</span></div>
            ) : (
              <p className="text-sm text-[#999]">Clicca o trascina un file qui</p>
            )}
            <input ref={fileRef} type="file" className="hidden"
              onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); if (!form.nome) set('nome', f.name.replace(/\.[^.]+$/, '')) } }}/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Nome documento *</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Scadenza (opzionale)</label>
            <input type="date" value={form.scadenza} onChange={e => set('scadenza', e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Tag (separati da virgola)</label>
            <input value={form.tags} onChange={e => set('tags', e.target.value)}
              placeholder="2024-25, stagione, contratto"
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={upload} disabled={uploading || !file}
            className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {uploading ? 'Caricamento...' : 'Carica'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principale DMS ─────────────────────────────────
export default function DMS({ modulo = 'ps' }) {
  const { profile, isAdmin, isMister, club } = useAuth()
  const isPlayer      = ['player_paid','player_volunteer'].includes(profile?.role)
  const isPlayerSC    = profile?.role === 'player_sc'
  const isParent      = profile?.role === 'parent'
  const isSegreteria  = profile?.role === 'segreteria'
  const canManage     = isAdmin

  const [path,         setPath]         = useState([])       // breadcrumb: array di cartelle
  const [children,     setChildren]     = useState([])       // sottocartelle del livello corrente
  const [documents,    setDocuments]    = useState([])
  const [myAnchorId,   setMyAnchorId]   = useState(null)      // id youth_player collegato (player_sc / parent)
  const [noPersonalFolder, setNoPersonalFolder] = useState(false)
  const [search,       setSearch]       = useState('')
  const [filterPerm,   setFilterPerm]   = useState('')
  const [folderModal,  setFolderModal]  = useState(null)      // {} nuova, oggetto = modifica
  const [uploadModal,  setUploadModal]  = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [docsLoading,  setDocsLoading]  = useState(false)

  const current = path[path.length - 1] || null

  useEffect(() => { init() }, [modulo, profile?.id])
  useEffect(() => { if (path.length || isAdmin || isSegreteria) loadLevel() }, [path, modulo])

  async function init() {
    if (!profile?.id) return
    if (isAdmin || isSegreteria) {
      setPath([])
      return
    }
    // Risolvi la cartella personale di partenza
    let query = supabase.from('dms_folders').select('*').eq('modulo', modulo)
    if (isMister || isPlayer) {
      query = query.eq('linked_profile_id', profile.id)
    } else if (isPlayerSC) {
      const { data: yp } = await supabase.from('youth_players').select('id').eq('user_id', profile.id).maybeSingle()
      if (!yp) { setNoPersonalFolder(true); setLoading(false); return }
      setMyAnchorId(yp.id)
      query = query.eq('linked_youth_player_id', yp.id)
    } else if (isParent) {
      const { data: parent } = await supabase.from('parents').select('youth_player_id').eq('user_id', profile.id).maybeSingle()
      if (!parent?.youth_player_id) { setNoPersonalFolder(true); setLoading(false); return }
      setMyAnchorId(parent.youth_player_id)
      query = query.eq('linked_youth_player_id', parent.youth_player_id)
    }
    const { data: mine } = await query.is('parent_id', mine_parent_filter()).maybeSingle().catch?.(() => ({ data: null })) || { data: null }
    // fallback semplice: prendi la cartella collegata indipendentemente dal parent_id
    const { data: anyMine } = await query.limit(1).maybeSingle()
    if (anyMine) setPath([anyMine])
    else setNoPersonalFolder(true)
    setLoading(false)
  }
  function mine_parent_filter() { return undefined }

  async function loadLevel() {
    setLoading(true)
    const parentId = current?.id ?? null
    let q = supabase.from('dms_folders').select('*')
      .eq('modulo', modulo).eq('club_id', club?.id || profile?.club_id)
      .order('ordine').order('nome')
    q = parentId ? q.eq('parent_id', parentId) : q.is('parent_id', null)
    const { data } = await q
    setChildren(data || [])
    if (current) loadDocuments(current.id)
    else setDocuments([])
    setLoading(false)
  }

  async function loadDocuments(folderId) {
    setDocsLoading(true)
    const { data } = await supabase.from('dms_documents')
      .select('*, uploader:profiles!dms_documents_created_by_fkey(nome,cognome), owner:profiles!dms_documents_owner_id_fkey(nome,cognome)')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false })
    setDocuments(data || [])
    setDocsLoading(false)
  }

  function openFolder(f)  { setPath(p => [...p, f]); setSearch('') }
  function goToCrumb(idx) { setPath(p => p.slice(0, idx + 1)); setSearch('') }
  function goToRoot()     { setPath([]); setSearch('') }

  async function deleteFolder(id) {
    if (!confirm('Eliminare la cartella, le sue sottocartelle e tutti i documenti?')) return
    const { data: docs } = await supabase.from('dms_documents').select('file_path').eq('folder_id', id)
    if (docs?.length) await supabase.storage.from('soccerclub').remove(docs.map(d => d.file_path))
    await supabase.from('dms_documents').delete().eq('folder_id', id)
    await supabase.from('dms_folders').delete().eq('id', id)
    toast.success('Cartella eliminata')
    loadLevel()
  }

  async function deleteDocument(doc) {
    if (!confirm('Eliminare questo documento?')) return
    await supabase.storage.from('soccerclub').remove([doc.file_path])
    await supabase.from('dms_documents').delete().eq('id', doc.id)
    toast.success('Documento eliminato')
    loadDocuments(current.id)
  }

  // Chi può caricare nella cartella corrente
  function canUpload(folder) {
    if (!folder) return false
    if (isAdmin || isSegreteria) return true
    if (folder.linked_profile_id && folder.linked_profile_id === profile.id) return folder.owner_can_upload !== false
    if (folder.linked_youth_player_id && folder.linked_youth_player_id === myAnchorId) return folder.owner_can_upload !== false
    if (isMister && folder.permesso === 'mister') return true
    if (isPlayer && ['players','players_parent'].includes(folder.permesso)) return true
    if (isParent && ['parent','players_parent'].includes(folder.permesso)) {
      const nomeLower = folder.nome.toLowerCase()
      return nomeLower.includes('medic') || nomeLower.includes('certificat')
    }
    return false
  }

  function canDeleteDoc(doc) {
    return isAdmin || isSegreteria || doc.created_by === profile?.id
  }

  const visibleChildren = children.filter(f => !filterPerm || f.permesso === filterPerm)

  const filteredDocs = documents.filter(d => {
    const q = search.toLowerCase()
    return !q
      || d.nome.toLowerCase().includes(q)
      || d.descrizione?.toLowerCase().includes(q)
      || d.tags?.some(t => t.toLowerCase().includes(q))
      || d.owner?.cognome?.toLowerCase().includes(q)
      || d.owner?.nome?.toLowerCase().includes(q)
  })

  const expiringDocs = documents.filter(d => {
    if (!d.scadenza) return false
    const days = differenceInDays(new Date(d.scadenza), new Date())
    return days >= 0 && days <= 30
  })
  const expiredDocs = documents.filter(d =>
    d.scadenza && differenceInDays(new Date(d.scadenza), new Date()) < 0
  )

  if (noPersonalFolder) {
    return (
      <div className="space-y-4">
        <div className="border-b border-[#e7eaec] pb-4">
          <h1 className="text-2xl font-bold text-[#2f4050]">Documenti</h1>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-12 text-center">
          <Folder size={40} className="mx-auto text-[#999] mb-3 opacity-50"/>
          <p className="text-[#999] text-sm">La tua cartella personale non è ancora stata creata.<br/>Contatta la società.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Documenti</h1>
          <p className="text-sm text-[#999] mt-1">
            {modulo === 'sc' ? 'Archivio documenti Scuola Calcio' : 'Archivio documenti Prima Squadra'}
          </p>
        </div>
        {canManage && (
          <button onClick={() => setFolderModal({})}
            className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
            <FolderPlus size={16}/> Nuova cartella {current ? 'qui' : ''}
          </button>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        {(isAdmin || isSegreteria) && (
          <>
            <button onClick={goToRoot} className={clsx('flex items-center gap-1', !current ? 'text-[#2f4050] font-semibold' : 'text-[#999] hover:text-[#1ab394]')}>
              <Home size={14}/> Documenti
            </button>
          </>
        )}
        {path.map((f, i) => (
          <span key={f.id} className="flex items-center gap-2">
            {(i > 0 || isAdmin || isSegreteria) && <ChevronRight size={14} className="text-[#999]"/>}
            <button onClick={() => goToCrumb(i)}
              className={clsx('flex items-center gap-1', i === path.length - 1 ? 'text-[#2f4050] font-semibold' : 'text-[#999] hover:text-[#1ab394]')}>
              <span>{f.icona}</span> {f.nome}
            </button>
          </span>
        ))}
      </div>

      {/* Filtro permesso — solo admin, solo a livello cartelle */}
      {(isAdmin) && visibleChildren.length > 0 && (
        <select value={filterPerm} onChange={e => setFilterPerm(e.target.value)}
          className="border border-[#e7eaec] rounded px-2 py-1.5 text-[#676a6c] text-xs outline-none focus:border-[#1ab394]">
          <option value="">Tutti i permessi</option>
          {Object.entries(PERMESSI).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      )}

      {/* Alert scadenze (solo se siamo dentro una cartella con documenti) */}
      {current && (expiredDocs.length > 0 || expiringDocs.length > 0) && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-700 text-sm">
          <AlertTriangle size={15}/>
          {expiredDocs.length > 0  && <span><strong>{expiredDocs.length}</strong> documento/i scaduto/i.</span>}
          {expiringDocs.length > 0 && <span><strong>{expiringDocs.length}</strong> in scadenza entro 30 giorni.</span>}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <>
          {/* ── Griglia sottocartelle ── */}
          {visibleChildren.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {visibleChildren.map(f => {
                const P = PERMESSI[f.permesso] || PERMESSI.admin_only
                const isPersonal = f.linked_profile_id || f.linked_youth_player_id
                return (
                  <div key={f.id} className="relative group">
                    <button onClick={() => openFolder(f)}
                      className="w-full bg-white border border-[#e7eaec] rounded shadow-sm p-5 text-left hover:shadow-md hover:border-[#1ab394]/40 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-3xl">{f.icona}</span>
                        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', isPersonal ? 'bg-teal-100 text-teal-600' : P.color)}>
                          {isPersonal ? 'Personale' : P.label}
                        </span>
                      </div>
                      <div className="font-semibold text-[#2f4050] text-sm mb-1">{f.nome}</div>
                      {f.descrizione && <div className="text-xs text-[#999] line-clamp-2">{f.descrizione}</div>}
                      <div className="flex items-center gap-1 mt-3 text-xs text-[#1ab394] opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Apri</span><ChevronRight size={12}/>
                      </div>
                    </button>
                    {canManage && !f.is_system && (
                      <div className="absolute right-2 top-2 hidden group-hover:flex gap-1">
                        <button onClick={() => setFolderModal(f)} className="p-1 text-[#999] hover:text-[#1c84c6] bg-white rounded shadow-sm"><Edit2 size={12}/></button>
                        <button onClick={() => deleteFolder(f.id)} className="p-1 text-[#999] hover:text-red-500 bg-white rounded shadow-sm"><Trash2 size={12}/></button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {visibleChildren.length === 0 && !current && (
            <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-16 text-center">
              <Folder size={48} className="mx-auto text-[#999] mb-4 opacity-50"/>
              <p className="text-[#999]">Nessuna cartella disponibile</p>
            </div>
          )}

          {/* ── Toolbar + documenti (solo se dentro una cartella) ── */}
          {current && (
            <div className="space-y-3">
              <div className="flex gap-2 items-center justify-between flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]"/>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Cerca documento, tag, calciatore..."
                    className="w-full border border-[#e7eaec] rounded pl-8 pr-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                </div>
                {canUpload(current) && (
                  <button onClick={() => setUploadModal(current)}
                    className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
                    <Upload size={15}/> Carica documento
                  </button>
                )}
              </div>

              {docsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-12 text-center">
                  <FileText size={36} className="mx-auto text-[#999] mb-3 opacity-50"/>
                  <p className="text-[#999] text-sm">
                    {search ? 'Nessun documento trovato.' : 'Nessun documento in questa cartella.'}
                  </p>
                  {canUpload(current) && !search && (
                    <button onClick={() => setUploadModal(current)}
                      className="mt-4 flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold mx-auto">
                      <Upload size={15}/> Carica il primo documento
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="border-b border-[#e7eaec] bg-gray-50">
                        {['Documento','Scadenza','Tag','Caricato da','Azioni'].map(h => (
                          <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocs.map(doc => {
                        const ext = doc.file_path?.split('.').pop()?.toLowerCase()
                        const icon = ext === 'pdf' ? '📄'
                          : ['jpg','jpeg','png'].includes(ext) ? '🖼️'
                          : ['doc','docx'].includes(ext) ? '📝'
                          : ['xls','xlsx'].includes(ext) ? '📊'
                          : '📎'
                        return (
                          <tr key={doc.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span>{icon}</span>
                                <div>
                                  <div className="text-[#2f4050] font-medium">{doc.nome}</div>
                                  {doc.descrizione && <div className="text-xs text-[#999]">{doc.descrizione}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3"><ExpiryBadge date={doc.scadenza}/></td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1 flex-wrap">
                                {doc.tags?.map(t => (
                                  <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-[#676a6c] rounded text-xs">{t}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[#999] text-xs">
                              {doc.uploader ? `${doc.uploader.nome} ${doc.uploader.cognome}` : '—'}
                              <div className="text-xs text-[#999] mt-0.5">
                                {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: it })}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <a href={doc.file_url} target="_blank" rel="noreferrer"
                                  className="text-[#999] hover:text-[#1ab394]" title="Apri/Scarica">
                                  <Download size={15}/>
                                </a>
                                {canDeleteDoc(doc) && (
                                  <button onClick={() => deleteDocument(doc)}
                                    className="text-[#999] hover:text-red-500" title="Elimina">
                                    <Trash2 size={15}/>
                                  </button>
                                )}
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
          )}
        </>
      )}

      {folderModal !== null && (
        <FolderModal folder={folderModal.id ? folderModal : null} parentFolder={current} modulo={modulo}
          onClose={() => setFolderModal(null)}
          onSaved={() => { setFolderModal(null); loadLevel() }}/>
      )}
      {uploadModal && (
        <UploadModal folder={uploadModal} onClose={() => setUploadModal(null)}
          onSaved={() => { setUploadModal(null); loadDocuments(current.id) }}/>
      )}
    </div>
  )
}

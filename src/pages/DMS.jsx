import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  Folder, FolderPlus, FileText, Upload, Trash2, Download,
  X, Edit2, Plus, AlertTriangle, Search, Tag, Calendar,
  ChevronRight, Home, Lock, Users, User
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

// ── Costanti ──────────────────────────────────────────────────
const PERMESSI = {
  admin_only: { label: 'Solo Admin',       icon: Lock,  color: 'bg-red-100 text-red-600' },
  mister:     { label: 'Admin + Mister',   icon: Users, color: 'bg-blue-100 text-blue-600' },
  players:    { label: 'Staff + Calciatori', icon: User, color: 'bg-green-100 text-green-600' },
}

const COLORI_PRESET = [
  '#1ab394','#1c84c6','#ed5565','#f8ac59',
  '#9b59b6','#27ae60','#e74c3c','#2c3e50',
]

// ── Helpers ───────────────────────────────────────────────────
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
function FolderModal({ folder, onClose, onSaved }) {
  const { profile, club } = useAuth()
  const isEdit = !!folder?.id
  const [form, setForm] = useState({
    nome: '', descrizione: '', icona: '📁',
    colore: '#1ab394', permesso: 'admin_only', ordine: 99,
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

  const ICONE = ['📁','📂','📄','📋','🪪','🏥','📝','⚽','🏆','💼','🔒','📊','🖊️','📌']

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit ? 'Modifica' : 'Nuova'} Cartella</h2>
          <button onClick={onClose}><X size={18} className="text-[#999]"/></button>
        </div>
        <div className="p-4 space-y-3">
          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Nome *</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
              placeholder="Es. Contratti Mister"
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Descrizione</label>
            <input value={form.descrizione || ''} onChange={e => set('descrizione', e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>

          {/* Icona */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Icona</label>
            <div className="flex flex-wrap gap-2">
              {ICONE.map(ic => (
                <button key={ic} onClick={() => set('icona', ic)}
                  className={clsx('w-9 h-9 text-xl rounded border-2 transition-colors',
                    form.icona === ic ? 'border-[#1ab394] bg-[#1ab394]/10' : 'border-[#e7eaec] hover:border-[#1ab394]/50')}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Colore */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Colore</label>
            <div className="flex gap-2 flex-wrap">
              {COLORI_PRESET.map(c => (
                <button key={c} onClick={() => set('colore', c)}
                  className={clsx('w-8 h-8 rounded-full border-2 transition-all',
                    form.colore === c ? 'border-gray-800 scale-110' : 'border-transparent')}
                  style={{ background: c }}/>
              ))}
            </div>
          </div>

          {/* Permesso */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Permessi accesso</label>
            <div className="space-y-2">
              {Object.entries(PERMESSI).map(([val, { label, icon: Icon, color }]) => (
                <label key={val} className="flex items-center gap-3 p-2 rounded border cursor-pointer transition-colors"
                  style={form.permesso === val ? { borderColor: '#1ab394', background: '#1ab39410' } : { borderColor: '#e7eaec' }}>
                  <input type="radio" checked={form.permesso === val}
                    onChange={() => set('permesso', val)} className="accent-[#1ab394]"/>
                  <div className={clsx('px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1', color)}>
                    <Icon size={11}/> {label}
                  </div>
                  <span className="text-xs text-[#999]">
                    {val === 'admin_only' && 'Solo la società può vedere e caricare'}
                    {val === 'mister' && 'Admin e mister possono vedere e caricare'}
                    {val === 'players' && 'Calciatori vedono solo i propri file'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Ordine */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Ordine visualizzazione</label>
            <input type="number" min="1" value={form.ordine}
              onChange={e => set('ordine', +e.target.value)}
              className="w-24 border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>

          {/* Anteprima */}
          <div className="rounded p-3 flex items-center gap-3 border"
            style={{ background: form.colore + '15', borderColor: form.colore + '40' }}>
            <span className="text-2xl">{form.icona}</span>
            <div>
              <div className="font-semibold text-sm" style={{ color: form.colore }}>{form.nome || 'Anteprima'}</div>
              {form.descrizione && <div className="text-xs text-[#999]">{form.descrizione}</div>}
            </div>
          </div>
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

// ── Modal Carica Documento ────────────────────────────────────
function UploadModal({ folder, onClose, onSaved }) {
  const { profile, club, isAdmin } = useAuth()
  const fileRef = useRef()
  const [form, setForm] = useState({
    nome: '', descrizione: '', scadenza: '', tags: '',
    owner_id: (folder.permesso === 'players' && !isAdmin) ? profile?.id : ''
  })
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [players, setPlayers] = useState([])
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // Se cartella players e admin, permette di scegliere il calciatore
  useEffect(() => {
    if (isAdmin && folder.permesso === 'players') {
      supabase.from('profiles').select('id,nome,cognome')
        .in('role', ['player_paid','player_volunteer']).eq('active', true).order('cognome')
        .then(({ data }) => setPlayers(data || []))
    }
  }, [])

  async function upload() {
    if (!file) return toast.error('Seleziona un file')
    if (!form.nome) return toast.error('Inserisci un nome')
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `dms/${profile?.club_id || club?.id}/${folder.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('soccerclub').upload(path, file)
    if (upErr) { toast.error(upErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('soccerclub').getPublicUrl(path)
    const { error } = await supabase.from('dms_documents').insert([{
      club_id: club?.id || profile?.club_id,
      folder_id: folder.id,
      nome: form.nome,
      descrizione: form.descrizione || null,
      file_url: publicUrl,
      file_path: path,
      file_size: file.size,
      file_type: file.type,
      scadenza: form.scadenza || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      owner_id: form.owner_id || null,
      created_by: profile?.id,
    }])

    if (error) { toast.error(error.message); setUploading(false); return }
    toast.success('Documento caricato!')
    onSaved()
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Carica in "{folder.nome}"</h2>
          <button onClick={onClose}><X size={18} className="text-[#999]"/></button>
        </div>
        <div className="p-4 space-y-3">
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault(); setDragging(false)
              const f = e.dataTransfer.files[0]
              if (f) { setFile(f); if (!form.nome) set('nome', f.name.replace(/\.[^.]+$/, '')) }
            }}
            className={clsx('border-2 border-dashed rounded p-6 text-center cursor-pointer transition-colors',
              dragging ? 'border-[#1ab394] bg-[#1ab394]/5' : 'border-[#e7eaec] hover:border-[#1ab394]/50')}>
            <Upload size={24} className="mx-auto text-[#999] mb-2"/>
            {file
              ? <div>
                  <p className="text-[#2f4050] font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-[#999] mt-0.5">{formatBytes(file.size)}</p>
                </div>
              : <p className="text-[#999] text-sm">Trascina un file o clicca<br/><span className="text-xs">PDF, JPG, PNG, DOCX, XLSX</span></p>}
          </div>
          <input ref={fileRef} type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={e => {
              const f = e.target.files[0]
              if (f) { setFile(f); if (!form.nome) set('nome', f.name.replace(/\.[^.]+$/, '')) }
            }}/>

          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Nome documento *</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Descrizione</label>
            <textarea value={form.descrizione} onChange={e => set('descrizione', e.target.value)}
              rows={2} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>

          {/* Assegna a calciatore (solo admin + cartella players) */}
          {isAdmin && folder.permesso === 'players' && (
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">
                Assegna a calciatore <span className="text-[#999] font-normal">(lascia vuoto = tutti)</span>
              </label>
              <select value={form.owner_id} onChange={e => set('owner_id', e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                <option value="">Tutti i calciatori</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
              </select>
            </div>
          )}

          {/* Scadenza */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">
              <Calendar size={12} className="inline mr-1"/>Scadenza documento
            </label>
            <input type="date" value={form.scadenza} onChange={e => set('scadenza', e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">
              <Tag size={12} className="inline mr-1"/>Tag <span className="font-normal">(separati da virgola)</span>
            </label>
            <input value={form.tags} onChange={e => set('tags', e.target.value)}
              placeholder="Es. 2024-25, stagione, contratto"
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
export default function DMS() {
  const { profile, isAdmin, isMister } = useAuth()
  const isPlayer = ['player_paid','player_volunteer'].includes(profile?.role)

  const [folders,       setFolders]       = useState([])
  const [activeFolder,  setActiveFolder]  = useState(null)
  const [documents,     setDocuments]     = useState([])
  const [search,        setSearch]        = useState('')
  const [folderModal,   setFolderModal]   = useState(null)
  const [uploadModal,   setUploadModal]   = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [docsLoading,   setDocsLoading]   = useState(false)

  useEffect(() => { loadFolders() }, [])
  useEffect(() => { if (activeFolder) loadDocuments(activeFolder.id) }, [activeFolder])

  async function loadFolders() {
    setLoading(true)
    const { data } = await supabase.from('dms_folders')
      .select('*').order('ordine').order('nome')
    setFolders(data || [])
    setLoading(false)
  }

  async function loadDocuments(folderId) {
    setDocsLoading(true)
    const { data } = await supabase.from('dms_documents')
      .select('*, profiles!dms_documents_created_by_fkey(nome,cognome), owner:profiles!dms_documents_owner_id_fkey(nome,cognome)')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false })
    setDocuments(data || [])
    setDocsLoading(false)
  }

  async function deleteFolder(id) {
    if (!confirm('Eliminare la cartella e tutti i suoi documenti?')) return
    // Elimina file da storage
    const { data: docs } = await supabase.from('dms_documents').select('file_path').eq('folder_id', id)
    if (docs?.length) {
      await supabase.storage.from('soccerclub').remove(docs.map(d => d.file_path))
    }
    await supabase.from('dms_documents').delete().eq('folder_id', id)
    await supabase.from('dms_folders').delete().eq('id', id)
    toast.success('Cartella eliminata')
    if (activeFolder?.id === id) setActiveFolder(null)
    loadFolders()
  }

  async function deleteDocument(doc) {
    if (!confirm('Eliminare questo documento?')) return
    await supabase.storage.from('soccerclub').remove([doc.file_path])
    await supabase.from('dms_documents').delete().eq('id', doc.id)
    toast.success('Documento eliminato')
    loadDocuments(activeFolder.id)
  }

  // Filtra documenti per search
  const filteredDocs = documents.filter(d => {
    const q = search.toLowerCase()
    return !q
      || d.nome.toLowerCase().includes(q)
      || d.descrizione?.toLowerCase().includes(q)
      || d.tags?.some(t => t.toLowerCase().includes(q))
      || d.owner?.cognome?.toLowerCase().includes(q)
      || d.owner?.nome?.toLowerCase().includes(q)
  })

  // Documenti in scadenza
  const expiringDocs = documents.filter(d => {
    if (!d.scadenza) return false
    const days = differenceInDays(new Date(d.scadenza), new Date())
    return days >= 0 && days <= 30
  })
  const expiredDocs = documents.filter(d => {
    if (!d.scadenza) return false
    return differenceInDays(new Date(d.scadenza), new Date()) < 0
  })

  const canUpload = (folder) => {
    if (!folder) return false
    if (isAdmin) return true
    if (isMister && folder.permesso === 'mister') return true
    if (isPlayer && folder.permesso === 'players') return true
    return false
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Documenti</h1>
          <p className="text-sm text-[#999] mt-1">Archivio documenti della società</p>
        </div>
        {isAdmin && (
          <button onClick={() => setFolderModal({})}
            className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
            <FolderPlus size={16}/> Nuova cartella
          </button>
        )}
      </div>

      <div className="flex gap-4 min-h-[600px]">
        {/* ── Sidebar cartelle ── */}
        <div className="w-64 flex-shrink-0 space-y-1">
          {/* Tutti i documenti */}
          <button
            onClick={() => setActiveFolder(null)}
            className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors',
              !activeFolder ? 'bg-[#1ab394] text-white' : 'text-[#676a6c] hover:bg-gray-100')}>
            <Home size={16}/>
            <span className="font-medium">Tutte le cartelle</span>
          </button>

          <div className="pt-1 pb-1">
            <div className="text-xs font-semibold text-[#999] uppercase tracking-wide px-3 mb-1">Cartelle</div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-20">
              <div className="w-5 h-5 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center text-[#999] text-xs py-6 px-3">
              {isAdmin ? 'Nessuna cartella. Creane una!' : 'Nessuna cartella disponibile.'}
            </div>
          ) : folders.map(f => {
            const P = PERMESSI[f.permesso]
            const isActive = activeFolder?.id === f.id
            return (
              <div key={f.id}
                className={clsx('group relative rounded transition-colors',
                  isActive ? 'bg-gray-100' : 'hover:bg-gray-50')}>
                <button
                  onClick={() => setActiveFolder(f)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
                  <span className="text-xl flex-shrink-0">{f.icona}</span>
                  <div className="flex-1 min-w-0">
                    <div className={clsx('text-sm font-medium truncate', isActive ? 'text-[#2f4050]' : 'text-[#676a6c]')}>
                      {f.nome}
                    </div>
                    <div className={clsx('text-xs px-1.5 py-0.5 rounded w-fit mt-0.5', P.color)}>
                      {P.label}
                    </div>
                  </div>
                </button>
                {/* Azioni admin */}
                {isAdmin && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1">
                    <button onClick={() => setFolderModal(f)}
                      className="p-1 text-[#999] hover:text-[#1c84c6] bg-white rounded shadow-sm">
                      <Edit2 size={12}/>
                    </button>
                    <button onClick={() => deleteFolder(f.id)}
                      className="p-1 text-[#999] hover:text-red-500 bg-white rounded shadow-sm">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Area documenti ── */}
        <div className="flex-1 min-w-0">
          {!activeFolder ? (
            /* Vista: tutte le cartelle */
            <div className="space-y-3">
              <div className="text-sm font-semibold text-[#2f4050]">
                {folders.length} cartell{folders.length === 1 ? 'a' : 'e'} disponibil{folders.length === 1 ? 'e' : 'i'}
              </div>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
                </div>
              ) : folders.length === 0 ? (
                <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-16 text-center">
                  <Folder size={48} className="mx-auto text-[#999] mb-4 opacity-50"/>
                  <p className="text-[#999]">Nessuna cartella disponibile</p>
                  {isAdmin && (
                    <button onClick={() => setFolderModal({})}
                      className="mt-4 flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold mx-auto">
                      <FolderPlus size={16}/> Crea la prima cartella
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {folders.map(f => {
                    const P = PERMESSI[f.permesso]
                    return (
                      <button key={f.id} onClick={() => setActiveFolder(f)}
                        className="bg-white border border-[#e7eaec] rounded shadow-sm p-5 text-left hover:shadow-md hover:border-[#1ab394]/40 transition-all group">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-3xl">{f.icona}</span>
                          <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', P.color)}>
                            {P.label}
                          </span>
                        </div>
                        <div className="font-semibold text-[#2f4050] text-sm mb-1">{f.nome}</div>
                        {f.descrizione && <div className="text-xs text-[#999] line-clamp-2">{f.descrizione}</div>}
                        <div className="flex items-center gap-1 mt-3 text-xs text-[#1ab394] opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Apri</span>
                          <ChevronRight size={12}/>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Vista: documenti nella cartella */
            <div className="space-y-3">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm">
                <button onClick={() => setActiveFolder(null)} className="text-[#999] hover:text-[#1ab394] flex items-center gap-1">
                  <Home size={14}/> Documenti
                </button>
                <ChevronRight size={14} className="text-[#999]"/>
                <span className="text-[#2f4050] font-semibold flex items-center gap-1">
                  {activeFolder.icona} {activeFolder.nome}
                </span>
              </div>

              {/* Alert scadenze */}
              {(expiredDocs.length > 0 || expiringDocs.length > 0) && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-700 text-sm">
                  <AlertTriangle size={15}/>
                  {expiredDocs.length > 0 && <span><strong>{expiredDocs.length}</strong> documento/i scaduto/i.</span>}
                  {expiringDocs.length > 0 && <span><strong>{expiringDocs.length}</strong> in scadenza entro 30 giorni.</span>}
                </div>
              )}

              {/* Toolbar */}
              <div className="flex gap-2 items-center justify-between flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]"/>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Cerca documento, tag, calciatore..."
                    className="w-full border border-[#e7eaec] rounded pl-8 pr-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
                </div>
                {canUpload(activeFolder) && (
                  <button onClick={() => setUploadModal(activeFolder)}
                    className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
                    <Upload size={15}/> Carica documento
                  </button>
                )}
              </div>

              {/* Lista documenti */}
              {docsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-12 text-center">
                  <FileText size={36} className="mx-auto text-[#999] mb-3 opacity-50"/>
                  <p className="text-[#999] text-sm">
                    {search ? 'Nessun documento trovato per la ricerca.' : 'Nessun documento in questa cartella.'}
                  </p>
                  {canUpload(activeFolder) && !search && (
                    <button onClick={() => setUploadModal(activeFolder)}
                      className="mt-4 flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold mx-auto">
                      <Upload size={15}/> Carica il primo documento
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e7eaec] bg-gray-50">
                        {['Documento','Tipo','Proprietario','Scadenza','Tag','Caricato da','Azioni'].map(h => (
                          <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocs.map(doc => {
                        const ext = doc.file_path?.split('.').pop()?.toLowerCase()
                        const icon = ext === 'pdf' ? '📄' : ['jpg','jpeg','png'].includes(ext) ? '🖼️' : ['doc','docx'].includes(ext) ? '📝' : ['xls','xlsx'].includes(ext) ? '📊' : '📁'
                        const canDel = isAdmin || doc.created_by === profile?.id
                        return (
                          <tr key={doc.id} className="border-b border-[#e7eaec] hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{icon}</span>
                                <div>
                                  <div className="text-[#2f4050] font-medium text-sm">{doc.nome}</div>
                                  {doc.descrizione && <div className="text-xs text-[#999] truncate max-w-xs">{doc.descrizione}</div>}
                                  {doc.file_size && <div className="text-xs text-[#999]">{formatBytes(doc.file_size)}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-[#999] uppercase font-mono">{ext || '—'}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#999]">
                              {doc.owner ? `${doc.owner.cognome} ${doc.owner.nome}` : <span className="text-[#999]">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {doc.scadenza && <span className="text-xs text-[#999]">{format(new Date(doc.scadenza), 'dd/MM/yyyy')}</span>}
                                <ExpiryBadge date={doc.scadenza}/>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {doc.tags?.map(t => (
                                  <span key={t} className="text-xs bg-gray-100 text-[#676a6c] px-1.5 py-0.5 rounded">{t}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#999]">
                              {doc.profiles ? `${doc.profiles.nome} ${doc.profiles.cognome}` : '—'}
                              <div className="text-xs text-[#999] mt-0.5">
                                {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: it })}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <a href={doc.file_url} target="_blank" rel="noreferrer"
                                  className="text-[#999] hover:text-[#1ab394]" title="Scarica/Apri">
                                  <Download size={15}/>
                                </a>
                                {canDel && (
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
        </div>
      </div>

      {/* Modali */}
      {folderModal !== null && (
        <FolderModal folder={folderModal} onClose={() => setFolderModal(null)}
          onSaved={() => { setFolderModal(null); loadFolders() }}/>
      )}
      {uploadModal && (
        <UploadModal folder={uploadModal} onClose={() => setUploadModal(null)}
          onSaved={() => { setUploadModal(null); loadDocuments(activeFolder.id) }}/>
      )}
    </div>
  )
}

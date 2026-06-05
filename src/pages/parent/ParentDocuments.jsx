import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { FileText, Upload, AlertTriangle, Download, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

const DOC_TYPES = {
  certificato_medico:  'Certificato medico',
  documento_identita:  'Documento identit\u00E0',
  modulo_iscrizione:   'Modulo iscrizione',
  liberatoria_privacy: 'Liberatoria privacy',
  altro:               'Altro',
}

function ExpiryBadge({ date }) {
  if (!date) return null
  const days = differenceInDays(new Date(date), new Date())
  if (days < 0)  return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-100 text-red-600"><AlertTriangle size={10}/> Scaduto</span>
  if (days <= 30) return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-600"><AlertTriangle size={10}/> {days}gg</span>
  return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-600">Valido</span>
}

export default function ParentDocuments() {
  const { profile } = useAuth()
  const [child, setChild] = useState(null)
  const [docs, setDocs] = useState([])
  const [tipo, setTipo] = useState('certificato_medico')
  const [scadenza, setScadenza] = useState('')
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileRef = useRef()

  useEffect(() => { load() }, [profile])

  async function load() {
    if (!profile?.id) return
    setLoading(true)
    const { data: parent } = await supabase.from('parents').select('*, youth_players(*)').eq('user_id', profile.id).single()
    if (!parent?.youth_players) { setLoading(false); return }
    setChild(parent.youth_players)
    const { data } = await supabase.from('youth_documents').select('*').eq('youth_player_id', parent.youth_players.id).order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  async function upload() {
    if (!file || !child) return toast.error('Seleziona un file')
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = 'youth_documents/' + child.id + '/' + Date.now() + '.' + ext
    const { error: upErr } = await supabase.storage.from('soccerclub').upload(path, file)
    if (upErr) { toast.error(upErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('soccerclub').getPublicUrl(path)
    const { error } = await supabase.from('youth_documents').insert([{ youth_player_id: child.id, tipo, scadenza: scadenza || null, file_url: publicUrl, file_path: path }])
    if (error) toast.error(error.message)
    else { toast.success('Documento caricato!'); setFile(null); setScadenza(''); load() }
    setUploading(false)
  }

  async function deleteDoc(doc) {
    if (!confirm('Eliminare questo documento?')) return
    await supabase.storage.from('soccerclub').remove([doc.file_path])
    await supabase.from('youth_documents').delete().eq('id', doc.id)
    toast.success('Eliminato'); load()
  }

  const expired = docs.filter(d => d.scadenza && differenceInDays(new Date(d.scadenza), new Date()) < 0).length
  const expiringSoon = docs.filter(d => { if (!d.scadenza) return false; const days = differenceInDays(new Date(d.scadenza), new Date()); return days >= 0 && days <= 30 }).length

  if (!loading && !child) return (
    <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
      <AlertTriangle size={32} className="mx-auto text-yellow-500 mb-2"/>
      <p className="text-yellow-700">Nessun atleta collegato. Contatta la segreteria.</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4">
        <h1 className="text-2xl font-bold text-[#2f4050]">Documenti</h1>
        <p className="text-sm text-[#999] mt-1">Certificati e documenti di {child?.nome} {child?.cognome}</p>
      </div>
      {expired > 0 && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded p-3 text-red-600 text-sm"><AlertTriangle size={16}/> <strong>{expired}</strong> documento/i scaduto/i</div>}
      {expiringSoon > 0 && <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-700 text-sm"><AlertTriangle size={16}/> <strong>{expiringSoon}</strong> documento/i in scadenza entro 30 giorni</div>}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide">Carica nuovo documento</h2>
        <div onClick={() => fileRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); setFile(e.dataTransfer.files[0]) }}
          className={clsx('border-2 border-dashed rounded p-6 text-center cursor-pointer transition-colors', dragging ? 'border-[#27ae60] bg-[#27ae60]/5' : 'border-[#e7eaec] hover:border-[#27ae60]/50')}>
          <Upload size={24} className="mx-auto text-[#999] mb-2"/>
          {file ? <p className="text-[#676a6c] text-sm font-medium">{file.name}</p> : <p className="text-[#999] text-sm">Trascina o clicca per selezionare<br/><span className="text-xs">PDF, JPG, PNG</span></p>}
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setFile(e.target.files[0])}/>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]">
              {Object.entries(DOC_TYPES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Scadenza</label>
            <input type="date" value={scadenza} onChange={e => setScadenza(e.target.value)} className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]"/>
          </div>
        </div>
        <button onClick={upload} disabled={uploading || !file} className="w-full bg-[#27ae60] hover:bg-[#229954] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
          {uploading ? 'Caricamento...' : 'Carica documento'}
        </button>
      </div>
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e7eaec]">
          <h2 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide">Documenti caricati ({docs.length})</h2>
        </div>
        {loading ? <div className="flex items-center justify-center h-24"><div className="w-6 h-6 border-2 border-[#27ae60] border-t-transparent rounded-full animate-spin"/></div>
        : docs.length === 0 ? <div className="text-center text-[#999] py-10 text-sm"><FileText size={32} className="mx-auto mb-2 opacity-30"/>Nessun documento</div>
        : <div className="divide-y divide-[#e7eaec]">
            {docs.map(d => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <div className="w-9 h-9 rounded-full bg-[#27ae60]/10 text-[#27ae60] flex items-center justify-center flex-shrink-0"><FileText size={18}/></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[#2f4050] font-medium text-sm">{DOC_TYPES[d.tipo] || d.tipo}</div>
                  <div className="text-xs text-[#999] mt-0.5">
                    {format(new Date(d.created_at), 'd MMM yyyy', { locale: it })}
                    {d.scadenza && ' · Scade il ' + format(new Date(d.scadenza), 'dd/MM/yyyy')}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {d.scadenza && <ExpiryBadge date={d.scadenza}/>}
                  <a href={d.file_url} target="_blank" rel="noreferrer" className="p-1.5 text-[#999] hover:text-[#27ae60]"><Download size={16}/></a>
                  <button onClick={() => deleteDoc(d)} className="p-1.5 text-[#999] hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>}
      </div>
    </div>
  )
}
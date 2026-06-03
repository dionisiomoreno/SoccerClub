import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { FileText, Upload, Trash2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

const TYPES = { medical_certificate: 'Certificato medico', sport_visit: 'Visita sportiva', other: 'Altro' }

function ExpiryBadge({ date }) {
  if (!date) return null
  const days = differenceInDays(new Date(date), new Date())
  if (days < 0) return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-100 text-red-600"><AlertTriangle size={11}/> Scaduto</span>
  if (days <= 30) return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-600"><AlertTriangle size={11}/> {days}gg</span>
  return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-600">Valido</span>
}

export default function Documents() {
  const { profile, isAdmin } = useAuth()
  const [docs, setDocs] = useState([])
  const [players, setPlayers] = useState([])
  const [filterPlayer, setFilterPlayer] = useState('')
  const [type, setType] = useState('medical_certificate')
  const [expiry, setExpiry] = useState('')
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileRef = useRef()

  useEffect(() => { load() }, [filterPlayer])
  useEffect(() => {
    if (isAdmin) supabase.from('profiles').select('id,nome,cognome').eq('active', true).order('cognome').then(({ data }) => setPlayers(data || []))
  }, [])

  async function load() {
    setLoading(true)
    let q = supabase.from('documents').select('*, profiles(nome,cognome)').order('created_at', { ascending: false })
    if (!isAdmin) q = q.eq('player_id', profile.id)
    else if (filterPlayer) q = q.eq('player_id', filterPlayer)
    const { data } = await q
    setDocs(data || [])
    setLoading(false)
  }

  async function upload() {
    if (!file) return toast.error('Seleziona un file')
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `documents/${profile.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('soccerclub').upload(path, file)
    if (upErr) { toast.error(upErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('soccerclub').getPublicUrl(path)
    const { error } = await supabase.from('documents').insert([{ player_id: profile.id, type, expiry_date: expiry || null, file_url: publicUrl, file_path: path }])
    if (error) toast.error(error.message)
    else { toast.success('Documento caricato'); setFile(null); setExpiry(''); load() }
    setUploading(false)
  }

  async function deleteDoc(doc) {
    if (!confirm('Eliminare questo documento?')) return
    await supabase.storage.from('soccerclub').remove([doc.file_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    toast.success('Eliminato')
    load()
  }

  const expiringSoon = docs.filter(d => d.expiry_date && differenceInDays(new Date(d.expiry_date), new Date()) <= 30 && differenceInDays(new Date(d.expiry_date), new Date()) >= 0).length

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4">
        <h1 className="text-2xl font-bold text-[#2f4050]">Documenti</h1>
        <p className="text-sm text-[#999] mt-1">Certificati medici e documenti ufficiali</p>
      </div>

      {isAdmin && expiringSoon > 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-700 text-sm">
          <AlertTriangle size={16}/> {expiringSoon} documento/i in scadenza entro 30 giorni
        </div>
      )}

      <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide">Carica documento</h2>
        <div
          onClick={() => fileRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); setFile(e.dataTransfer.files[0]) }}
          className={clsx('border-2 border-dashed rounded p-6 text-center cursor-pointer transition-colors',
            dragging ? 'border-[#1ab394] bg-[#1ab394]/5' : 'border-[#e7eaec] hover:border-[#1ab394]/50')}>
          <Upload size={24} className="mx-auto text-[#999] mb-2"/>
          {file ? <p className="text-[#676a6c] text-sm">{file.name}</p> : <p className="text-[#999] text-sm">Trascina un file o clicca per selezionare<br/><span className="text-xs">PDF, JPG, PNG</span></p>}
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setFile(e.target.files[0])}/>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Tipo</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              {Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Scadenza</label>
            <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
        </div>
        <button onClick={upload} disabled={uploading || !file} className="w-full bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
          {uploading ? 'Caricamento...' : 'Carica'}
        </button>
      </div>

      {isAdmin && (
        <select value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}
          className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none w-full focus:border-[#1ab394]">
          <option value="">Tutti i calciatori</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
        </select>
      )}

      <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-24"><div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/></div>
        ) : docs.length === 0 ? (
          <div className="text-center text-[#999] py-10 text-sm">Nessun documento</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e7eaec] bg-gray-50">
                {isAdmin && <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Calciatore</th>}
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Tipo</th>
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">File</th>
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Scadenza</th>
                <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Stato</th>
                <th className="px-4 py-3"/>
              </tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                  {isAdmin && <td className="px-4 py-3 text-[#2f4050] font-medium">{d.profiles?.cognome} {d.profiles?.nome}</td>}
                  <td className="px-4 py-3 text-[#676a6c]">{TYPES[d.type] || d.type}</td>
                  <td className="px-4 py-3">
                    <a href={d.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#1ab394] hover:underline text-xs">
                      <FileText size={13}/> Apri
                    </a>
                  </td>
                  <td className="px-4 py-3 text-[#999] text-xs">{d.expiry_date ? format(new Date(d.expiry_date), 'dd/MM/yyyy') : '-'}</td>
                  <td className="px-4 py-3"><ExpiryBadge date={d.expiry_date}/></td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteDoc(d)} className="text-[#999] hover:text-red-500"><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

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
  if (days < 0) return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400"><AlertTriangle size={11}/> Scaduto</span>
  if (days <= 30) return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400"><AlertTriangle size={11}/> {days}gg</span>
  return <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">Valido</span>
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
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Documenti</h1>

      {isAdmin && expiringSoon > 0 && (
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-400 text-sm">
          <AlertTriangle size={16}/> {expiringSoon} documento/i in scadenza entro 30 giorni
        </div>
      )}

      {/* Upload */}
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4 space-y-3">
        <h2 className="text-white font-semibold text-sm">Carica documento</h2>
        <div
          onClick={() => fileRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); setFile(e.dataTransfer.files[0]) }}
          className={clsx('border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
            dragging ? 'border-[#C00000] bg-[#C00000]/5' : 'border-[#2A2A2A] hover:border-[#C00000]/50')}>
          <Upload size={24} className="mx-auto text-[#6B7280] mb-2"/>
          {file ? <p className="text-white text-sm">{file.name}</p> : <p className="text-[#6B7280] text-sm">Trascina un file o clicca per selezionare<br/><span className="text-xs">PDF, JPG, PNG</span></p>}
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setFile(e.target.files[0])}/>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Tipo</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]">
              {Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Scadenza</label>
            <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"/>
          </div>
        </div>
        <button onClick={upload} disabled={uploading || !file} className="w-full bg-[#C00000] hover:bg-[#A00000] disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold">
          {uploading ? 'Caricamento...' : 'Carica'}
        </button>
      </div>

      {isAdmin && (
        <select value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}
          className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none w-full">
          <option value="">Tutti i calciatori</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
        </select>
      )}

      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-24"><div className="w-6 h-6 border-2 border-[#C00000] border-t-transparent rounded-full animate-spin"/></div>
        ) : docs.length === 0 ? (
          <div className="text-center text-[#6B7280] py-10 text-sm">Nessun documento</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                {isAdmin && <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Calciatore</th>}
                <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Tipo</th>
                <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">File</th>
                <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Scadenza</th>
                <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Stato</th>
                <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id} className="border-b border-[#2A2A2A] hover:bg-[#2A2A2A]/30">
                  {isAdmin && <td className="px-4 py-3 text-white">{d.profiles?.cognome} {d.profiles?.nome}</td>}
                  <td className="px-4 py-3 text-white">{TYPES[d.type] || d.type}</td>
                  <td className="px-4 py-3">
                    <a href={d.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#C00000] hover:underline text-xs">
                      <FileText size={13}/> Apri
                    </a>
                  </td>
                  <td className="px-4 py-3 text-[#6B7280] text-xs">{d.expiry_date ? format(new Date(d.expiry_date), 'dd/MM/yyyy') : '-'}</td>
                  <td className="px-4 py-3"><ExpiryBadge date={d.expiry_date}/></td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteDoc(d)} className="text-[#6B7280] hover:text-red-400"><Trash2 size={14}/></button>
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

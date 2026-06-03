import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

function SanctionModal({ onClose, onSaved }) {
  const [players, setPlayers] = useState([])
  const [form, setForm] = useState({ player_id: '', date: format(new Date(), 'yyyy-MM-dd'), amount: '', motivazione: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('id,nome,cognome').eq('active', true).order('cognome').then(({ data }) => setPlayers(data || []))
  }, [])

  async function save() {
    if (!form.player_id || !form.amount) return toast.error('Compila tutti i campi')
    setLoading(true)
    const { error } = await supabase.from('sanctions').insert([{ ...form, amount: +form.amount }])
    if (error) toast.error(error.message)
    else { toast.success('Sanzione aggiunta'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <h2 className="text-white font-semibold">Nuova Sanzione</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-white">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Calciatore</label>
            <select value={form.player_id} onChange={e => setForm(f => ({ ...f, player_id: e.target.value }))}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]">
              <option value="">Seleziona...</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Data</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"/>
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Importo (€)</label>
              <input type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000]"/>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] mb-1">Motivazione</label>
            <textarea value={form.motivazione} onChange={e => setForm(f => ({ ...f, motivazione: e.target.value }))} rows={3}
              className="w-full bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C00000] resize-none"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#2A2A2A]">
          <button onClick={onClose} className="flex-1 bg-[#2A2A2A] text-white py-2 rounded-lg text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#C00000] hover:bg-[#A00000] disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold">
            {loading ? 'Salvataggio...' : 'Aggiungi'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Sanctions() {
  const { isAdmin } = useAuth()
  const [sanctions, setSanctions] = useState([])
  const [players, setPlayers] = useState([])
  const [filterPlayer, setFilterPlayer] = useState('')
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [filterPlayer])

  async function load() {
    setLoading(true)
    let q = supabase.from('sanctions').select('*, profiles(id,nome,cognome)').order('date', { ascending: false })
    if (filterPlayer) q = q.eq('player_id', filterPlayer)
    const { data } = await q
    setSanctions(data || [])

    const { data: pl } = await supabase.from('profiles').select('id,nome,cognome').eq('active', true).order('cognome')
    setPlayers(pl || [])
    setLoading(false)
  }

  async function deleteSanction(id) {
    if (!confirm('Eliminare questa sanzione?')) return
    await supabase.from('sanctions').delete().eq('id', id)
    toast.success('Sanzione eliminata')
    load()
  }

  // Riepilogo per calciatore
  const byPlayer = sanctions.reduce((acc, s) => {
    const key = s.player_id
    if (!acc[key]) acc[key] = { nome: `${s.profiles?.cognome} ${s.profiles?.nome}`, total: 0 }
    acc[key].total += s.amount
    return acc
  }, {})

  const total = sanctions.reduce((s, a) => s + (a.amount || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Sanzioni</h1>
        {isAdmin && (
          <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-[#C00000] hover:bg-[#A00000] text-white px-3 py-2 rounded-lg text-sm font-semibold">
            <Plus size={16}/> Nuova
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
        <AlertTriangle size={16}/> Le sanzioni vengono detratte automaticamente dal cedolino
      </div>

      {Object.keys(byPlayer).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byPlayer).map(([id, { nome, total }]) => (
            <div key={id} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">
                {nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <span className="text-white text-sm">{nome}</span>
              <span className="text-red-400 font-bold text-sm">-€{total}</span>
            </div>
          ))}
        </div>
      )}

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
        ) : sanctions.length === 0 ? (
          <div className="text-center text-[#6B7280] py-10 text-sm">Nessuna sanzione</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Calciatore</th>
                <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Data</th>
                <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Motivazione</th>
                <th className="text-left text-xs text-[#6B7280] px-4 py-3 font-medium">Importo</th>
                {isAdmin && <th className="px-4 py-3"/>}
              </tr>
            </thead>
            <tbody>
              {sanctions.map(s => (
                <tr key={s.id} className="border-b border-[#2A2A2A] hover:bg-[#2A2A2A]/30">
                  <td className="px-4 py-3 text-white">{s.profiles?.cognome} {s.profiles?.nome}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{format(new Date(s.date), 'dd MMM yyyy', { locale: it })}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{s.motivazione || '-'}</td>
                  <td className="px-4 py-3 text-red-400 font-medium">-€{s.amount}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <button onClick={() => deleteSanction(s.id)} className="text-[#6B7280] hover:text-red-400"><Trash2 size={14}/></button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="bg-[#2A2A2A]/30">
                <td colSpan={3} className="px-4 py-3 text-[#6B7280] text-xs font-medium">Totale</td>
                <td className="px-4 py-3 text-red-400 font-bold">-€{total}</td>
                {isAdmin && <td/>}
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {modal && <SanctionModal onClose={() => setModal(false)} onSaved={() => { setModal(false); load() }}/>}
    </div>
  )
}

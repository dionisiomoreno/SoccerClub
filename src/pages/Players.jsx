import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { UserPlus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, Download, Eye, X } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const ROLES = ['admin','mister','player_paid','player_volunteer']
const ROLE_LABELS = { admin:'Admin', mister:'Mister', player_paid:'Calciatore', player_volunteer:'Volontario' }
const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-600',
  mister: 'bg-blue-100 text-blue-600',
  player_paid: 'bg-green-100 text-green-600',
  player_volunteer: 'bg-yellow-100 text-yellow-600'
}
const TAGLIE = ['XS','S','M','L','XL','XXL']

// ── Modal aggiunta/modifica ──────────────────────────────────
function PlayerModal({ player, onClose, onSaved }) {
  const isEdit = !!player?.id
  const [form, setForm] = useState({
    nome: '', cognome: '', email: '', telefono: '', data_nascita: '',
    codice_fiscale: '', numero_patente: '', taglia: 'M', role: 'player_paid', active: true,
    ...player
  })
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    setLoading(true)
    const { error } = isEdit
      ? await supabase.from('profiles').update({ ...form }).eq('id', form.id)
      : await supabase.from('profiles').insert([{ ...form }])
    if (error) toast.error(error.message)
    else { toast.success(isEdit ? 'Aggiornato' : 'Aggiunto'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit ? 'Modifica' : 'Nuovo'} Calciatore</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          {[['nome','Nome'],['cognome','Cognome'],['telefono','Telefono'],['data_nascita','Data nascita','date'],['codice_fiscale','Codice fiscale'],['numero_patente','N° patente']].map(([k,l,t='text']) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">{l}</label>
              <input type={t} value={form[k]||''} onChange={e=>set(k,e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Email</label>
            <input type="email" value={form.email||''} onChange={e=>set('email',e.target.value)} disabled={isEdit}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] disabled:opacity-50 disabled:bg-gray-50"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Taglia</label>
            <select value={form.taglia} onChange={e=>set('taglia',e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              {TAGLIE.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Ruolo</label>
            <select value={form.role} onChange={e=>set('role',e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              {ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e=>set('active',e.target.checked)} className="accent-[#1ab394]"/>
            <span className="text-sm text-[#676a6c]">Attivo</span>
          </label>
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

// ── Scheda dettagliata calciatore ────────────────────────────
function PlayerDetailModal({ player, onClose }) {
  const [stats, setStats] = useState(null)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const [att, san, pay] = await Promise.all([
      supabase.from('attendances').select('type, amount').eq('player_id', player.id),
      supabase.from('sanctions').select('amount').eq('player_id', player.id),
      supabase.from('payslips').select('netto, month, year').eq('player_id', player.id).order('year', { ascending: false }).order('month', { ascending: false }).limit(1)
    ])
    const trainings = (att.data || []).filter(a => a.type === 'training').length
    const matches = (att.data || []).filter(a => a.type === 'match').length
    const totalAtt = trainings + matches
    const lordo = (att.data || []).reduce((s, a) => s + (a.amount || 0), 0)
    const sanzioni = (san.data || []).reduce((s, a) => s + (a.amount || 0), 0)
    setStats({ trainings, matches, totalAtt, lordo, sanzioni, netto: lordo - sanzioni, lastPayslip: pay.data?.[0] })
  }

  const initials = `${player.nome?.[0]||''}${player.cognome?.[0]||''}`.toUpperCase()

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Scheda Calciatore</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#1ab394]/20 text-[#1ab394] flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {initials}
            </div>
            <div>
              <div className="text-[#2f4050] font-bold text-lg">{player.nome} {player.cognome}</div>
              <div className="text-[#999] text-sm">{player.email}</div>
              <span className={clsx('mt-1 inline-block px-2 py-0.5 rounded text-xs font-medium', ROLE_COLORS[player.role])}>
                {ROLE_LABELS[player.role]}
              </span>
            </div>
          </div>

          {/* Dati anagrafici */}
          <div className="bg-gray-50 rounded p-4 space-y-2">
            <h3 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Dati anagrafici</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Telefono', player.telefono],
                ['Data nascita', player.data_nascita],
                ['Codice fiscale', player.codice_fiscale],
                ['N° patente', player.numero_patente],
                ['Taglia', player.taglia],
                ['Stato', player.active ? '✅ Attivo' : '❌ Non attivo']
              ].map(([l, v]) => (
                <div key={l}>
                  <div className="text-[#999] text-xs">{l}</div>
                  <div className="text-[#2f4050] font-medium">{v || '—'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistiche */}
          {!stats ? (
            <div className="flex items-center justify-center h-16"><div className="w-5 h-5 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/></div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#999] uppercase tracking-wide">Statistiche</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded p-3 text-center">
                  <div className="text-xl font-bold text-blue-600">{stats.trainings}</div>
                  <div className="text-xs text-[#999] mt-1">Allenamenti</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-100 rounded p-3 text-center">
                  <div className="text-xl font-bold text-yellow-600">{stats.matches}</div>
                  <div className="text-xs text-[#999] mt-1">Partite</div>
                </div>
                <div className="bg-green-50 border border-green-100 rounded p-3 text-center">
                  <div className="text-xl font-bold text-green-600">{stats.totalAtt}</div>
                  <div className="text-xs text-[#999] mt-1">Totale</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 border border-[#e7eaec] rounded p-3 text-center">
                  <div className="text-xl font-bold text-[#2f4050]">€{stats.lordo}</div>
                  <div className="text-xs text-[#999] mt-1">Lordo</div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded p-3 text-center">
                  <div className="text-xl font-bold text-red-500">-€{stats.sanzioni}</div>
                  <div className="text-xs text-[#999] mt-1">Sanzioni</div>
                </div>
                <div className="bg-green-50 border border-green-100 rounded p-3 text-center">
                  <div className="text-xl font-bold text-green-600">€{stats.netto}</div>
                  <div className="text-xs text-[#999] mt-1">Netto</div>
                </div>
              </div>
              {stats.lastPayslip && (
                <div className="bg-[#1ab394]/5 border border-[#1ab394]/20 rounded p-3 text-sm text-[#676a6c]">
                  Ultimo cedolino: <strong>€{stats.lastPayslip.netto}</strong> — {['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][stats.lastPayslip.month-1]} {stats.lastPayslip.year}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Esporta PDF rosa ─────────────────────────────────────────
function exportPDF(players) {
  const doc = new jsPDF()
  doc.setFillColor(26, 179, 148)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Lista Calciatori Tesserati', 14, 13)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`ASD Castelmauro Calcio 1986 — Generata il ${new Date().toLocaleDateString('it-IT')}`, 14, 22)

  autoTable(doc, {
    startY: 35,
    head: [['#', 'Cognome e Nome', 'Email', 'Ruolo', 'Taglia', 'Stato']],
    body: players.map((p, i) => [
      i + 1,
      `${p.cognome} ${p.nome}`,
      p.email,
      ROLE_LABELS[p.role] || p.role,
      p.taglia || '—',
      p.active ? 'Attivo' : 'Non attivo'
    ]),
    headStyles: { fillColor: [26, 179, 148], fontSize: 9 },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 8 }, 2: { cellWidth: 55 } }
  })

  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text(`Totale: ${players.length} calciatori`, 14, doc.lastAutoTable.finalY + 8)
  doc.save('rosa_calciatori.pdf')
  toast.success('PDF esportato!')
}

// ── Pagina principale ────────────────────────────────────────
export default function Players() {
  const [players, setPlayers] = useState([])
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterActive, setFilterActive] = useState('1')
  const [modal, setModal] = useState(null)
  const [detailPlayer, setDetailPlayer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('cognome')
    setPlayers(data || [])
    setLoading(false)
  }

  async function toggleActive(p) {
    await supabase.from('profiles').update({ active: !p.active }).eq('id', p.id)
    load()
  }

  async function deletePlayer(p) {
    if (!confirm(`Eliminare ${p.nome} ${p.cognome}?`)) return
    await supabase.from('profiles').delete().eq('id', p.id)
    toast.success('Eliminato')
    load()
  }

  const filtered = players.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${p.nome} ${p.cognome} ${p.email}`.toLowerCase().includes(q)
    const matchRole = !filterRole || p.role === filterRole
    const matchActive = filterActive === '' || (filterActive === '1' ? p.active : !p.active)
    return matchSearch && matchRole && matchActive
  })

  const paid = filtered.filter(p => p.role === 'player_paid').length
  const volunteers = filtered.filter(p => p.role === 'player_volunteer').length
  const active = filtered.filter(p => p.active).length

  return (
    <div className="space-y-4">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Calciatori</h1>
          <p className="text-sm text-[#999] mt-1">Gestione rosa della squadra</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportPDF(filtered)}
            className="flex items-center gap-2 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-3 py-2 rounded text-sm">
            <Download size={15}/> PDF
          </button>
          <button onClick={() => setModal({})}
            className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
            <UserPlus size={16}/> Nuovo
          </button>
        </div>
      </div>

      {/* KPI veloci */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-[#1ab394]">{active}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Attivi</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-green-600">{paid}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Con rimborso</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-yellow-600">{volunteers}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide">Volontari</div>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca calciatore..."
            className="w-full border border-[#e7eaec] rounded pl-8 pr-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
        </div>
        <select value={filterRole} onChange={e=>setFilterRole(e.target.value)}
          className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
          <option value="">Tutti i ruoli</option>
          {ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={filterActive} onChange={e=>setFilterActive(e.target.value)}
          className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
          <option value="">Tutti</option>
          <option value="1">Attivi</option>
          <option value="0">Non attivi</option>
        </select>
      </div>

      <div className="text-xs text-[#999]">{filtered.length} calciatori trovati</div>

      {/* Tabella */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/></div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-[#999] py-12 text-sm">Nessun calciatore trovato</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e7eaec] bg-gray-50">
                  {['Calciatore','Email','Telefono','Ruolo','Taglia','Stato','Azioni'].map(h=>(
                    <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-[#e7eaec] hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1ab394]/20 text-[#1ab394] flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {(p.nome?.[0]||'')+(p.cognome?.[0]||'')}
                        </div>
                        <span className="text-[#2f4050] font-medium">{p.cognome} {p.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#999]">{p.email}</td>
                    <td className="px-4 py-3 text-[#999]">{p.telefono||'—'}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', ROLE_COLORS[p.role])}>
                        {ROLE_LABELS[p.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#999]">{p.taglia||'—'}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', p.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500')}>
                        {p.active ? 'Attivo' : 'Non attivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={()=>setDetailPlayer(p)} className="text-[#999] hover:text-[#1c84c6] transition-colors" title="Scheda"><Eye size={15}/></button>
                        <button onClick={()=>toggleActive(p)} className="text-[#999] hover:text-[#1ab394] transition-colors" title="Attiva/Disattiva">
                          {p.active ? <ToggleRight size={18} className="text-[#1ab394]"/> : <ToggleLeft size={18}/>}
                        </button>
                        <button onClick={()=>setModal(p)} className="text-[#999] hover:text-[#1c84c6] transition-colors" title="Modifica"><Edit2 size={15}/></button>
                        <button onClick={()=>deletePlayer(p)} className="text-[#999] hover:text-red-500 transition-colors" title="Elimina"><Trash2 size={15}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && <PlayerModal player={modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}}/>}
      {detailPlayer && <PlayerDetailModal player={detailPlayer} onClose={()=>setDetailPlayer(null)}/>}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Package, Plus, Edit2, Trash2, Download, AlertTriangle, ArrowDown, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const STATUS_LABELS = { pending: 'In attesa', approved: 'Approvata', delivered: 'Consegnata', rejected: 'Rifiutata' }
const STATUS_COLORS = {
  pending:  'bg-yellow-100 text-yellow-600',
  approved: 'bg-green-100 text-green-600',
  delivered:'bg-blue-100 text-blue-600',
  rejected: 'bg-red-100 text-red-600'
}

// ── PDF ordine fornitore ──────────────────────────────────────
function generateOrdinePDF(request, teamSettings) {
  const doc = new jsPDF()
  doc.setFillColor(26,179,148); doc.rect(0,0,210,28,'F')
  doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text(teamSettings?.nome_squadra || 'SoccerClub', 14, 13)
  doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.text('Ordine Fornitore — Materiale Struttura', 14, 22)
  doc.setTextColor(0,0,0); doc.setFontSize(10)
  doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 38)
  doc.text(`Richiedente: ${request.profiles?.cognome} ${request.profiles?.nome}`, 14, 46)
  autoTable(doc, {
    startY: 56,
    head: [['Articolo', 'Quantità', 'Note']],
    body: [[
      request.sc_structure_materials?.nome || '—',
      request.quantita,
      request.note || '—'
    ]],
    headStyles: { fillColor: [26,179,148] },
    styles: { fontSize: 10 }
  })
  doc.setFontSize(9); doc.setTextColor(150)
  doc.text('Firma responsabile: ______________________', 14, doc.lastAutoTable.finalY + 20)
  doc.save(`ordine_${request.sc_structure_materials?.nome || 'materiale'}_${format(new Date(),'ddMMyyyy')}.pdf`)
}

// ── Modal nuovo materiale (admin) ─────────────────────────────
function MaterialModal({ material, onClose, onSaved }) {
  const isEdit = !!material?.id
  const [form, setForm] = useState({ nome: '', quantita: 0, descrizione: '', richiedibile_giocatori: true, ...material })
  const [loading, setLoading] = useState(false)
  async function save() {
    setLoading(true)
    const { error } = isEdit
      ? await supabase.from('materials').update(form).eq('id', form.id)
      : await supabase.from('materials').insert([form])
    if (error) toast.error(error.message)
    else { toast.success('Salvato'); onSaved() }
    setLoading(false)
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit ? 'Modifica' : 'Nuovo'} Materiale</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]">✕</button>
        </div>
        <div className="p-4 space-y-3">
          {[['nome','Nome'],['descrizione','Descrizione']].map(([k,l]) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">{l}</label>
              <input value={form[k]||''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Quantità</label>
            <input type="number" min="0" value={form.quantita} onChange={e => setForm(f => ({ ...f, quantita: +e.target.value }))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input type="checkbox" checked={form.richiedibile_giocatori}
              onChange={e => setForm(f => ({ ...f, richiedibile_giocatori: e.target.checked }))}
              className="accent-[#1ab394]"/>
            <span className="text-sm text-[#676a6c]">Richiedibile da calciatori/volontari</span>
          </label>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">Salva</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal richiesta materiale ─────────────────────────────────
function RequestModal({ materials, structureMaterials, initialMaterialId, onClose, onSaved }) {
  const { profile } = useAuth()
  const isMister = profile?.role === 'mister'
  const isPlayer = profile?.role === 'player_paid' || profile?.role === 'player_volunteer'
  // Calciatori, volontari e mister vedono in elenco solo gli articoli abilitati dalla società
  const visibleMaterials = (isPlayer || isMister) ? materials.filter(m => m.richiedibile_giocatori) : materials

  const [tipo, setTipo] = useState('abbigliamento')
  const [form, setForm] = useState({ material_id: initialMaterialId || '', structure_material_id: '', quantita: 1, note: '' })
  const [loading, setLoading] = useState(false)

  async function save() {
    if (tipo === 'abbigliamento' && !form.material_id) return toast.error('Seleziona un materiale')
    if (tipo === 'struttura' && !form.structure_material_id) return toast.error('Seleziona un articolo')
    setLoading(true)
    const { error } = await supabase.from('material_requests').insert([{
      player_id:             profile?.id,
      club_id:               profile?.club_id,
      tipo,
      material_id:           tipo === 'abbigliamento' ? form.material_id : null,
      structure_material_id: tipo === 'struttura' ? form.structure_material_id : null,
      quantita:              form.quantita,
      note:                  form.note,
      richiedente_role:      profile?.role,
      status:                'pending',
    }])
    if (error) toast.error(error.message)
    else { toast.success('Richiesta inviata'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Richiedi Materiale</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]">✕</button>
        </div>
        <div className="p-4 space-y-3">
          {/* Tipo — i mister vedono entrambi, i calciatori solo abbigliamento */}
          {isMister && (
            <div className="flex gap-2">
              {[['abbigliamento','👕 Abbigliamento'],['struttura','⚽ Struttura']].map(([v,l]) => (
                <button key={v} onClick={() => setTipo(v)}
                  className={clsx('flex-1 py-2 rounded text-sm font-semibold border transition-colors',
                    tipo === v ? 'bg-[#1ab394] border-[#1ab394] text-white' : 'border-[#e7eaec] text-[#999] hover:bg-gray-50')}>
                  {l}
                </button>
              ))}
            </div>
          )}

          {tipo === 'abbigliamento' && (
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Articolo</label>
              <select value={form.material_id} onChange={e => setForm(f => ({ ...f, material_id: e.target.value }))}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                <option value="">Seleziona...</option>
                {visibleMaterials.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
              {isPlayer && visibleMaterials.length === 0 && (
                <p className="text-xs text-[#999] mt-1">Nessun articolo al momento richiedibile.</p>
              )}
            </div>
          )}

          {tipo === 'struttura' && (
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Articolo struttura</label>
              <select value={form.structure_material_id} onChange={e => setForm(f => ({ ...f, structure_material_id: e.target.value }))}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
                <option value="">Seleziona...</option>
                {structureMaterials.map(m => <option key={m.id} value={m.id}>{m.nome} (disp. {m.quantita_disponibile})</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Quantità</label>
            <input type="number" min="1" value={form.quantita} onChange={e => setForm(f => ({ ...f, quantita: +e.target.value }))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Note</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">Invia</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal scarico manuale (mister) ────────────────────────────
function ScaricoModal({ structureMaterials, onClose, onSaved }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ item_id: '', quantita: 1, motivo: '' })
  const [loading, setLoading] = useState(false)

  async function save() {
    if (!form.item_id) return toast.error('Seleziona un articolo')
    if (!form.motivo) return toast.error('Inserisci il motivo')
    setLoading(true)
    // Registra lo scarico
    const { error } = await supabase.from('material_scarichi').insert([{
      club_id:      profile?.club_id,
      item_id:      form.item_id,
      quantita:     form.quantita,
      motivo:       form.motivo,
      operatore_id: profile?.id,
    }])
    if (error) { toast.error(error.message); setLoading(false); return }
    // Scala la giacenza
    const mat = structureMaterials.find(m => m.id === form.item_id)
    if (mat) {
      const nuova = Math.max(0, mat.quantita_disponibile - form.quantita)
      await supabase.from('sc_structure_materials').update({ quantita_disponibile: nuova }).eq('id', form.item_id)
    }
    toast.success('Scarico registrato')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Scarico Materiale</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-700">
            ⚠️ Lo scarico verrà registrato e comunicato alla società.
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Articolo</label>
            <select value={form.item_id} onChange={e => setForm(f => ({ ...f, item_id: e.target.value }))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]">
              <option value="">Seleziona...</option>
              {structureMaterials.map(m => <option key={m.id} value={m.id}>{m.nome} (disp. {m.quantita_disponibile})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Quantità da scaricare</label>
            <input type="number" min="1" value={form.quantita} onChange={e => setForm(f => ({ ...f, quantita: +e.target.value }))}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Motivo *</label>
            <textarea value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} rows={2}
              placeholder="Es. Pallone danneggiato, cono rotto..."
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] resize-none"/>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">Registra scarico</button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────
export default function Materials() {
  const { profile, isAdmin, isMister } = useAuth()
  const isPlayer = profile?.role === 'player_paid' || profile?.role === 'player_volunteer'
  const isCatalogRole = isPlayer || isMister // mister vede l'abbigliamento come i giocatori, senza giacenza

  const [tab, setTab]                         = useState('inventory')
  const [materials, setMaterials]             = useState([])
  const [structureMaterials, setStructureMaterials] = useState([])
  const [requests, setRequests]               = useState([])
  const [scarichi, setScarichi]               = useState([])
  const [teamSettings, setTeamSettings]       = useState(null)
  const [modal, setModal]                     = useState(null)
  const [reqModal, setReqModal]               = useState(false)
  const [reqPreset, setReqPreset]             = useState(null) // material_id preselezionato dal catalogo
  const [scaricoModal, setScaricoModal]       = useState(false)
  const [loading, setLoading]                 = useState(true)

  useEffect(() => {
    supabase.from('team_settings').select('*').single().then(({ data }) => setTeamSettings(data))
  }, [])

  useEffect(() => { load() }, [tab])

  async function load() {
    setLoading(true)
    if (tab === 'inventory') {
      const [{ data: mat }, { data: strMat }] = await Promise.all([
        supabase.from('materials').select('*').order('nome'),
        supabase.from('sc_structure_materials').select('*').eq('active', true).order('nome'),
      ])
      setMaterials(mat || [])
      setStructureMaterials(strMat || [])
    } else if (tab === 'requests') {
      let q = supabase.from('material_requests')
        .select('*, materials(nome), sc_structure_materials(nome), profiles!material_requests_player_id_fkey(nome,cognome,role)')
        .order('created_at', { ascending: false })
      if (!isAdmin && !isMister) q = q.eq('player_id', profile.id)
      const { data } = await q
      setRequests(data || [])
    } else if (tab === 'scarichi') {
      const { data } = await supabase.from('material_scarichi')
        .select('*, sc_structure_materials(nome), profiles!material_scarichi_operatore_id_fkey(nome,cognome)')
        .order('created_at', { ascending: false })
      setScarichi(data || [])
    }
    setLoading(false)
  }

  async function updateStatus(id, status, request) {
    // Se consegnata e tipo struttura → aumenta giacenza
    if (status === 'delivered' && request.tipo === 'struttura' && request.structure_material_id) {
      const mat = structureMaterials.find(m => m.id === request.structure_material_id)
      if (mat) {
        const nuova = mat.quantita_disponibile + (request.quantita || 1)
        await supabase.from('sc_structure_materials').update({ quantita_disponibile: nuova }).eq('id', request.structure_material_id)
      } else {
        // ricarica se non in cache
        const { data: m } = await supabase.from('sc_structure_materials').select('quantita_disponibile').eq('id', request.structure_material_id).single()
        if (m) {
          await supabase.from('sc_structure_materials').update({ quantita_disponibile: m.quantita_disponibile + (request.quantita || 1) }).eq('id', request.structure_material_id)
        }
      }
    }
 await supabase.from('material_requests').update({ status }).eq('id', id)
    await supabase.from('notifications').insert([{
      user_id: request.player_id,
      club_id: profile?.club_id,
      type:    status === 'approved' ? 'request_approved' : 'request_rejected',
      message: `Richiesta "${request.materials?.nome || request.sc_structure_materials?.nome}" ${STATUS_LABELS[status].toLowerCase()}`,
      read:    false
    }])
    toast.success('Stato aggiornato')
    load()
  }

  async function deleteMaterial(id) {
    if (!confirm('Eliminare questo materiale?')) return
    await supabase.from('materials').delete().eq('id', id)
    toast.success('Eliminato')
    load()
  }

  function openRequest(materialId = null) {
    setReqPreset(materialId)
    setReqModal(true)
  }

  // Articoli effettivamente visibili nel catalogo per calciatori/volontari/mister
  const playerVisibleMaterials = materials.filter(m => m.richiedibile_giocatori)
  const displayedMaterials = isCatalogRole ? playerVisibleMaterials : materials

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Materiale</h1>
          <p className="text-sm text-[#999] mt-1">
            {isPlayer ? 'Catalogo abbigliamento e richieste' : 'Inventario, richieste e scarichi'}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Scarico — solo mister */}
          {isMister && (
            <button onClick={() => setScaricoModal(true)}
              className="flex items-center gap-1 border border-red-200 hover:bg-red-50 text-red-500 px-3 py-2 rounded text-sm">
              <ArrowDown size={14}/> Scarico
            </button>
          )}
          {/* Richiesta — tutti tranne admin */}
          {!isAdmin && (
            <button onClick={() => openRequest()}
              className="border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-4 py-2 rounded text-sm">
              Richiedi
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setModal({})}
              className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
              <Plus size={16}/> Nuovo
            </button>
          )}
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-1 border-b border-[#e7eaec]">
        {[
          ['inventory', isPlayer ? 'Catalogo' : 'Inventario'],
          ['requests',  'Richieste'],
          ...(isAdmin ? [['scarichi', 'Scarichi']] : []),
        ].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={clsx('px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === v ? 'border-[#1ab394] text-[#1ab394]' : 'border-transparent text-[#999] hover:text-[#676a6c]')}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : tab === 'inventory' ? (
        <div className="space-y-6">
          {/* Abbigliamento */}
          <div>
            <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">👕 Abbigliamento</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedMaterials.map(m => (
                <div key={m.id} className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <Package size={20} className="text-[#999]"/>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button onClick={() => setModal(m)} className="text-[#999] hover:text-[#1c84c6]"><Edit2 size={13}/></button>
                        <button onClick={() => deleteMaterial(m.id)} className="text-[#999] hover:text-red-500"><Trash2 size={13}/></button>
                      </div>
                    )}
                  </div>
                  <div className="text-[#2f4050] font-semibold text-sm">{m.nome}</div>
                  {m.descrizione && <div className="text-[#999] text-xs">{m.descrizione}</div>}
                  {isAdmin && (
                    <span className={clsx('inline-block text-xs px-1.5 py-0.5 rounded font-medium',
                      m.richiedibile_giocatori ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500')}>
                      {m.richiedibile_giocatori ? 'Visibile ai giocatori' : 'Non visibile ai giocatori'}
                    </span>
                  )}

                  {isCatalogRole ? (
                    <button onClick={() => openRequest(m.id)}
                      className="w-full flex items-center justify-center gap-1.5 bg-[#1ab394]/10 hover:bg-[#1ab394]/20 text-[#1ab394] py-1.5 rounded text-xs font-semibold transition-colors">
                      <Send size={12}/> Richiedi
                    </button>
                  ) : (
                    <div className={clsx('text-2xl font-bold',
                      m.quantita > 5 ? 'text-[#1ab394]' : m.quantita > 0 ? 'text-yellow-500' : 'text-red-500')}>
                      {m.quantita}
                    </div>
                  )}
                </div>
              ))}
              {displayedMaterials.length === 0 && (
                <div className="col-span-4 text-center text-[#999] py-6 text-sm">
                  {isCatalogRole ? 'Nessun articolo disponibile per la richiesta al momento.' : 'Nessun articolo'}
                </div>
              )}
            </div>
          </div>

          {/* Materiale struttura — non visibile a calciatori e volontari */}
          {!isPlayer && (
            <div>
              <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">⚽ Materiale Struttura</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {structureMaterials.map(m => (
                  <div key={m.id} className={clsx('bg-white border rounded shadow-sm p-4 space-y-2',
                    m.quantita_disponibile <= (m.quantita_minima || 0) ? 'border-yellow-300' : 'border-[#e7eaec]')}>
                    <div className="flex items-start justify-between">
                      <Package size={20} className="text-[#999]"/>
                      {m.quantita_disponibile <= (m.quantita_minima || 0) && (
                        <AlertTriangle size={14} className="text-yellow-500"/>
                      )}
                    </div>
                    <div className="text-[#2f4050] font-semibold text-sm">{m.nome}</div>
                    {m.descrizione && <div className="text-[#999] text-xs">{m.descrizione}</div>}
                    <div className={clsx('text-2xl font-bold',
                      m.quantita_disponibile <= 0 ? 'text-red-500'
                      : m.quantita_disponibile <= (m.quantita_minima || 0) ? 'text-yellow-500'
                      : 'text-[#1ab394]')}>
                      {m.quantita_disponibile}
                    </div>
                    <div className="text-xs text-[#999]">min. {m.quantita_minima || 0} pz</div>
                  </div>
                ))}
                {structureMaterials.length === 0 && <div className="col-span-4 text-center text-[#999] py-6 text-sm">Nessun articolo struttura</div>}
              </div>
            </div>
          )}
        </div>

      ) : tab === 'requests' ? (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
          {requests.length === 0 ? (
            <div className="text-center text-[#999] py-10 text-sm">Nessuna richiesta</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e7eaec] bg-gray-50">
                  {(isAdmin || isMister) && <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Richiedente</th>}
                  <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Tipo</th>
                  <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Articolo</th>
                  <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Qta</th>
                  <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Stato</th>
                  {isAdmin && <th className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">Azioni</th>}
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                    {(isAdmin || isMister) && (
                      <td className="px-4 py-3 text-[#2f4050] font-medium">
                        {r.profiles?.cognome} {r.profiles?.nome}
                        <div className="text-xs text-[#999]">{r.profiles?.role}</div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 rounded text-xs font-medium',
                        r.tipo === 'struttura' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600')}>
                        {r.tipo === 'struttura' ? '⚽ Struttura' : '👕 Abbigliamento'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#676a6c]">
                      {r.tipo === 'struttura' ? r.sc_structure_materials?.nome : r.materials?.nome}
                      {r.note && <div className="text-xs text-[#999] italic">{r.note}</div>}
                    </td>
                    <td className="px-4 py-3 text-[#999]">{r.quantita}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', STATUS_COLORS[r.status])}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {r.status === 'pending' && <>
                            <button onClick={() => updateStatus(r.id, 'approved', r)}
                              className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200">
                              Approva
                            </button>
                            <button onClick={() => updateStatus(r.id, 'rejected', r)}
                              className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200">
                              Rifiuta
                            </button>
                          </>}
                          {r.status === 'approved' && <>
                            <button onClick={() => updateStatus(r.id, 'delivered', r)}
                              className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs hover:bg-blue-200">
                              Consegnato
                            </button>
                            {/* PDF ordine — solo per richieste struttura */}
                            {r.tipo === 'struttura' && (
                              <button onClick={() => generateOrdinePDF(r, teamSettings)}
                                className="px-2 py-1 bg-gray-100 text-[#676a6c] rounded text-xs hover:bg-gray-200 flex items-center gap-1">
                                <Download size={11}/> PDF
                              </button>
                            )}
                          </>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      ) : tab === 'scarichi' && isAdmin ? (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
          {scarichi.length === 0 ? (
            <div className="text-center text-[#999] py-10 text-sm">Nessuno scarico registrato</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e7eaec] bg-gray-50">
                  {['Data','Articolo','Qta','Motivo','Operatore'].map(h => (
                    <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scarichi.map(s => (
                  <tr key={s.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                    <td className="px-4 py-3 text-[#999] text-xs">
                      {format(new Date(s.created_at), 'dd/MM/yyyy HH:mm', { locale: it })}
                    </td>
                    <td className="px-4 py-3 text-[#2f4050] font-medium">
                      {s.sc_structure_materials?.nome || '—'}
                    </td>
                    <td className="px-4 py-3 text-red-500 font-bold">-{s.quantita}</td>
                    <td className="px-4 py-3 text-[#676a6c]">{s.motivo || '—'}</td>
                    <td className="px-4 py-3 text-[#999] text-xs">
                      {s.profiles?.cognome} {s.profiles?.nome}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {modal !== null && (
        <MaterialModal material={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }}/>
      )}
      {reqModal && (
        <RequestModal
          materials={materials}
          structureMaterials={structureMaterials}
          initialMaterialId={reqPreset}
          onClose={() => { setReqModal(false); setReqPreset(null) }}
          onSaved={() => { setReqModal(false); setReqPreset(null); load() }}
        />
      )}
      {scaricoModal && (
        <ScaricoModal
          structureMaterials={structureMaterials}
          onClose={() => setScaricoModal(false)}
          onSaved={() => { setScaricoModal(false); load() }}
        />
      )}
    </div>
  )
}

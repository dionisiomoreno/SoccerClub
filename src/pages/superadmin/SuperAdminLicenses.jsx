import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, X, CreditCard, Copy, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import clsx from 'clsx'

const PIANI = ['starter', 'pro', 'full']
const PREZZI = { starter: 19, pro: 39, full: 59 }

const STATO_COLORS = {
  active:    'bg-green-100 text-green-600',
  trial:     'bg-blue-100 text-blue-600',
  suspended: 'bg-yellow-100 text-yellow-600',
  expired:   'bg-red-100 text-red-600',
}
const PIANO_COLORS = {
  starter: 'bg-gray-100 text-gray-600',
  pro:     'bg-purple-100 text-purple-600',
  full:    'bg-[#e94560]/10 text-[#e94560]',
}

function NewLicenseModal({ clubs, onClose, onSaved }) {
  const [form, setForm] = useState({
    club_id: '', piano: 'full', prezzo: 59,
    starts_at: format(new Date(), 'yyyy-MM-dd'),
    expires_at: format(new Date(Date.now() + 365*24*60*60*1000), 'yyyy-MM-dd'),
    note: ''
  })
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.club_id) return toast.error('Seleziona una squadra')
    setLoading(true)
    const { error } = await supabase.from('licenses').insert([{
      ...form,
      stato: 'active',
    }])
    if (error) { toast.error(error.message); setLoading(false); return }
    // Aggiorna anche il club
    await supabase.from('clubs').update({
      piano: form.piano,
      stato: 'active',
      license_expires_at: new Date(form.expires_at).toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', form.club_id)
    toast.success('Licenza creata!')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Nuova Licenza</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Squadra *</label>
            <select value={form.club_id} onChange={e => set('club_id', e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560]">
              <option value="">Seleziona squadra...</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Piano</label>
              <select value={form.piano} onChange={e => { set('piano', e.target.value); set('prezzo', PREZZI[e.target.value]) }}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560]">
                {PIANI.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)} — €{PREZZI[p]}/mese</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Prezzo (€/mese)</label>
              <input type="number" min="0" value={form.prezzo} onChange={e => set('prezzo', +e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560]"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Data inizio</label>
              <input type="date" value={form.starts_at} onChange={e => set('starts_at', e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Data scadenza</label>
              <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560]"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Note</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560] resize-none"
              placeholder="Es. pagamento annuale, sconto promozionale..."/>
          </div>
          {/* Riepilogo */}
          <div className="bg-[#e94560]/5 border border-[#e94560]/20 rounded p-3 text-sm">
            <div className="flex justify-between text-[#676a6c]">
              <span>Piano</span>
              <span className={clsx('px-2 py-0.5 rounded text-xs font-medium capitalize', PIANO_COLORS[form.piano])}>{form.piano}</span>
            </div>
            <div className="flex justify-between text-[#676a6c] mt-1">
              <span>Valore annuo stimato</span>
              <strong className="text-[#e94560]">€{form.prezzo * 12}</strong>
            </div>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">Annulla</button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-[#e94560] hover:bg-[#c73652] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Creazione...' : 'Crea licenza'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TokenCard({ license }) {
  const [copied, setCopied] = useState(false)

  function copyToken() {
    navigator.clipboard.writeText(license.token)
    setCopied(true)
    toast.success('Token copiato!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded p-2 mt-1">
      <code className="flex-1 text-xs text-[#676a6c] truncate font-mono">{license.token}</code>
      <button onClick={copyToken} className="text-[#999] hover:text-[#e94560] flex-shrink-0">
        {copied ? <CheckCircle size={14} className="text-green-500"/> : <Copy size={14}/>}
      </button>
    </div>
  )
}

export default function SuperAdminLicenses() {
  const [licenses, setLicenses] = useState([])
  const [clubs, setClubs] = useState([])
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterClub, setFilterClub] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: lic }, { data: cls }] = await Promise.all([
      supabase.from('licenses').select('*, clubs(nome,citta,slug)').order('created_at', { ascending: false }),
      supabase.from('clubs').select('id,nome,citta').order('nome'),
    ])
    setLicenses(lic || [])
    setClubs(cls || [])
    setLoading(false)
  }

  async function revokeLicense(id) {
    if (!confirm('Revocare questa licenza?')) return
    const { error } = await supabase.from('licenses').update({ stato: 'expired' }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Licenza revocata'); load() }
  }

  const filtered = filterClub
    ? licenses.filter(l => l.club_id === filterClub)
    : licenses

  // MRR totale
  const mrr = licenses
    .filter(l => l.stato === 'active')
    .reduce((s, l) => s + (l.prezzo || 0), 0)

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Licenze</h1>
          <p className="text-sm text-[#999] mt-1">Storico licenze e token di accesso</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-[#e94560] hover:bg-[#c73652] text-white px-4 py-2 rounded text-sm font-semibold">
          <Plus size={16}/> Nuova licenza
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <CreditCard size={20} className="mx-auto text-[#e94560] mb-2"/>
          <div className="text-2xl font-bold text-[#2f4050]">{licenses.length}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Licenze totali</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <CheckCircle size={20} className="mx-auto text-[#1ab394] mb-2"/>
          <div className="text-2xl font-bold text-[#1ab394]">{licenses.filter(l => l.stato === 'active').length}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Attive</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <div className="text-xs text-[#999] uppercase tracking-wide mb-2">MRR</div>
          <div className="text-2xl font-bold text-[#e94560]">€{mrr}</div>
          <div className="text-xs text-[#999] mt-1">ricorrente mensile</div>
        </div>
      </div>

      {/* Filtro */}
      <select value={filterClub} onChange={e => setFilterClub(e.target.value)}
        className="border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#e94560] w-full sm:w-auto">
        <option value="">Tutte le squadre</option>
        {clubs.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>

      {/* Lista licenze */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-[#e94560] border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-[#999] py-10 text-sm">
            <CreditCard size={32} className="mx-auto mb-2 opacity-30"/>
            Nessuna licenza trovata
          </div>
        ) : (
          <div className="divide-y divide-[#e7eaec]">
            {filtered.map(l => (
              <div key={l.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[#2f4050] font-semibold">{l.clubs?.nome}</span>
                      <span className={clsx('px-2 py-0.5 rounded text-xs font-medium capitalize', PIANO_COLORS[l.piano])}>{l.piano}</span>
                      <span className={clsx('px-2 py-0.5 rounded text-xs font-medium capitalize', STATO_COLORS[l.stato])}>{l.stato}</span>
                    </div>
                    <div className="text-xs text-[#999] space-y-0.5">
                      <div>
                        {format(new Date(l.starts_at), 'dd/MM/yyyy')} →{' '}
                        {l.expires_at ? format(new Date(l.expires_at), 'dd/MM/yyyy') : 'nessuna scadenza'}
                        {l.prezzo && <span className="ml-2 font-medium text-[#1ab394]">€{l.prezzo}/mese</span>}
                      </div>
                      {l.note && <div className="italic">{l.note}</div>}
                    </div>
                    {/* Token */}
                    <div className="mt-2">
                      <span className="text-xs text-[#999]">Token:</span>
                      <TokenCard license={l}/>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {l.stato === 'active' && (
                      <button onClick={() => revokeLicense(l.id)}
                        className="text-xs text-red-500 hover:underline">
                        Revoca
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <NewLicenseModal clubs={clubs} onClose={() => setModal(false)} onSaved={() => { setModal(false); load() }}/>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ensureKitPayment } from '../../lib/kitPaymentHelper'
import { useAuth } from '../../context/AuthContext'
import {
  ShoppingBag, Plus, X, AlertTriangle, Clock,
  CheckCircle, XCircle, Package, ChevronDown, ChevronUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

const TAGLIE = ['XS','S','M','L','XL','XXL','Unica','4','5','6','7','8','9','10','11','12']

const STATI = {
  in_attesa:  { label: 'In attesa',  color: 'bg-yellow-100 text-yellow-600', icon: Clock },
  ordinato:   { label: 'Ordinato',   color: 'bg-blue-100 text-blue-600',     icon: Clock },
  consegnato: { label: 'Consegnato', color: 'bg-green-100 text-green-600',   icon: CheckCircle },
  rifiutato:  { label: 'Rifiutato',  color: 'bg-red-100 text-red-600',       icon: XCircle },
}

// ── Modal ordine kit completo ─────────────────────────────────
function KitModal({ kit, child, onClose, onSaved }) {
  // Taglie pre-compilate dalla taglia dell'atleta
  const [taglie, setTaglie] = useState(() => {
    const init = {}
    for (const item of (kit.sc_kit_config_items || [])) {
      init[item.id] = child?.taglia || 'M'
    }
    return init
  })
  const [loading, setLoading] = useState(false)

  async function ordina() {
    setLoading(true)
    try {
      // Controlla se esiste già un'assegnazione non consegnata
      const { data: existing } = await supabase
        .from('sc_kit_assignments')
        .select('id, stato')
        .eq('kit_config_id', kit.id)
        .eq('youth_player_id', child.id)
        .neq('stato', 'consegnato')
        .maybeSingle()

      let assignmentId

      if (existing) {
        // Aggiorna quella esistente
        await supabase.from('sc_kit_assignment_items')
          .delete().eq('assignment_id', existing.id)
        await supabase.from('sc_kit_assignments')
          .update({ stato: 'in_attesa' }).eq('id', existing.id)
        assignmentId = existing.id
      } else {
        // Crea nuova
        const { data: ass, error } = await supabase
          .from('sc_kit_assignments')
          .insert([{ kit_config_id: kit.id, youth_player_id: child.id, stato: 'in_attesa' }])
          .select().single()
        if (error) throw new Error(error.message)
        assignmentId = ass.id
      }

      // Inserisci gli articoli con le taglie scelte
      const items = (kit.sc_kit_config_items || []).map(item => ({
        assignment_id:    assignmentId,
        kit_config_item_id: item.id,
        warehouse_item_id:  item.warehouse_item_id,
        taglia:           taglie[item.id] || 'M',
        quantita:         item.quantita || 1,
      }))
const { error: itemsError } = await supabase
        .from('sc_kit_assignment_items').insert(items)
      if (itemsError) throw new Error(itemsError.message)

      await ensureKitPayment({ kit, youthPlayerId: child.id, clubId: child?.club_id })

      toast.success('Kit ordinato! La segreteria elaborerà la richiesta.')
      onSaved()
    } catch(e) {
      toast.error(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <div>
            <h2 className="text-[#2f4050] font-bold">Ordina {kit.nome}</h2>
            <p className="text-xs text-[#999] mt-0.5">Verifica le taglie per {child?.nome} {child?.cognome}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-[#999]"/></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Info atleta */}
          <div className="bg-gray-50 rounded p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: child?.categories?.colore || '#27ae60' }}>
              {(child?.nome?.[0]||'')+(child?.cognome?.[0]||'')}
            </div>
            <div>
              <div className="text-[#2f4050] font-semibold text-sm">{child?.nome} {child?.cognome}</div>
              <div className="text-xs text-[#999]">
                {child?.categories?.nome} · Taglia default: <strong>{child?.taglia || '—'}</strong>
              </div>
            </div>
          </div>

          {/* Articoli con taglie */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-2">
              Articoli del kit ({kit.sc_kit_config_items?.length || 0})
            </label>
            <div className="space-y-2">
              {(kit.sc_kit_config_items || []).map(item => (
                <div key={item.id}
                  className="flex items-center justify-between gap-3 p-3 bg-gray-50 border border-[#e7eaec] rounded">
                  <div>
                    <div className="text-[#2f4050] text-sm font-medium">
                      {item.warehouse_items?.nome || '—'}
                    </div>
                    <div className="text-xs text-[#999]">Quantità: {item.quantita || 1}</div>
                  </div>
                  <select
                    value={taglie[item.id] || 'M'}
                    onChange={e => setTaglie(t => ({ ...t, [item.id]: e.target.value }))}
                    className="border border-[#e7eaec] rounded px-2 py-1.5 text-[#676a6c] text-sm outline-none focus:border-[#27ae60] w-24">
                    {TAGLIE.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Nota */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
            💡 La segreteria riceverà la tua richiesta e ti contatterà per la consegna.
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose}
            className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">
            Annulla
          </button>
          <button onClick={ordina} disabled={loading}
            className="flex-1 bg-[#27ae60] hover:bg-[#229954] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Invio...' : 'Conferma ordine kit'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────
export default function ParentKit() {
  const { profile } = useAuth()
  const [child,       setChild]       = useState(null)
  const [kits,        setKits]        = useState([])   // kit disponibili per la categoria
  const [assignments, setAssignments] = useState([])   // ordini effettuati
  const [modal,       setModal]       = useState(null) // kit selezionato
  const [expanded,    setExpanded]    = useState(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => { load() }, [profile])

  async function load() {
    if (!profile?.id) return
    setLoading(true)

    // Genitore + figlio
    const { data: parent } = await supabase
      .from('parents')
      .select('*, youth_players(*, categories(nome,colore))')
      .eq('user_id', profile.id)
      .single()

    if (!parent?.youth_players) { setLoading(false); return }
    const yp = parent.youth_players
    setChild(yp)

    // Kit disponibili per la categoria del figlio o per tutte le categorie
  const { data: kitData } = await supabase
      .from('sc_kit_configs')
      .select('*, categories(nome,colore), sc_kit_config_items(*, warehouse_items(nome,categoria,prezzo)))')
      .eq('active', true)
      .or(`category_id.eq.${yp.category_id},category_id.is.null`)
      .order('nome')
    setKits(kitData || [])

    // Ordini effettuati dall'atleta
    const { data: assData } = await supabase
      .from('sc_kit_assignments')
      .select('*, sc_kit_configs(nome), sc_kit_assignment_items(*, warehouse_items(nome))')
      .eq('youth_player_id', yp.id)
      .order('created_at', { ascending: false })
    setAssignments(assData || [])

    setLoading(false)
  }

  if (!loading && !child) return (
    <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
      <AlertTriangle size={32} className="mx-auto text-yellow-500 mb-2"/>
      <p className="text-yellow-700">Nessun atleta collegato. Contatta la segreteria.</p>
    </div>
  )

  const catColor    = child?.categories?.colore || '#27ae60'
  const inAttesa    = assignments.filter(a => a.stato === 'in_attesa').length
  const ordinati    = assignments.filter(a => a.stato === 'ordinato').length
  const consegnati  = assignments.filter(a => a.stato === 'consegnato').length

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4">
        <h1 className="text-2xl font-bold text-[#2f4050]">Kit Sportivo</h1>
        <p className="text-sm text-[#999] mt-1">
          Ordina il kit per {child?.nome} {child?.cognome}
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <Clock size={20} className="mx-auto text-yellow-500 mb-2"/>
          <div className="text-2xl font-bold text-[#2f4050]">{inAttesa}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">In attesa</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <Package size={20} className="mx-auto text-blue-500 mb-2"/>
          <div className="text-2xl font-bold text-[#2f4050]">{ordinati}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Ordinati</div>
        </div>
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-4 text-center">
          <CheckCircle size={20} className="mx-auto text-[#27ae60] mb-2"/>
          <div className="text-2xl font-bold text-[#2f4050]">{consegnati}</div>
          <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Consegnati</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: catColor }}/>
        </div>
      ) : (
        <>
          {/* Kit disponibili */}
          <div>
            <h2 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide mb-3">
              Kit disponibili per {child?.categories?.nome}
            </h2>
            {kits.length === 0 ? (
              <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-8 text-center">
                <ShoppingBag size={32} className="mx-auto text-[#999] mb-2 opacity-40"/>
                <p className="text-[#999] text-sm">
                  Nessun kit configurato per la tua categoria.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {kits.map(kit => {
                  const giaOrdinato = assignments.find(
                    a => a.kit_config_id === kit.id && a.stato !== 'consegnato'
                  )
                  return (
                    <div key={kit.id}
                      className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
                      <div className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#27ae60]/10 text-[#27ae60] flex items-center justify-center flex-shrink-0">
                            <ShoppingBag size={18}/>
                          </div>
                          <div>
                            <div className="text-[#2f4050] font-semibold">{kit.nome}</div>
                            <div className="text-xs text-[#999] mt-0.5">
                              {kit.sc_kit_config_items?.length || 0} articoli
                              {kit.categories && ` · ${kit.categories.nome}`}
                            </div>
                            {giaOrdinato && (
                              <span className={clsx('text-xs px-2 py-0.5 rounded font-medium mt-1 inline-block',
                                STATI[giaOrdinato.stato]?.color)}>
                                {STATI[giaOrdinato.stato]?.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => setExpanded(expanded === kit.id ? null : kit.id)}
                            className="text-[#999] hover:text-[#676a6c] p-1">
                            {expanded === kit.id
                              ? <ChevronUp size={18}/>
                              : <ChevronDown size={18}/>}
                          </button>
                          <button
                            onClick={() => setModal(kit)}
                            className="flex items-center gap-1 bg-[#27ae60] hover:bg-[#229954] text-white px-3 py-1.5 rounded text-xs font-semibold">
                            <Plus size={13}/>
                            {giaOrdinato ? 'Modifica' : 'Ordina'}
                          </button>
                        </div>
                      </div>

                      {/* Dettaglio articoli */}
                      {expanded === kit.id && (
                        <div className="border-t border-[#e7eaec] px-4 py-3">
                          <div className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-2">
                            Contenuto kit
                          </div>
                          <div className="space-y-1">
                            {(kit.sc_kit_config_items || []).map(item => (
                              <div key={item.id}
                                className="flex items-center justify-between text-sm py-1 border-b border-[#e7eaec] last:border-0">
                                <span className="text-[#676a6c]">{item.warehouse_items?.nome || '—'}</span>
                                <span className="text-[#999] text-xs">×{item.quantita || 1}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Storico ordini */}
          {assignments.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-[#2f4050] uppercase tracking-wide mb-3">
                Storico ordini
              </h2>
              <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
                <div className="divide-y divide-[#e7eaec]">
                  {assignments.map(a => {
                    const S = STATI[a.stato] || STATI.in_attesa
                    const Icon = S.icon
                    return (
                      <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                        <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', S.color)}>
                          <Icon size={17}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[#2f4050] font-medium text-sm">
                            {a.sc_kit_configs?.nome}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(a.sc_kit_assignment_items || []).map(item => (
                              <span key={item.id}
                                className="text-xs bg-gray-100 text-[#676a6c] px-1.5 py-0.5 rounded">
                                {item.warehouse_items?.nome}
                                {item.taglia ? ` (${item.taglia})` : ''}
                              </span>
                            ))}
                          </div>
                          <div className="text-xs text-[#999] mt-1">
                            {format(new Date(a.created_at), 'd MMM yyyy', { locale: it })}
                          </div>
                        </div>
                        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium flex-shrink-0', S.color)}>
                          {S.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal ordine kit */}
      {modal && child && (
        <KitModal
          kit={modal}
          child={child}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}

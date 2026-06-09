import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { UserCog, Edit2, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

function AssignModal({ mister, categories, onClose, onSaved }) {
  const [categoryId, setCategoryId] = useState(mister.category_id || '')
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({ category_id: categoryId || null })
      .eq('id', mister.id)
    if (error) toast.error(error.message)
    else { toast.success('Categoria assegnata'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">Assegna categoria</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 bg-gray-50 rounded p-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
              {(mister.nome?.[0] || '') + (mister.cognome?.[0] || '')}
            </div>
            <div>
              <div className="text-[#2f4050] font-semibold text-sm">{mister.cognome} {mister.nome}</div>
              <div className="text-xs text-[#999]">Mister</div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">
              Categoria SC
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"
            >
              <option value="">— Nessuna (Prima Squadra) —</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <p className="text-xs text-[#999] mt-1">
              Se assegni una categoria, il mister vedrà solo la Scuola Calcio.
            </p>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose} className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">
            Annulla
          </button>
          <button onClick={save} disabled={loading}
            className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold">
            {loading ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SCMister() {
  const [misters, setMisters] = useState([])
  const [categories, setCategories] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase.from('profiles').select('*, categories(nome, colore)').eq('role', 'mister').order('cognome'),
      supabase.from('categories').select('*').order('ordine')
    ])
    setMisters(m || [])
    setCategories(c || [])
    setLoading(false)
  }

  const assignedIds = misters.filter(m => m.category_id).map(m => m.category_id)

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4">
        <h1 className="text-2xl font-bold text-[#2f4050]">Mister Scuola Calcio</h1>
        <p className="text-sm text-[#999] mt-1">Associa i mister alle categorie del settore giovanile</p>
      </div>

      {/* Categorie riepilogo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map(cat => {
          const misterCat = misters.find(m => m.category_id === cat.id)
          return (
            <div key={cat.id} className="bg-white border border-[#e7eaec] rounded shadow-sm p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.colore }}/>
                <span className="text-xs font-semibold text-[#2f4050]">{cat.nome}</span>
              </div>
              {misterCat ? (
                <div className="text-xs text-[#1ab394] font-medium flex items-center gap-1">
                  <Check size={11}/> {misterCat.cognome} {misterCat.nome}
                </div>
              ) : (
                <div className="text-xs text-[#999]">Nessun mister</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Lista mister */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : misters.length === 0 ? (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-8 text-center">
          <UserCog size={32} className="mx-auto text-[#999] mb-2"/>
          <p className="text-[#999] text-sm">Nessun mister trovato.</p>
          <p className="text-xs text-[#999] mt-1">Aggiungili dalla pagina Calciatori con ruolo "Mister".</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e7eaec] bg-gray-50">
                {['Mister', 'Email', 'Sezione', 'Categoria SC', 'Azioni'].map(h => (
                  <th key={h} className="text-left text-xs text-[#999] px-4 py-3 font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {misters.map(m => (
                <tr key={m.id} className="border-b border-[#e7eaec] hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {(m.nome?.[0] || '') + (m.cognome?.[0] || '')}
                      </div>
                      <span className="text-[#2f4050] font-medium">{m.cognome} {m.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#999]">{m.email}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('px-2 py-0.5 rounded text-xs font-medium',
                      m.category_id ? 'bg-[#27ae60]/10 text-[#27ae60]' : 'bg-[#1ab394]/10 text-[#1ab394]')}>
                      {m.category_id ? '🏫 Scuola Calcio' : '⚽ Prima Squadra'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {m.categories ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-[#2f4050]">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.categories.colore }}/>
                        {m.categories.nome}
                      </span>
                    ) : (
                      <span className="text-xs text-[#999]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setModal(m)}
                      className="flex items-center gap-1 text-[#999] hover:text-[#1ab394] text-xs"
                    >
                      <Edit2 size={13}/> Assegna
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <AssignModal
          mister={modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { UserCog, Plus, Edit2, X, Check, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

function MisterModal({ mister, categories, onClose, onSaved }) {
  const { profile } = useAuth()
  const isEdit = !!mister?.id
  const [form, setForm] = useState({
    nome: '', cognome: '', email: '', telefono: '',
    codice_fiscale: '', numero_patente: '', numero_tessera: '',
    compenso_fisso: '', taglia: 'M', active: true,
    category_id: '',
    ...mister,
    category_id: mister?.category_id || '',
  })
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.nome || !form.cognome) return toast.error('Nome e cognome obbligatori')
    if (!isEdit && !form.email) return toast.error('Email obbligatoria')
    if (!isEdit && password.length < 8) return toast.error('Password minimo 8 caratteri')

    setLoading(true)
    try {
      if (isEdit) {
        const { error } = await supabase.from('profiles').update({
          nome: form.nome,
          cognome: form.cognome,
          telefono: form.telefono,
          codice_fiscale: form.codice_fiscale,
          numero_patente: form.numero_patente,
          numero_tessera: form.numero_tessera,
          compenso_fisso: form.compenso_fisso !== '' ? +form.compenso_fisso : null,
          taglia: form.taglia,
          active: form.active,
          category_id: form.category_id || null,
        }).eq('id', form.id)
        if (error) throw new Error(error.message)
        toast.success('Mister aggiornato')
      } else {
        // Crea account Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email, password
        })
        if (authError) throw new Error('Errore creazione account: ' + authError.message)
        const userId = authData.user?.id
        if (!userId) throw new Error('ID utente non disponibile')

        // Crea profilo
        const { error: profileError } = await supabase.from('profiles').upsert([{
          id: userId,
          club_id: profile?.club_id,
          role: 'mister',
          nome: form.nome,
          cognome: form.cognome,
          email: form.email,
          telefono: form.telefono,
          codice_fiscale: form.codice_fiscale,
          numero_patente: form.numero_patente,
          numero_tessera: form.numero_tessera,
          compenso_fisso: form.compenso_fisso !== '' ? +form.compenso_fisso : null,
          taglia: form.taglia,
          active: form.active,
          category_id: form.category_id || null,
        }])
        if (profileError) throw new Error('Errore profilo: ' + profileError.message)
        toast.success('Mister aggiunto! Può accedere con email e password impostate.')
      }
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
          <h2 className="text-[#2f4050] font-bold">{isEdit ? 'Modifica' : 'Nuovo'} Mister</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">

          {/* Nome e Cognome */}
          <div className="grid grid-cols-2 gap-3">
            {[['nome','Nome *'],['cognome','Cognome *']].map(([k,l]) => (
              <div key={k}>
                <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">{l}</label>
                <input value={form[k]||''} onChange={e=>set(k,e.target.value)}
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
              </div>
            ))}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Email *</label>
            <input type="email" value={form.email||''} onChange={e=>set('email',e.target.value)}
              disabled={isEdit}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394] disabled:opacity-50 disabled:bg-gray-50"/>
          </div>

          {/* Password — solo in creazione */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Password *</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="Minimo 8 caratteri"
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
              {password && password.length < 8 && (
                <p className="text-xs text-red-400 mt-1">Minimo 8 caratteri</p>
              )}
              <p className="text-xs text-[#999] mt-1">Il mister userà queste credenziali per accedere all'app.</p>
            </div>
          )}

          {/* Altri dati */}
          {[
            ['telefono','Telefono'],
            ['codice_fiscale','Codice fiscale'],
            ['numero_patente','N° patente'],
            ['numero_tessera','N° tessera FIGC'],
          ].map(([k,l]) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">{l}</label>
              <input value={form[k]||''} onChange={e=>set(k,e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          ))}

          {/* Compenso fisso */}
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Compenso fisso mensile (€)</label>
            <input type="number" min="0" value={form.compenso_fisso||''}
              onChange={e=>set('compenso_fisso',e.target.value)}
              placeholder="Es. 500"
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>

          {/* Sezione e categoria */}
          <div className="border-t border-[#e7eaec] pt-3">
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-2">
              Sezione e categoria
            </label>

            {/* Scelta sezione */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => set('category_id', '')}
                className={clsx('py-2 px-3 rounded border text-sm font-medium transition-colors',
                  !form.category_id
                    ? 'bg-[#1ab394]/10 border-[#1ab394] text-[#1ab394]'
                    : 'border-[#e7eaec] text-[#676a6c] hover:border-[#1ab394]/50')}>
                ⚽ Prima Squadra
              </button>
              <button
                type="button"
                onClick={() => set('category_id', categories[0]?.id || '')}
                className={clsx('py-2 px-3 rounded border text-sm font-medium transition-colors',
                  form.category_id
                    ? 'bg-[#27ae60]/10 border-[#27ae60] text-[#27ae60]'
                    : 'border-[#e7eaec] text-[#676a6c] hover:border-[#27ae60]/50')}>
                🏫 Scuola Calcio
              </button>
            </div>

            {/* Selezione categoria SC */}
            {form.category_id !== '' && (
              <div>
                <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">
                  Categoria SC
                </label>
                <select value={form.category_id} onChange={e=>set('category_id',e.target.value)}
                  className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#27ae60]">
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                <p className="text-xs text-[#999] mt-1">
                  Il mister vedrà solo la sezione Scuola Calcio e la chat della categoria assegnata.
                </p>
              </div>
            )}

            {!form.category_id && (
              <p className="text-xs text-[#999]">
                Il mister vedrà solo la sezione Prima Squadra.
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input type="checkbox" checked={form.active} onChange={e=>set('active',e.target.checked)} className="accent-[#1ab394]"/>
            <span className="text-sm text-[#676a6c]">Attivo</span>
          </label>
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

  async function deleteMister(m) {
    if (!confirm(`Eliminare ${m.nome} ${m.cognome}?`)) return
    await supabase.from('profiles').delete().eq('id', m.id)
    toast.success('Mister eliminato')
    load()
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Mister</h1>
          <p className="text-sm text-[#999] mt-1">Gestione mister Prima Squadra e Scuola Calcio</p>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
          <Plus size={16}/> Nuovo mister
        </button>
      </div>

      {/* Riepilogo categorie SC */}
      {categories.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Categorie Scuola Calcio</h2>
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
        </div>
      )}

      {/* Lista mister */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : misters.length === 0 ? (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-8 text-center">
          <UserCog size={32} className="mx-auto text-[#999] mb-2"/>
          <p className="text-[#999] text-sm">Nessun mister trovato.</p>
          <p className="text-xs text-[#999] mt-1">Clicca "Nuovo mister" per aggiungerne uno.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e7eaec] rounded shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e7eaec] bg-gray-50">
                {['Mister','Email','Sezione','Categoria SC','Compenso','Azioni'].map(h => (
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
                        {(m.nome?.[0]||'')+(m.cognome?.[0]||'')}
                      </div>
                      <div>
                        <div className="text-[#2f4050] font-medium">{m.cognome} {m.nome}</div>
                        <div className={clsx('text-xs', m.active ? 'text-green-500' : 'text-[#999]')}>
                          {m.active ? 'Attivo' : 'Non attivo'}
                        </div>
                      </div>
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
                  <td className="px-4 py-3 text-[#1ab394] font-medium">
                    {m.compenso_fisso ? `€${m.compenso_fisso}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setModal(m)}
                        className="text-[#999] hover:text-[#1c84c6]">
                        <Edit2 size={15}/>
                      </button>
                      <button onClick={() => deleteMister(m)}
                        className="text-[#999] hover:text-red-500">
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <MisterModal
          mister={modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}

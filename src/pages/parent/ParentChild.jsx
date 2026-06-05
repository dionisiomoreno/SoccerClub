import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { AlertTriangle } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import clsx from 'clsx'

function MedicalBadge({ date }) {
  if (!date) return <span className="text-xs text-[#999]">—</span>
  const days = differenceInDays(new Date(date), new Date())
  if (days < 0) return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-100 text-red-600"><AlertTriangle size={10}/> Scaduto</span>
  if (days <= 30) return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-600"><AlertTriangle size={10}/> {days}gg</span>
  return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-600">Valido</span>
}

export default function ParentChild() {
  const { profile } = useAuth()
  const [child, setChild] = useState(null)
  const [parent, setParent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [profile])

  async function load() {
    if (!profile?.id) return
    setLoading(true)
    const { data: p } = await supabase.from('parents')
      .select('*, youth_players(*, categories(nome,colore))').eq('user_id', profile.id).single()
    if (p) { setParent(p); setChild(p.youth_players) }
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-[#27ae60] border-t-transparent rounded-full animate-spin"/></div>
  if (!child) return (
    <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center">
      <AlertTriangle size={32} className="mx-auto text-yellow-500 mb-2"/>
      <p className="text-yellow-700">Nessun atleta collegato. Contatta la segreteria.</p>
    </div>
  )

  const catColor = child.categories?.colore || '#27ae60'
  const medicalDays = child.scadenza_certificato_medico ? differenceInDays(new Date(child.scadenza_certificato_medico), new Date()) : null

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="border-b border-[#e7eaec] pb-4">
        <h1 className="text-2xl font-bold text-[#2f4050]">Il mio figlio/a</h1>
        <p className="text-sm text-[#999] mt-1">Scheda anagrafica e dati sportivi</p>
      </div>

      {/* Header atleta */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-5 flex items-center gap-4">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0"
          style={{ background: catColor }}>
          {(child.nome?.[0]||'')+(child.cognome?.[0]||'')}
        </div>
        <div>
          <div className="text-[#2f4050] font-bold text-xl">{child.nome} {child.cognome}</div>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="px-2 py-0.5 rounded text-xs text-white font-medium" style={{ background: catColor }}>{child.categories?.nome}</span>
            {child.squadra && <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-[#676a6c]">{child.squadra}</span>}
            {child.numero_maglia && <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-[#676a6c]">N° {child.numero_maglia}</span>}
            <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', child.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500')}>
              {child.active ? 'Attivo' : 'Non attivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Alert certificato */}
      {medicalDays !== null && medicalDays <= 30 && (
        <div className={clsx('flex items-center gap-2 rounded p-3 text-sm border',
          medicalDays < 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-yellow-50 border-yellow-200 text-yellow-700')}>
          <AlertTriangle size={16}/>
          {medicalDays < 0
            ? '⚠️ Certificato medico SCADUTO! Vai su Documenti per caricarne uno nuovo.'
            : `⚠️ Certificato medico in scadenza tra ${medicalDays} giorni!`}
        </div>
      )}

      {/* Dati personali */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-5">
        <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-4">Dati personali</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['Data di nascita', child.data_nascita ? format(new Date(child.data_nascita), 'dd/MM/yyyy') : null],
            ['Luogo di nascita', child.luogo_nascita],
            ['Codice fiscale', child.codice_fiscale],
            ['Telefono', child.telefono],
            ['Email', child.email],
            ['Indirizzo', child.indirizzo],
          ].map(([l, v]) => (
            <div key={l}>
              <div className="text-xs text-[#999]">{l}</div>
              <div className="text-[#2f4050] font-medium">{v || '—'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dati sportivi */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-5">
        <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-4">Dati sportivi</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['N° tessera FIGC', child.numero_tessera],
            ['N° maglia', child.numero_maglia],
            ['Squadra', child.squadra],
            ['Data iscrizione', child.data_iscrizione ? format(new Date(child.data_iscrizione), 'dd/MM/yyyy') : null],
          ].map(([l, v]) => (
            <div key={l}>
              <div className="text-xs text-[#999]">{l}</div>
              <div className="text-[#2f4050] font-medium">{v || '—'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Certificato medico */}
      <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-5">
        <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-4">Certificato medico</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-[#999]">Data visita</div>
            <div className="text-[#2f4050] font-medium">
              {child.data_certificato_medico ? format(new Date(child.data_certificato_medico), 'dd/MM/yyyy') : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#999]">Scadenza</div>
            <div className="flex items-center gap-2">
              <span className="text-[#2f4050] font-medium">
                {child.scadenza_certificato_medico ? format(new Date(child.scadenza_certificato_medico), 'dd/MM/yyyy') : '—'}
              </span>
              <MedicalBadge date={child.scadenza_certificato_medico}/>
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      {child.note && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-700">
          📝 <strong>Note:</strong> {child.note}
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { MapPin, Plus, Edit2, Trash2, ExternalLink, Upload, FileText, AlertTriangle, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, isPast } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

// ── Modal nuova/modifica partita ──────────────────────────────
function MatchModal({ match, onClose, onSaved }) {
  const isEdit = !!match?.id
  const [form, setForm] = useState({
    avversario: '', date: '', time: '', campo: '',
    indirizzo: '', maps_url: '', casa: true, ...match
  })
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.avversario || !form.date) return toast.error('Compila i campi obbligatori')
    setLoading(true)
    const payload = {
      avversario: form.avversario, date: form.date, time: form.time,
      campo: form.campo, indirizzo: form.indirizzo,
      maps_url: form.maps_url, casa: form.casa
    }
    const { error } = isEdit
      ? await supabase.from('matches').update(payload).eq('id', form.id)
      : await supabase.from('matches').insert([payload])
    if (error) toast.error(error.message)
    else { toast.success(isEdit ? 'Partita aggiornata' : 'Partita aggiunta'); onSaved() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <h2 className="text-[#2f4050] font-bold">{isEdit ? 'Modifica' : 'Nuova'} Partita</h2>
          <button onClick={onClose} className="text-[#999] hover:text-[#676a6c]"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Avversario *</label>
            <input value={form.avversario} onChange={e => set('avversario', e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Data *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">Orario</label>
              <input type="time" value={form.time} onChange={e => set('time', e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          </div>
          {[['campo','Campo'],['indirizzo','Indirizzo'],['maps_url','Link Google Maps']].map(([k,l]) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-[#999] uppercase tracking-wide mb-1">{l}</label>
              <input value={form[k]||''} onChange={e => set(k, e.target.value)}
                className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
            </div>
          ))}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.casa} onChange={e => set('casa', e.target.checked)} className="accent-[#1ab394]"/>
            <span className="text-sm text-[#676a6c]">Partita in casa</span>
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

// ── Modal import PDF FIGC ─────────────────────────────────────
function ImportPDFModal({ onClose, onSaved, nomeSquadra }) {
  const [file,      setFile]      = useState(null)
  const [parsing,   setParsing]   = useState(false)
  const [matches,   setMatches]   = useState([])
  const [selected,  setSelected]  = useState([])
  const [importing, setImporting] = useState(false)
  const [error,     setError]     = useState('')
  const [step,      setStep]      = useState(1)
  const fileRef = useRef()

  function squadraMatch(lineaNome, squadraNome) {
    const a = (lineaNome || '').toLowerCase().replace(/\s+/g, ' ').trim()
    const b = (squadraNome || '').toLowerCase().replace(/\s+/g, ' ').trim()

    // Match esatto
    if (a === b || a.includes(b) || b.includes(a)) return true

    // Match sulla prima parola con almeno 4 caratteri (es. "Castelmauro")
    const paroleB = b.split(' ').filter(p => p.length >= 4)
    if (paroleB.some(p => a.includes(p))) return true

    // Match con abbreviazioni tipo "Castelmauro C. 1986" vs "Castelmauro Calcio 1986"
    // Prende solo parole >= 4 chars da entrambi e confronta
    const paroleA = a.split(' ').filter(p => p.length >= 4)
    const comuni  = paroleB.filter(p => paroleA.some(pa => pa.startsWith(p.slice(0,4))))
    return comuni.length >= 1
  }

  // Converte "dd/mm/yyyy" → "yyyy-mm-dd"
  function parseDate(str) {
    const [d, m, y] = str.split('/')
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }

  // Parser testo estratto dal PDF
  function parsePDF(text) {
    const found = []

    // Unisci tutto il testo e normalizza spazi
    const fullText = text.replace(/\r/g, '\n')
    const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean)

    let giornata = null
    let dateA    = null
    let dateR    = null
    let oraA     = null
    let oraR     = null

    const reGiornata = /(\d+)[aª°]\s*GIORNATA/i
    const rePartita  = /^(.+?)\s+-\s+(.+)$/

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // ── Giornata ──
      const gm = line.match(reGiornata)
      if (gm) {
        giornata = parseInt(gm[1])
        continue
      }

      // ── Date: cerca pattern "21/09/2025" e "R18/01/2026" nella riga
      const dateMatches = line.match(/(\d{2}\/\d{2}\/\d{4})/g)
      if (dateMatches) {
        // Andata: prima data nella riga (preceduta da A o senza prefisso)
        if (line.match(/\bA\b/) || (!line.match(/\bR\b/) && dateMatches[0])) {
          dateA = parseDate(dateMatches[0])
        }
        // Ritorno: data dopo R
        const rMatch = line.match(/R\s*(\d{2}\/\d{2}\/\d{4})/)
        if (rMatch) dateR = parseDate(rMatch[1])
        // Se ci sono due date nella stessa riga (formato "A data R data")
        if (dateMatches.length >= 2 && line.includes('R')) {
          dateA = parseDate(dateMatches[0])
          dateR = parseDate(dateMatches[1])
        }
        continue
      }

      // ── Orari ──
      if (/\bore\b/i.test(line)) {
        const oreArr = [...line.matchAll(/ore\s+(\d{2}[.:]\d{2})/gi)]
        if (oreArr[0]) oraA = oreArr[0][1].replace('.', ':')
        if (oreArr[1]) oraR = oreArr[1][1].replace('.', ':')
        else oraR = oraA
        continue
      }

      // ── Partita: "Squadra Casa - Squadra Ospite" ──
      const pm = line.match(rePartita)
      if (pm && giornata) {
        const casa   = pm[1].trim()
        const ospite = pm[2].trim()

        // Ignora righe che sono intestazioni o note
        if (casa.match(/giornata|campionato|figc|f\.i\.g/i)) continue

        const isCasa   = squadraMatch(casa, nomeSquadra)
        const isOspite = squadraMatch(ospite, nomeSquadra)

        if ((isCasa || isOspite) && dateA) {
          // Andata
          if (!found.find(f => f.id === `${giornata}-A`)) {
            found.push({
              id:         `${giornata}-A`,
              giornata,
              tipo:       'A',
              date:       dateA,
              time:       oraA || '',
              avversario: isCasa ? ospite : casa,
              casa:       isCasa,
            })
          }
          // Ritorno
          if (dateR && !found.find(f => f.id === `${giornata}-R`)) {
            found.push({
              id:         `${giornata}-R`,
              giornata,
              tipo:       'R',
              date:       dateR,
              time:       oraR || oraA || '',
              avversario: isCasa ? ospite : casa,
              casa:       !isCasa,
            })
          }
        }
      }
    }

    return found.sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  async function handleFile(f) {
    if (!f) return
    if (f.type !== 'application/pdf') { setError('Seleziona un file PDF'); return }
    setFile(f)
    setParsing(true)
    setError('')
    setMatches([])

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          // Carica pdfjs da CDN
          if (!window.pdfjsLib) {
            await new Promise((res, rej) => {
              const s = document.createElement('script')
              s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
              s.onload = res
              s.onerror = rej
              document.head.appendChild(s)
            })
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
          }

          const typedArray = new Uint8Array(e.target.result)
          const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise
          let fullText = ''

          for (let p = 1; p <= pdf.numPages; p++) {
            const page    = await pdf.getPage(p)
            const content = await page.getTextContent()
            // Raggruppa items per riga in base alla Y position
            const byY = {}
            for (const item of content.items) {
              const y = Math.round(item.transform[5])
              if (!byY[y]) byY[y] = []
              byY[y].push(item.str)
            }
            // Ordina per Y decrescente (top→bottom) e concatena
            const ys = Object.keys(byY).map(Number).sort((a, b) => b - a)
            for (const y of ys) {
              fullText += byY[y].join(' ') + '\n'
            }
          }

          const found = parsePDF(fullText)
          if (found.length === 0) {
            setError(`Nessuna partita trovata per "${nomeSquadra}". Verifica il nome squadra nelle Impostazioni.`)
          } else {
            setMatches(found)
            setSelected(found.map(m => m.id))
            setStep(2)
          }
        } catch (err) {
          setError('Errore lettura PDF: ' + err.message)
        }
        setParsing(false)
      }
      reader.readAsArrayBuffer(f)
    } catch (err) {
      setError('Errore: ' + err.message)
      setParsing(false)
    }
  }

  function toggleMatch(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  async function importMatches() {
    if (!selected.length) return toast.error('Seleziona almeno una partita')
    setImporting(true)
    const toImport = matches.filter(m => selected.includes(m.id))
    let imported = 0, skipped = 0

    for (const m of toImport) {
      // Controlla duplicati
      const { count } = await supabase.from('matches')
        .select('id', { count: 'exact' })
        .eq('date', m.date)
      if (count > 0) { skipped++; continue }

      await supabase.from('matches').insert([{
        avversario: m.avversario,
        date:       m.date,
        time:       m.time || null,
        casa:       m.casa,
        campo:      null,
        indirizzo:  null,
        maps_url:   null,
      }])
      imported++
    }

    if (imported === 0 && skipped > 0) {
      toast('Tutte le partite erano già presenti', { icon: 'ℹ️' })
    } else {
      toast.success(`${imported} partite importate!${skipped > 0 ? ` (${skipped} già presenti)` : ''}`)
    }
    onSaved()
    setImporting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e7eaec]">
          <div>
            <h2 className="text-[#2f4050] font-bold">Importa calendario FIGC</h2>
            <p className="text-xs text-[#999] mt-0.5">
              Verranno importate solo le partite di <strong>{nomeSquadra}</strong>
            </p>
          </div>
          <button onClick={onClose}><X size={18} className="text-[#999]"/></button>
        </div>

        {/* Step 1 — Upload */}
        {step === 1 && (
          <div className="p-4 space-y-4">
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
              className="border-2 border-dashed border-[#e7eaec] hover:border-[#1ab394] rounded p-10 text-center cursor-pointer transition-colors">
              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
                  <p className="text-[#999] text-sm">Analisi PDF in corso...</p>
                </div>
              ) : (
                <>
                  <FileText size={36} className="mx-auto text-[#999] mb-3"/>
                  <p className="text-[#676a6c] font-medium">Trascina il PDF del calendario FIGC</p>
                  <p className="text-xs text-[#999] mt-1">oppure clicca per selezionare</p>
                  {file && <p className="text-xs text-[#1ab394] mt-2 font-medium">{file.name}</p>}
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden"
              onChange={e => handleFile(e.target.files[0])}/>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded p-3 text-red-600 text-sm">
                <AlertTriangle size={15}/> {error}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
              💡 Il nome squadra usato per la ricerca è <strong>"{nomeSquadra}"</strong>.
              Se non vengono trovate partite, modificalo in <strong>Impostazioni → Nome squadra</strong>.
            </div>
          </div>
        )}

        {/* Step 2 — Anteprima */}
        {step === 2 && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#676a6c]">
                Trovate <strong className="text-[#2f4050]">{matches.length}</strong> partite —
                seleziona quelle da importare
              </p>
              <div className="flex gap-3">
                <button onClick={() => setSelected(matches.map(m => m.id))}
                  className="text-xs text-[#1ab394] hover:underline">Tutte</button>
                <button onClick={() => setSelected([])}
                  className="text-xs text-[#999] hover:underline">Nessuna</button>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {matches.map(m => (
                <label key={m.id}
                  className="flex items-center gap-3 p-3 rounded border border-[#e7eaec] hover:bg-gray-50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={selected.includes(m.id)}
                    onChange={() => toggleMatch(m.id)} className="accent-[#1ab394] flex-shrink-0"/>
                  <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-[#999] mb-0.5">Giornata</div>
                      <div className="font-medium text-[#2f4050]">
                        {m.giornata}ª <span className="text-[#999] font-normal">({m.tipo})</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#999] mb-0.5">Data</div>
                      <div className="text-[#2f4050]">
                        {new Date(m.date + 'T12:00:00').toLocaleDateString('it-IT', {
                          day: '2-digit', month: '2-digit', year: 'numeric'
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#999] mb-0.5">Orario</div>
                      <div className="text-[#676a6c]">{m.time || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#999] mb-0.5">Avversario</div>
                      <div className="text-[#676a6c] truncate text-xs">{m.avversario}</div>
                    </div>
                  </div>
                  <span className={clsx('px-2 py-0.5 rounded text-xs font-medium flex-shrink-0',
                    m.casa ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600')}>
                    {m.casa ? 'Casa' : 'Trasf.'}
                  </span>
                </label>
              ))}
            </div>

            <button onClick={() => { setStep(1); setMatches([]); setFile(null); setError('') }}
              className="text-xs text-[#999] hover:text-[#676a6c] hover:underline">
              ← Carica un altro PDF
            </button>
          </div>
        )}

        <div className="flex gap-2 p-4 border-t border-[#e7eaec]">
          <button onClick={onClose}
            className="flex-1 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] py-2 rounded text-sm">
            Annulla
          </button>
          {step === 2 && (
            <button onClick={importMatches} disabled={importing || !selected.length}
              className="flex-1 bg-[#1ab394] hover:bg-[#18a689] disabled:opacity-50 text-white py-2 rounded text-sm font-semibold flex items-center justify-center gap-2">
              {importing
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Importando...</>
                : <><Check size={15}/> Importa {selected.length} partite</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Card partita ──────────────────────────────────────────────
function MatchCard({ match, isAdmin, onEdit, onDelete }) {
  const past = isPast(new Date(match.date))
  return (
    <div className={clsx('bg-white border border-[#e7eaec] rounded shadow-sm p-4 space-y-2', past && 'opacity-60')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('px-2 py-0.5 rounded text-xs font-medium',
            match.casa ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600')}>
            {match.casa ? 'Casa' : 'Trasferta'}
          </span>
          <span className="text-[#2f4050] font-semibold">
            ASD Castelmauro vs {match.avversario}
          </span>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onEdit} className="text-[#999] hover:text-[#1c84c6]"><Edit2 size={14}/></button>
            <button onClick={onDelete} className="text-[#999] hover:text-red-500"><Trash2 size={14}/></button>
          </div>
        )}
      </div>
      <div className="text-[#999] text-sm">
        {format(new Date(match.date), "EEEE d MMMM yyyy", { locale: it })}
        {match.time && ` • ${match.time}`}
      </div>
      {match.campo && (
        <div className="flex items-center gap-1.5 text-sm text-[#999]">
          <MapPin size={13}/>
          <span>{match.campo}</span>
          {match.maps_url && (
            <a href={match.maps_url} target="_blank" rel="noreferrer"
              className="text-[#1ab394] hover:underline flex items-center gap-1 ml-1">
              <ExternalLink size={11}/> Mappa
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ── Componente principale ─────────────────────────────────────
export default function Calendar() {
  const { isAdmin } = useAuth()
  const [matches,     setMatches]     = useState([])
  const [modal,       setModal]       = useState(null)
  const [importModal, setImportModal] = useState(false)
  const [teamSettings,setTeamSettings]= useState(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => { load() }, [])
  useEffect(() => {
    supabase.from('team_settings').select('nome_squadra').single()
      .then(({ data }) => setTeamSettings(data))
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('matches').select('*').order('date')
    setMatches(data || [])
    setLoading(false)
  }

  async function deleteMatch(id) {
    if (!confirm('Eliminare questa partita?')) return
    await supabase.from('matches').delete().eq('id', id)
    toast.success('Partita eliminata')
    load()
  }

  const upcoming = matches.filter(m => !isPast(new Date(m.date)))
  const past     = matches.filter(m =>  isPast(new Date(m.date))).reverse()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="border-b border-[#e7eaec] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2f4050]">Calendario</h1>
          <p className="text-sm text-[#999] mt-1">Partite programmate e risultati</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setImportModal(true)}
              className="flex items-center gap-2 border border-[#e7eaec] hover:bg-gray-50 text-[#676a6c] px-3 py-2 rounded text-sm">
              <Upload size={15}/> Importa PDF FIGC
            </button>
            <button onClick={() => setModal({})}
              className="flex items-center gap-2 bg-[#1ab394] hover:bg-[#18a689] text-white px-4 py-2 rounded text-sm font-semibold">
              <Plus size={16}/> Nuova partita
            </button>
          </div>
        )}
      </div>

      {/* Lista partite */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <>
          {/* Prossime */}
          <div>
            <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">
              Prossime partite
            </h2>
            {upcoming.length === 0 ? (
              <div className="bg-white border border-[#e7eaec] rounded shadow-sm p-6 text-center text-[#999] text-sm">
                Nessuna partita in programma
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map(m => (
                  <MatchCard key={m.id} match={m} isAdmin={isAdmin}
                    onEdit={() => setModal(m)}
                    onDelete={() => deleteMatch(m.id)}/>
                ))}
              </div>
            )}
          </div>

          {/* Passate */}
          {past.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">
                Partite passate
              </h2>
              <div className="space-y-3">
                {past.map(m => (
                  <MatchCard key={m.id} match={m} isAdmin={isAdmin}
                    onEdit={() => setModal(m)}
                    onDelete={() => deleteMatch(m.id)}/>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modali */}
      {modal !== null && (
        <MatchModal match={modal} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}/>
      )}
      {importModal && (
        <ImportPDFModal
          nomeSquadra={teamSettings?.nome_squadra || 'Castelmauro Calcio 1986'}
          onClose={() => setImportModal(false)}
          onSaved={() => { setImportModal(false); load() }}/>
      )}
    </div>
  )
}

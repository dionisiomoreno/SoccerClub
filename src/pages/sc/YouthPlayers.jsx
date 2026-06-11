// ─────────────────────────────────────────────────────────────
// ISTRUZIONI DI INTEGRAZIONE in YouthPlayers.jsx
//
// 1. Aggiungere MONTHS_FULL tra le costanti in cima al file:
// ─────────────────────────────────────────────────────────────
const MONTHS_FULL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

// ─────────────────────────────────────────────────────────────
// 2. Nella funzione PlayerModal, aggiungere il state per la retta:
// ─────────────────────────────────────────────────────────────

// Aggiungere dopo const [parents, setParents] = useState([...]):
const [retta, setRetta] = useState({
  importo: '',
  giorno_scadenza: 10,
  mese_inizio: new Date().getMonth() < 8 ? 9 : new Date().getMonth() + 1,  // default Sept
  anno_inizio: new Date().getFullYear(),
  mese_fine: 6,
  anno_fine: new Date().getMonth() < 8
    ? new Date().getFullYear() + 1
    : new Date().getFullYear() + 1,
  abilitata: false,
})
const [cattDefRetta, setCattDefRetta] = useState(null)   // importo base categoria

// ─────────────────────────────────────────────────────────────
// 3. In useEffect (dopo loadParents), aggiungere:
// ─────────────────────────────────────────────────────────────
useEffect(() => {
  if (isEdit) {
    loadParents()
    loadRetta()
  }
  loadCategoryDefaults()
}, [])

async function loadRetta() {
  const { data } = await supabase.from('rette_config')
    .select('*').eq('youth_player_id', player.id).maybeSingle()
  if (data) setRetta({ ...data, abilitata: true })
}

async function loadCategoryDefaults() {
  const catId = form.category_id || categories[0]?.id
  if (!catId) return
  const { data } = await supabase.from('categories')
    .select('importo_retta, giorno_scadenza_retta').eq('id', catId).single()
  if (data) setCattDefRetta(data)
}

function setR(k, v) { setRetta(r => ({ ...r, [k]: v })) }

// ─────────────────────────────────────────────────────────────
// 4. Nella funzione save(), PRIMA di toast.success, aggiungere:
// ─────────────────────────────────────────────────────────────

// Salva/aggiorna configurazione retta
if (retta.abilitata && retta.importo) {
  const rettaPayload = {
    youth_player_id:  playerId,
    importo:          +retta.importo,
    giorno_scadenza:  +retta.giorno_scadenza,
    mese_inizio:      +retta.mese_inizio,
    anno_inizio:      +retta.anno_inizio,
    mese_fine:        +retta.mese_fine,
    anno_fine:        +retta.anno_fine,
    note:             retta.note || null,
    active:           true,
    updated_at:       new Date().toISOString(),
  }
  await supabase.from('rette_config')
    .upsert([rettaPayload], { onConflict: 'youth_player_id' })
} else if (!retta.abilitata && retta.id) {
  // Disabilita la config esistente
  await supabase.from('rette_config')
    .update({ active: false }).eq('id', retta.id)
}

// ─────────────────────────────────────────────────────────────
// 5. JSX — Sezione retta da inserire nella PlayerModal,
//    DOPO il blocco "Certificato medico" e PRIMA di "Genitori":
// ─────────────────────────────────────────────────────────────
return (
  /* ... tutto il resto della modal ... */
  <div className="border-t border-[#e7eaec] pt-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xs font-semibold text-[#999] uppercase tracking-wide">
        💶 Retta mensile
      </h3>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={retta.abilitata}
          onChange={e => {
            setR('abilitata', e.target.checked)
            // Pre-compila con importo categoria se disponibile
            if (e.target.checked && !retta.importo && cattDefRetta?.importo_retta) {
              setR('importo', cattDefRetta.importo_retta)
              if (cattDefRetta.giorno_scadenza_retta) setR('giorno_scadenza', cattDefRetta.giorno_scadenza_retta)
            }
          }}
          className="accent-[#1ab394]"/>
        <span className="text-sm text-[#676a6c]">Abilita retta mensile</span>
      </label>
    </div>

    {retta.abilitata && (
      <div className="space-y-3">
        {/* Importo e giorno scadenza */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#999] mb-1">
              Importo mensile (€)
              {cattDefRetta?.importo_retta > 0 && (
                <span className="ml-1 text-[#1ab394]">
                  — default categoria: €{cattDefRetta.importo_retta}
                </span>
              )}
            </label>
            <input type="number" min="0" step="0.01"
              value={retta.importo}
              onChange={e => setR('importo', e.target.value)}
              placeholder={cattDefRetta?.importo_retta || '0.00'}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
          <div>
            <label className="block text-xs text-[#999] mb-1">Giorno scadenza</label>
            <input type="number" min="1" max="28"
              value={retta.giorno_scadenza}
              onChange={e => setR('giorno_scadenza', e.target.value)}
              className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
          </div>
        </div>

        {/* Periodo: mese/anno inizio → mese/anno fine */}
        <div>
          <label className="block text-xs text-[#999] mb-2">Periodo di validità</label>
          <div className="grid grid-cols-2 gap-2">
            {/* Inizio */}
            <div className="bg-gray-50 rounded p-3 space-y-2">
              <div className="text-xs font-semibold text-[#676a6c]">Inizio</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-[#999] mb-1">Mese</label>
                  <select value={retta.mese_inizio} onChange={e => setR('mese_inizio', +e.target.value)}
                    className="w-full border border-[#e7eaec] rounded px-2 py-1.5 text-[#676a6c] text-xs outline-none focus:border-[#1ab394]">
                    {MONTHS_FULL.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#999] mb-1">Anno</label>
                  <input type="number" value={retta.anno_inizio}
                    onChange={e => setR('anno_inizio', +e.target.value)}
                    className="w-full border border-[#e7eaec] rounded px-2 py-1.5 text-[#676a6c] text-xs outline-none focus:border-[#1ab394]"/>
                </div>
              </div>
            </div>
            {/* Fine */}
            <div className="bg-gray-50 rounded p-3 space-y-2">
              <div className="text-xs font-semibold text-[#676a6c]">Fine</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-[#999] mb-1">Mese</label>
                  <select value={retta.mese_fine} onChange={e => setR('mese_fine', +e.target.value)}
                    className="w-full border border-[#e7eaec] rounded px-2 py-1.5 text-[#676a6c] text-xs outline-none focus:border-[#1ab394]">
                    {MONTHS_FULL.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#999] mb-1">Anno</label>
                  <input type="number" value={retta.anno_fine}
                    onChange={e => setR('anno_fine', +e.target.value)}
                    className="w-full border border-[#e7eaec] rounded px-2 py-1.5 text-[#676a6c] text-xs outline-none focus:border-[#1ab394]"/>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Riepilogo */}
        {retta.importo > 0 && (
          <div className="bg-[#1ab394]/5 border border-[#1ab394]/20 rounded p-3 text-xs text-[#676a6c] space-y-1">
            <div className="flex justify-between">
              <span>Importo mensile</span>
              <strong className="text-[#1ab394]">€{Number(retta.importo).toFixed(2)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Periodo</span>
              <span>{MONTHS_FULL[retta.mese_inizio-1]} {retta.anno_inizio} → {MONTHS_FULL[retta.mese_fine-1]} {retta.anno_fine}</span>
            </div>
            <div className="flex justify-between">
              <span>Scadenza ogni mese</span>
              <span>il giorno {retta.giorno_scadenza}</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-[#999] mb-1">Note retta</label>
          <input value={retta.note||''} onChange={e => setR('note', e.target.value)}
            placeholder="Es. riduzione fratelli, borsa di studio..."
            className="w-full border border-[#e7eaec] rounded px-3 py-2 text-[#676a6c] text-sm outline-none focus:border-[#1ab394]"/>
        </div>
      </div>
    )}
  </div>
  /* ... resto della modal ... */
)

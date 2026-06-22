import { supabase } from './supabase'

function computeKitPrice(kit) {
  if (kit.modalita_prezzo === 'fisso') return +kit.prezzo_fisso || 0
  return (kit.sc_kit_config_items || []).reduce(
    (s, i) => s + ((+i.warehouse_items?.prezzo || 0) * (+i.quantita || 1)), 0
  )
}

export async function ensureKitPayment({ kit, youthPlayerId, clubId }) {
  const importo = computeKitPrice(kit)
  if (importo <= 0) return // kit gratuito, nessuna quota da generare

  const nomeQuota = `Kit — ${kit.nome}`
  let { data: config } = await supabase.from('payment_configs')
    .select('id').eq('club_id', clubId).eq('nome', nomeQuota).maybeSingle()
  if (!config) {
    const { data: created, error } = await supabase.from('payment_configs').insert([{
      club_id: clubId, nome: nomeQuota, tipo: 'kit', importo,
      category_id: kit.category_id || null, active: true,
    }]).select('id').single()
    if (error) { console.error('Errore creazione quota kit:', error.message); return }
    config = created
  }

  // Evita di duplicare il pagamento se esiste già per questo atleta+kit
  const { data: existing } = await supabase.from('payments')
    .select('id').eq('payment_config_id', config.id).eq('youth_player_id', youthPlayerId).maybeSingle()
  if (existing) return

  const now = new Date()
  const scadenza = new Date(now); scadenza.setDate(scadenza.getDate() + 15)
  await supabase.from('payments').insert([{
    club_id: clubId,
    youth_player_id: youthPlayerId,
    payment_config_id: config.id,
    mese: now.getMonth() + 1,
    anno: now.getFullYear(),
    importo_dovuto: importo,
    importo_pagato: 0,
    data_scadenza: scadenza.toISOString().split('T')[0],
    stato: 'da_pagare',
  }])
}

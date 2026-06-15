import { supabase } from './supabase'

const MONTHS = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
]

/**
 * Registra automaticamente un cedolino come uscita in contabilità
 * @param {object} opts
 * @param {string} opts.club_id
 * @param {string} opts.created_by  - id utente che genera
 * @param {string} opts.modulo      - 'ps' | 'sc'
 * @param {string} opts.tipo        - 'calciatore' | 'mister_ps' | 'mister_sc'
 * @param {string} opts.cognome
 * @param {string} opts.nome
 * @param {number} opts.importo     - netto totale
 * @param {number} opts.month       - 1-12
 * @param {number} opts.year
 * @param {string} opts.riferimento - es. "CED-12345"
 */
export async function registraCedolinoInContabilita(opts) {
  const categorie = {
    calciatore: 'Compenso calciatori',
    mister_ps:  'Compenso mister',
    mister_sc:  'Compenso mister',
  }

  const descrizioni = {
    calciatore: `Cedolino ${opts.cognome} ${opts.nome} — ${MONTHS[opts.month - 1]} ${opts.year}`,
    mister_ps:  `Cedolino Mister PS ${opts.cognome} ${opts.nome} — ${MONTHS[opts.month - 1]} ${opts.year}`,
    mister_sc:  `Cedolino Mister SC ${opts.cognome} ${opts.nome} — ${MONTHS[opts.month - 1]} ${opts.year}`,
  }

  const data = new Date(opts.year, opts.month - 1, 1)
    .toISOString().split('T')[0]

  const { error } = await supabase.from('accounting_entries').insert([{
    club_id:          opts.club_id,
    data,
    tipo:             'uscita',
    categoria:        categorie[opts.tipo],
    descrizione:      descrizioni[opts.tipo],
    importo:          opts.importo,
    metodo_pagamento: 'bonifico',
    riferimento:      opts.riferimento,
    fonte:            'cedolino',
    modulo:           opts.modulo,
    created_by:       opts.created_by,
    note:             'Generato automaticamente dal cedolino',
  }])

  if (error) {
    console.error('Errore registrazione contabilità:', error.message)
    return false
  }
  return true
}

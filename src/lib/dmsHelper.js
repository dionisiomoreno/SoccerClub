import { supabase } from './supabase'

const DEFAULT_PLAYER_SUBFOLDERS = [
  { nome: 'Anagrafica e Tesseramento', icona: '📋' },
  { nome: 'Documenti Sanitari',        icona: '🏥' },
  { nome: 'Varie',                     icona: '📁' },
]

async function ensureRootFolder(clubId, modulo, nome, icona) {
  const { data: existing } = await supabase.from('dms_folders')
    .select('id').eq('club_id', clubId).eq('modulo', modulo)
    .is('parent_id', null).eq('nome', nome).maybeSingle()
  if (existing) return existing.id
  const { data: created, error } = await supabase.from('dms_folders').insert([{
    club_id: clubId, modulo, nome, icona, permesso: 'admin_only',
    is_system: true, ordine: 0, parent_id: null,
  }]).select('id').single()
  if (error) { console.error('Errore creazione cartella radice:', error.message); return null }
  return created.id
}

export async function ensureDmsRootFolders(clubId, modulo) {
  const societaId   = await ensureRootFolder(clubId, modulo, 'Società', '🏛️')
  const misterId     = await ensureRootFolder(clubId, modulo, 'Mister', '👔')
  const calciatoriId = await ensureRootFolder(clubId, modulo, modulo === 'sc' ? 'Atleti' : 'Calciatori', '⚽')
  return { societaId, misterId, calciatoriId }
}

// Chiamare dopo aver creato un nuovo profilo mister (PS o SC)
export async function createMisterFolder({ clubId, modulo, misterId, nome, cognome }) {
  const { misterId: parentId } = await ensureDmsRootFolders(clubId, modulo)
  if (!parentId) return null
  const { data: existing } = await supabase.from('dms_folders')
    .select('id').eq('linked_profile_id', misterId).eq('modulo', modulo).maybeSingle()
  if (existing) return existing.id
  const { data: created, error } = await supabase.from('dms_folders').insert([{
    club_id: clubId, modulo, parent_id: parentId,
    nome: `${cognome} ${nome}`, icona: '👤', permesso: 'mister',
    linked_profile_id: misterId, is_system: true, ordine: 0,
  }]).select('id').single()
  if (error) { console.error('Errore creazione cartella mister:', error.message); return null }
  return created.id
}

// Chiamare dopo aver creato un nuovo calciatore PS (profileId) o atleta SC (youthPlayerId)
async function ensureCategoryFolder(clubId, modulo, parentId, categoryId) {
  if (!categoryId) return parentId
  const { data: cat } = await supabase.from('categories').select('nome,colore,ordine').eq('id', categoryId).maybeSingle()
  if (!cat) return parentId
  const { data: existing } = await supabase.from('dms_folders')
    .select('id').eq('club_id', clubId).eq('modulo', modulo)
    .eq('parent_id', parentId).eq('nome', cat.nome).maybeSingle()
  if (existing) return existing.id
  const { data: created, error } = await supabase.from('dms_folders').insert([{
    club_id: clubId, modulo, parent_id: parentId,
    nome: cat.nome, icona: '📁', colore: cat.colore, permesso: 'players_parent',
    is_system: true, ordine: cat.ordine || 0,
  }]).select('id').single()
  if (error) { console.error('Errore creazione cartella categoria:', error.message); return parentId }
  return created.id
}

export async function createPlayerFolder({ clubId, modulo, profileId = null, youthPlayerId = null, categoryId = null, nome, cognome }) {
  let { calciatoriId: parentId } = await ensureDmsRootFolders(clubId, modulo)
  if (!parentId) return null

  // SC: aggiunge il livello categoria tra "Atleti" e la cartella personale
  if (modulo === 'sc' && categoryId) {
    parentId = await ensureCategoryFolder(clubId, modulo, parentId, categoryId)
  }

  let existingQuery = supabase.from('dms_folders').select('id').eq('modulo', modulo)
  existingQuery = profileId
    ? existingQuery.eq('linked_profile_id', profileId)
    : existingQuery.eq('linked_youth_player_id', youthPlayerId)
  const { data: existing } = await existingQuery.maybeSingle()
  if (existing) return existing.id

  const { data: created, error } = await supabase.from('dms_folders').insert([{
    club_id: clubId, modulo, parent_id: parentId,
    nome: `${cognome} ${nome}`, icona: '👤', permesso: 'players_parent',
    linked_profile_id: profileId, linked_youth_player_id: youthPlayerId,
    is_system: true, ordine: 0,
  }]).select('id').single()
  if (error) { console.error('Errore creazione cartella atleta:', error.message); return null }

  const subInserts = DEFAULT_PLAYER_SUBFOLDERS.map(s => ({
    club_id: clubId, modulo, parent_id: created.id,
    nome: s.nome, icona: s.icona, permesso: 'players_parent',
    linked_profile_id: profileId, linked_youth_player_id: youthPlayerId,
    is_system: false, ordine: 0,
  }))
  await supabase.from('dms_folders').insert(subInserts)
  return created.id
}

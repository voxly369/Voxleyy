import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { normalizeCollectionName, validateCollectionName } from './collectionName.ts'
import type { LibraryFailure } from './listLibrary.ts'

function fail(message: string, error?: { code?: string; status?: number }): LibraryFailure {
  return { ok: false, error: { code: 'unavailable', message, ...providerFields(error) } }
}

export async function createCollection(name: string): Promise<{ ok: true; id: string } | LibraryFailure> {
  const err = validateCollectionName(name)
  if (err) return fail(err)
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return { ok: false, error: { code: 'forbidden', message: 'Sign in to create a collection.' } }
  const { data, error } = await supabase
    .from('reader_collections')
    .insert({ user_id: userId, name: normalizeCollectionName(name) })
    .select('id')
    .single()
  if (error) return fail('We could not create the collection.', error)
  return { ok: true, id: data.id }
}

export async function renameCollection(id: string, name: string): Promise<{ ok: true } | LibraryFailure> {
  const err = validateCollectionName(name)
  if (err) return fail(err)
  const { error } = await supabase
    .from('reader_collections')
    .update({ name: normalizeCollectionName(name) })
    .eq('id', id)
  if (error) return fail('We could not rename the collection.', error)
  return { ok: true }
}

export async function deleteCollection(id: string): Promise<{ ok: true } | LibraryFailure> {
  const { error } = await supabase.from('reader_collections').delete().eq('id', id)
  if (error) return fail('We could not delete the collection.', error)
  return { ok: true }
}

export async function addToCollection(collectionId: string, creationId: string): Promise<{ ok: true } | LibraryFailure> {
  const { error } = await supabase.from('reader_collection_items').insert({ collection_id: collectionId, creation_id: creationId })
  if (error?.code === '23505') return { ok: true }
  if (error) return fail('We could not add this to the collection.', error)
  return { ok: true }
}

export async function removeFromCollection(collectionId: string, creationId: string): Promise<{ ok: true } | LibraryFailure> {
  const { error } = await supabase
    .from('reader_collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('creation_id', creationId)
  if (error) return fail('We could not remove this from the collection.', error)
  return { ok: true }
}

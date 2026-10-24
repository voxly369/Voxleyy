import { supabase } from '../supabaseClient.ts'

export type PendingStorageRow = {
  bucketId: string
  objectPath: string
  queuedAt: string
}

export async function founderPendingStorageCleanupCount(): Promise<number> {
  const { data, error } = await supabase.rpc('founder_pending_storage_cleanup_count')
  if (error) return 0
  return typeof data === 'number' ? data : Number(data) || 0
}

export async function founderListPendingStorageQueue(): Promise<
  { ok: true; rows: PendingStorageRow[] } | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc('founder_list_deletion_storage_queue', { p_limit: 500 })
  if (error) return { ok: false, message: error.message ?? 'Could not load queue.' }
  const rows = (Array.isArray(data) ? data : []).flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const row = raw as Record<string, unknown>
    const bucketId = typeof row.bucket_id === 'string' ? row.bucket_id : null
    const objectPath = typeof row.object_path === 'string' ? row.object_path : null
    const queuedAt = typeof row.queued_at === 'string' ? row.queued_at : ''
    if (!bucketId || !objectPath) return []
    return [{ bucketId, objectPath, queuedAt }]
  })
  return { ok: true, rows }
}

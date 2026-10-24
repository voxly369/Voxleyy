import { supabase } from '../supabaseClient.ts'

export type CreatorDashFailure = { ok: false; error: { message: string } }
export type CreatorDashSuccess<T> = { ok: true; data: T }
export type CreatorDashResult<T> = CreatorDashSuccess<T> | CreatorDashFailure

function fail(message: string): CreatorDashFailure {
  return { ok: false, error: { message } }
}

export async function getCreatorDashboardOverview(from: string, to: string): Promise<CreatorDashResult<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc('get_creator_dashboard_overview', { p_from: from, p_to: to })
  if (error) return fail(error.message)
  return { ok: true, data: (data ?? {}) as Record<string, unknown> }
}

export async function getCreatorDashboardTopPosts(window: string): Promise<CreatorDashResult<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc('get_creator_dashboard_top_posts', { p_window: window, p_limit: 25 })
  if (error) return fail(error.message)
  return { ok: true, data: (data ?? {}) as Record<string, unknown> }
}

export async function getCreatorDashboardAudience(from: string, to: string): Promise<CreatorDashResult<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc('get_creator_dashboard_audience', { p_from: from, p_to: to })
  if (error) return fail(error.message)
  return { ok: true, data: (data ?? {}) as Record<string, unknown> }
}

export async function getCreatorDashboardWip(): Promise<CreatorDashResult<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc('get_creator_dashboard_wip')
  if (error) return fail(error.message)
  return { ok: true, data: (data ?? {}) as Record<string, unknown> }
}

export async function getCreatorDashboardBooks(): Promise<CreatorDashResult<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc('get_creator_dashboard_books')
  if (error) return fail(error.message)
  return { ok: true, data: (data ?? {}) as Record<string, unknown> }
}

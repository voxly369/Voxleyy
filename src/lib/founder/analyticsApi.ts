import { supabase } from '../supabaseClient.ts'

export type FounderAnalyticsFailure = { ok: false; error: { message: string } }
export type FounderAnalyticsSuccess<T> = { ok: true; data: T }
export type FounderAnalyticsResult<T> = FounderAnalyticsSuccess<T> | FounderAnalyticsFailure

function fail(message: string): FounderAnalyticsFailure {
  return { ok: false, error: { message } }
}

export async function founderPrepareMetrics(from: string, to: string): Promise<FounderAnalyticsResult<unknown>> {
  const { data, error } = await supabase.rpc('founder_prepare_daily_metrics', { p_from: from, p_to: to })
  if (error) return fail(error.message)
  return { ok: true, data }
}

export async function founderAnalyticsOverview(
  from: string,
  to: string,
  country: string | null,
  role: string | null,
): Promise<FounderAnalyticsResult<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc('founder_analytics_overview', {
    p_from: from,
    p_to: to,
    p_country: country ?? undefined,
    p_role: role ?? undefined,
  })
  if (error) return fail(error.message)
  return { ok: true, data: (data ?? {}) as Record<string, unknown> }
}

export async function founderAnalyticsRetention(
  from: string,
  to: string,
  country: string | null,
  role: string | null,
): Promise<FounderAnalyticsResult<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc('founder_analytics_retention', {
    p_from: from,
    p_to: to,
    p_country: country ?? undefined,
    p_role: role ?? undefined,
  })
  if (error) return fail(error.message)
  return { ok: true, data: (data ?? {}) as Record<string, unknown> }
}

export async function founderAnalyticsTopContent(
  from: string,
  to: string,
  window: string,
  type: string | null,
  sort: string,
): Promise<FounderAnalyticsResult<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc('founder_analytics_top_content', {
    p_from: from,
    p_to: to,
    p_window: window,
    p_type: type ?? undefined,
    p_sort: sort,
    p_limit: 25,
  })
  if (error) return fail(error.message)
  return { ok: true, data: (data ?? {}) as Record<string, unknown> }
}

export async function founderAnalyticsTopCreators(
  from: string,
  to: string,
  country: string | null,
): Promise<FounderAnalyticsResult<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc('founder_analytics_top_creators', {
    p_from: from,
    p_to: to,
    p_country: country ?? undefined,
    p_limit: 25,
  })
  if (error) return fail(error.message)
  return { ok: true, data: (data ?? {}) as Record<string, unknown> }
}

export async function founderAnalyticsPlatformHealth(
  from: string,
  to: string,
): Promise<FounderAnalyticsResult<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc('founder_analytics_platform_health', { p_from: from, p_to: to })
  if (error) return fail(error.message)
  return { ok: true, data: (data ?? {}) as Record<string, unknown> }
}

export async function founderAnalyticsAudience(
  country: string | null,
  role: string | null,
): Promise<FounderAnalyticsResult<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc('founder_analytics_audience', {
    p_country: country ?? undefined,
    p_role: role ?? undefined,
  })
  if (error) return fail(error.message)
  return { ok: true, data: (data ?? {}) as Record<string, unknown> }
}

export async function founderAnalyticsFollowing(
  from: string,
  to: string,
): Promise<FounderAnalyticsResult<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc('founder_analytics_following', { p_from: from, p_to: to, p_limit: 25 })
  if (error) return fail(error.message)
  return { ok: true, data: (data ?? {}) as Record<string, unknown> }
}

export async function founderAnalyticsEngagement(
  from: string,
  to: string,
): Promise<FounderAnalyticsResult<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc('founder_analytics_engagement', { p_from: from, p_to: to })
  if (error) return fail(error.message)
  return { ok: true, data: (data ?? {}) as Record<string, unknown> }
}

export async function founderAnalyticsExport(
  section: string,
  from: string,
  to: string,
  country: string | null,
  role: string | null,
): Promise<FounderAnalyticsResult<{ rows: unknown; row_count: number }>> {
  const { data, error } = await supabase.rpc('founder_analytics_export', {
    p_section: section,
    p_from: from,
    p_to: to,
    p_country: country ?? undefined,
    p_role: role ?? undefined,
  })
  if (error) return fail(error.message)
  const payload = (data ?? {}) as { rows?: unknown; row_count?: number }
  return { ok: true, data: { rows: payload.rows, row_count: Number(payload.row_count ?? 0) } }
}

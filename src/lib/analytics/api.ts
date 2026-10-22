import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import type { AnalyticsBestPiece, AnalyticsFailure, AnalyticsResult, CreatorAnalytics } from './types.ts'

function fail(
  code: AnalyticsFailure['error']['code'],
  message: string,
  error?: { code?: string; status?: number },
): AnalyticsFailure {
  return { ok: false, error: { code, message, ...providerFields(error) } }
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function windowTotals(row: Record<string, unknown>, window: '7d' | '30d') {
  const nested = row[window === '7d' ? 'last_7' : 'last_30'] ?? row[window === '7d' ? 'last7' : 'last30']
  if (nested && typeof nested === 'object') {
    const n = nested as Record<string, unknown>
    return {
      views: count(n.views),
      likes: count(n.likes),
      saves: count(n.saves),
      comments: count(n.comments),
      followers: count(n.followers),
    }
  }
  const suffix = window
  return {
    views: count(row[`views_${suffix}`]),
    likes: count(row[`likes_${suffix}`]),
    saves: count(row[`saves_${suffix}`]),
    comments: count(row[`comments_${suffix}`]),
    followers: count(row[`followers_${suffix}`]),
  }
}

function parseBestPiece(value: unknown): AnalyticsBestPiece {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = text(row.id) ?? text(row.creation_id)
  if (!id) return null
  return {
    id,
    title: text(row.title),
    views: count(row.views),
    likes: count(row.likes),
  }
}

function parseAnalytics(payload: unknown): CreatorAnalytics {
  const row = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const dailyRaw = row.daily
  const daily =
    Array.isArray(dailyRaw) &&
    dailyRaw.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return []
      const d = entry as Record<string, unknown>
      const date = text(d.date)
      if (!date) return []
      return [{ date, views: count(d.views), likes: count(d.likes) }]
    })

  return {
    last7: windowTotals(row, '7d'),
    last30: windowTotals(row, '30d'),
    bestPiece: parseBestPiece(row.best_piece ?? row.bestPiece),
    daily: daily && daily.length > 0 ? daily : undefined,
    salesPlaceholder: 'Sales reporting arrives with wallet checkout.',
    watchTimePlaceholder: 'Watch time tracking arrives with video playback metrics.',
  }
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export async function getCreatorAnalytics(): Promise<AnalyticsResult<CreatorAnalytics>> {
  const userId = await currentUserId()
  if (!userId) return fail('forbidden', 'Sign in to view analytics.')
  const { data, error } = await supabase.rpc('get_creator_analytics')
  if (error) return fail('unavailable', 'We could not load analytics. Try again.', error)
  return { ok: true, data: parseAnalytics(data) }
}

export type AnalyticsWindowTotals = {
  views: number
  likes: number
  saves: number
  comments: number
  followers: number
}

export type AnalyticsBestPiece = {
  id: string
  title: string | null
  views: number
  likes: number
} | null

export type CreatorAnalytics = {
  last7: AnalyticsWindowTotals
  last30: AnalyticsWindowTotals
  bestPiece: AnalyticsBestPiece
  /** Optional daily series for charts (date YYYY-MM-DD). */
  daily?: { date: string; views: number; likes: number }[]
  salesPlaceholder?: string
  watchTimePlaceholder?: string
}

export type AnalyticsFailure = {
  ok: false
  error: {
    code: 'forbidden' | 'unavailable'
    message: string
    providerCode?: string
    providerStatus?: number
  }
}

export type AnalyticsResult<T> = { ok: true; data: T } | AnalyticsFailure

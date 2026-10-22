import type { AnalyticsWindowTotals, CreatorAnalytics } from './types.ts'

export function emptyTotals(): AnalyticsWindowTotals {
  return { views: 0, likes: 0, saves: 0, comments: 0, followers: 0 }
}

export function sumTotals(a: AnalyticsWindowTotals, b: AnalyticsWindowTotals): AnalyticsWindowTotals {
  return {
    views: a.views + b.views,
    likes: a.likes + b.likes,
    saves: a.saves + b.saves,
    comments: a.comments + b.comments,
    followers: a.followers + b.followers,
  }
}

export function analyticsHasActivity(data: CreatorAnalytics): boolean {
  const t = sumTotals(data.last7, emptyTotals())
  return (
    t.views > 0 ||
    t.likes > 0 ||
    t.saves > 0 ||
    t.comments > 0 ||
    t.followers > 0 ||
    data.last30.views > 0 ||
    Boolean(data.bestPiece)
  )
}

export function chartSeries(data: CreatorAnalytics): { label: string; value: number }[] {
  if (data.daily && data.daily.length > 0) {
    return data.daily.map((row) => ({ label: row.date.slice(5), value: row.views }))
  }
  return [
    { label: '7d views', value: data.last7.views },
    { label: '30d views', value: data.last30.views },
    { label: '7d likes', value: data.last7.likes },
    { label: '30d likes', value: data.last30.likes },
  ]
}

export function tableRows(data: CreatorAnalytics): { metric: string; seven: number; thirty: number }[] {
  return [
    { metric: 'Views', seven: data.last7.views, thirty: data.last30.views },
    { metric: 'Likes', seven: data.last7.likes, thirty: data.last30.likes },
    { metric: 'Saves', seven: data.last7.saves, thirty: data.last30.saves },
    { metric: 'Comments', seven: data.last7.comments, thirty: data.last30.comments },
    { metric: 'Followers', seven: data.last7.followers, thirty: data.last30.followers },
  ]
}

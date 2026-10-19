export function feedOfflineMessage(): string {
  return 'You are offline. Reconnect to refresh your feed.'
}

export function isBrowserOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

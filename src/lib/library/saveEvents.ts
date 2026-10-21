const TARGET = typeof window !== 'undefined' ? window : null

export function notifyLibrarySavesChanged(): void {
  TARGET?.dispatchEvent(new CustomEvent('voxly:library-saves'))
}

export function onLibrarySavesChanged(listener: () => void): () => void {
  if (!TARGET) return () => {}
  TARGET.addEventListener('voxly:library-saves', listener)
  return () => TARGET.removeEventListener('voxly:library-saves', listener)
}

import type { CoverDesignDocument, CoverLayer } from './designSchema.ts'

export const COVER_SAFE_INSET = 120
export const COVER_GRID_STEP = 40

export function cloneDesign(doc: CoverDesignDocument): CoverDesignDocument {
  return structuredClone(doc)
}

export function updateLayer(doc: CoverDesignDocument, layerId: string, patch: Partial<CoverLayer>): CoverDesignDocument {
  return {
    ...doc,
    layers: doc.layers.map((layer) => (layer.id === layerId ? ({ ...layer, ...patch } as CoverLayer) : layer)),
  }
}

export function updateLayers(
  doc: CoverDesignDocument,
  layerIds: string[],
  patch: Partial<CoverLayer>,
): CoverDesignDocument {
  const set = new Set(layerIds)
  return {
    ...doc,
    layers: doc.layers.map((layer) => (set.has(layer.id) ? ({ ...layer, ...patch } as CoverLayer) : layer)),
  }
}

export function removeLayers(doc: CoverDesignDocument, layerIds: string[]): CoverDesignDocument {
  const set = new Set(layerIds)
  return { ...doc, layers: doc.layers.filter((l) => !set.has(l.id)) }
}

export function moveLayer(doc: CoverDesignDocument, layerId: string, direction: 'up' | 'down' | 'front' | 'back'): CoverDesignDocument {
  const index = doc.layers.findIndex((l) => l.id === layerId)
  if (index === -1) return doc
  const layers = [...doc.layers]
  const [item] = layers.splice(index, 1)
  if (!item) return doc
  if (direction === 'front') layers.push(item)
  else if (direction === 'back') layers.unshift(item)
  else if (direction === 'up') layers.splice(Math.min(layers.length, index + 1), 0, item)
  else layers.splice(Math.max(0, index - 1), 0, item)
  return { ...doc, layers }
}

export function toggleSelection(selected: string[], layerId: string, additive: boolean): string[] {
  if (!additive) return [layerId]
  if (selected.includes(layerId)) return selected.filter((id) => id !== layerId)
  return [...selected, layerId]
}

export function newLayerId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function groupSelectedLayers(doc: CoverDesignDocument, layerIds: string[]): CoverDesignDocument {
  if (layerIds.length < 2) return doc
  const groupId = newLayerId('group')
  const set = new Set(layerIds)
  return {
    ...doc,
    layers: doc.layers.map((layer) => (set.has(layer.id) ? ({ ...layer, groupId } as CoverLayer) : layer)),
  }
}

export function ungroupSelectedLayers(doc: CoverDesignDocument, layerIds: string[]): CoverDesignDocument {
  const set = new Set(layerIds)
  return {
    ...doc,
    layers: doc.layers.map((layer) => (set.has(layer.id) ? ({ ...layer, groupId: null } as CoverLayer) : layer)),
  }
}

export type LayerAlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

export function alignSelectedLayers(
  doc: CoverDesignDocument,
  layerIds: string[],
  mode: LayerAlignMode,
): CoverDesignDocument {
  if (!layerIds.length) return doc
  const selected = doc.layers.filter((l) => layerIds.includes(l.id))
  if (!selected.length) return doc
  const minX = Math.min(...selected.map((l) => l.x))
  const maxX = Math.max(...selected.map((l) => l.x + l.width))
  const minY = Math.min(...selected.map((l) => l.y))
  const maxY = Math.max(...selected.map((l) => l.y + l.height))
  const set = new Set(layerIds)
  return {
    ...doc,
    layers: doc.layers.map((layer) => {
      if (!set.has(layer.id)) return layer
      if (mode === 'left') return { ...layer, x: minX }
      if (mode === 'right') return { ...layer, x: maxX - layer.width }
      if (mode === 'center') return { ...layer, x: Math.round((minX + maxX) / 2 - layer.width / 2) }
      if (mode === 'top') return { ...layer, y: minY }
      if (mode === 'bottom') return { ...layer, y: maxY - layer.height }
      if (mode === 'middle') return { ...layer, y: Math.round((minY + maxY) / 2 - layer.height / 2) }
      return layer
    }),
  }
}

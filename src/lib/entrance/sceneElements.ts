/** Moving element budget for the entrance scene (performance). */

export const SCENE_ELEMENT_CAP_PHONE = 18
export const SCENE_ELEMENT_CAP_WIDE = 30
export const SCENE_WIDE_MIN_WIDTH = 768

export function sceneElementCap(viewportWidth: number): number {
  return viewportWidth >= SCENE_WIDE_MIN_WIDTH ? SCENE_ELEMENT_CAP_WIDE : SCENE_ELEMENT_CAP_PHONE
}

export type SceneLayerItem = {
  id: string
  kind: 'page' | 'quill' | 'book' | 'mic' | 'notebook' | 'star' | 'sticker'
  depth: number
  x: number
  y: number
  scale: number
  delay: number
}

export function buildSceneItems(cap: number): SceneLayerItem[] {
  const kinds: SceneLayerItem['kind'][] = ['page', 'quill', 'book', 'mic', 'notebook', 'star', 'sticker']
  const items: SceneLayerItem[] = []
  for (let i = 0; i < cap; i += 1) {
    const kind = kinds[i % kinds.length]!
    items.push({
      id: `s-${i}`,
      kind,
      depth: 0.2 + (i % 5) * 0.15,
      x: (i * 37) % 100,
      y: (i * 53) % 100,
      scale: 0.6 + (i % 4) * 0.12,
      delay: (i % 7) * 0.4,
    })
  }
  return items
}

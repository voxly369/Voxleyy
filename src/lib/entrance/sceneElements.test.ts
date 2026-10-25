import { describe, expect, it } from 'vitest'
import { buildSceneItems, sceneElementCap, SCENE_ELEMENT_CAP_PHONE, SCENE_ELEMENT_CAP_WIDE } from './sceneElements.ts'

describe('sceneElements', () => {
  it('caps elements by viewport width', () => {
    expect(sceneElementCap(375)).toBe(SCENE_ELEMENT_CAP_PHONE)
    expect(sceneElementCap(1024)).toBe(SCENE_ELEMENT_CAP_WIDE)
  })

  it('builds at most cap items', () => {
    expect(buildSceneItems(18)).toHaveLength(18)
    expect(buildSceneItems(30)).toHaveLength(30)
  })
})

import type { Page } from '@playwright/test'

export type FrameMetrics = {
  samples: number[]
  averageMs: number
  worstMs: number
}

export async function sampleFrameTimes(page: Page, durationMs: number): Promise<FrameMetrics> {
  const samples = await page.evaluate(async (duration) => {
    const deltas: number[] = []
    let last = performance.now()
    const end = last + duration
    while (performance.now() < end) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame((now) => {
          deltas.push(now - last)
          last = now
          resolve()
        })
      })
    }
    return deltas.filter((d) => d > 0 && d < 500)
  }, durationMs)
  const averageMs = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0
  const worstMs = samples.length ? Math.max(...samples) : 0
  return { samples, averageMs, worstMs }
}

export async function dismissEntrance(page: Page, viewportWidth: number) {
  if (viewportWidth >= 768) {
    await page.getByTestId('entrance-enter-button').click()
    return
  }
  await performEntranceSwipe(page)
}

export async function countMovingEntranceElements(page: Page): Promise<number> {
  return page.evaluate(() => {
    const floats = document.querySelectorAll('[data-testid="entrance-scene"] .entrance-float')
    let moving = 0
    for (const node of floats) {
      const style = getComputedStyle(node)
      if (style.animationName && style.animationName !== 'none') moving += 1
    }
    return moving
  })
}

export async function performEntranceSwipe(page: Page) {
  const panel = page.getByTestId('entrance-screen')
  const box = await panel.boundingBox()
  if (!box) throw new Error('entrance panel missing bounding box')
  const startX = box.x + 40
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 280, startY, { steps: 16 })
  await page.mouse.up()
}

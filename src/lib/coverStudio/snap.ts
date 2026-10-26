export const SNAP_THRESHOLD = 8

export type SnapGuide = { orientation: 'h' | 'v'; position: number }

export function snapValue(value: number, targets: number[], threshold = SNAP_THRESHOLD): { value: number; guide: SnapGuide | null } {
  let best = value
  let bestDist = threshold + 1
  let guide: SnapGuide | null = null
  for (const t of targets) {
    const d = Math.abs(value - t)
    if (d <= threshold && d < bestDist) {
      best = t
      bestDist = d
      guide = null
    }
  }
  return { value: best, guide }
}

export function snapRectCenter(
  cx: number,
  cy: number,
  canvasW: number,
  canvasH: number,
  otherCenters: { x: number; y: number }[],
): { x: number; y: number; guides: SnapGuide[] } {
  const guides: SnapGuide[] = []
  let x = cx
  let y = cy
  const xTargets = [canvasW / 2, ...otherCenters.map((c) => c.x)]
  const yTargets = [canvasH / 2, ...otherCenters.map((c) => c.y)]
  const prevX = cx
  const prevY = cy
  const sx = snapValue(cx, xTargets)
  x = sx.value
  if (x !== prevX) {
    if (Math.abs(x - canvasW / 2) <= SNAP_THRESHOLD) guides.push({ orientation: 'v', position: canvasW / 2 })
    for (const c of otherCenters) {
      if (Math.abs(x - c.x) <= SNAP_THRESHOLD) guides.push({ orientation: 'v', position: c.x })
    }
  }
  const sy = snapValue(cy, yTargets)
  y = sy.value
  if (y !== prevY) {
    if (Math.abs(y - canvasH / 2) <= SNAP_THRESHOLD) guides.push({ orientation: 'h', position: canvasH / 2 })
    for (const c of otherCenters) {
      if (Math.abs(y - c.y) <= SNAP_THRESHOLD) guides.push({ orientation: 'h', position: c.y })
    }
  }
  return { x, y, guides }
}

export function nudgePosition(x: number, y: number, key: string, shift: boolean): { x: number; y: number } {
  const step = shift ? 10 : 1
  if (key === 'ArrowLeft') return { x: x - step, y }
  if (key === 'ArrowRight') return { x: x + step, y }
  if (key === 'ArrowUp') return { x, y: y - step }
  if (key === 'ArrowDown') return { x, y: y + step }
  return { x, y }
}

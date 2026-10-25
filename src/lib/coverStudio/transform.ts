export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function resizeWithAspect(
  _width: number,
  height: number,
  nextWidth: number,
  lockAspect: boolean,
  aspect: number,
): { width: number; height: number } {
  if (!lockAspect) return { width: Math.max(1, nextWidth), height }
  const w = Math.max(1, nextWidth)
  return { width: w, height: Math.max(1, w / aspect) }
}

export function rotatePoint(x: number, y: number, cx: number, cy: number, degrees: number): { x: number; y: number } {
  const rad = (degrees * Math.PI) / 180
  const dx = x - cx
  const dy = y - cy
  return {
    x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  }
}

export function layerBoundsCenter(x: number, y: number, width: number, height: number): { cx: number; cy: number } {
  return { cx: x + width / 2, cy: y + height / 2 }
}

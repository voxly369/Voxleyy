/** @deprecated Use EntranceAnimatedScene — kept for import stability in older tests. */
export { entrancePaletteForHour } from './entrancePalette.ts'
export type { EntrancePalette } from './entrancePalette.ts'

import { EntranceAnimatedScene } from './EntranceAnimatedScene.tsx'
import type { EntrancePalette } from './entrancePalette.ts'

type EntranceIllustrationProps = {
  reducedMotion: boolean
  palette: EntrancePalette
}

export function EntranceIllustration({ reducedMotion, palette }: EntranceIllustrationProps) {
  return <EntranceAnimatedScene reducedMotion={reducedMotion} palette={palette} parallax={0} active={!reducedMotion} />
}

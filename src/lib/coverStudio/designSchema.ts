import { z } from 'zod'

export const COVER_DESIGN_WIDTH = 1600
export const COVER_DESIGN_HEIGHT = 2400
export const COVER_DESIGN_JSON_MAX_BYTES = 512_000

const shadowSchema = z.object({
  color: z.string(),
  blur: z.number().min(0).max(100),
  offsetX: z.number(),
  offsetY: z.number(),
})

const textLayerSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.literal('text'),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
  locked: z.boolean(),
  hidden: z.boolean(),
  text: z.string().max(2000),
  fontFamily: z.string().max(80),
  fontSize: z.number().min(8).max(400),
  fontWeight: z.number().min(100).max(900),
  fontStyle: z.enum(['normal', 'italic']),
  color: z.string(),
  align: z.enum(['left', 'center', 'right']),
  lineHeight: z.number().min(0.8).max(3),
  letterSpacing: z.number().min(-20).max(80),
  uppercase: z.boolean(),
  shadow: shadowSchema.nullable(),
  outline: z.object({ color: z.string(), width: z.number().min(0).max(20) }).nullable(),
  highlight: z.object({ color: z.string(), padding: z.number().min(0).max(40) }).nullable(),
  groupId: z.string().max(64).nullable().optional(),
})

const shapeLayerSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(['rect', 'roundRect', 'circle', 'line', 'frame']),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
  locked: z.boolean(),
  hidden: z.boolean(),
  fill: z.string().nullable(),
  stroke: z.string().nullable(),
  strokeWidth: z.number().min(0).max(40),
  cornerRadius: z.number().min(0).max(200).optional(),
  groupId: z.string().max(64).nullable().optional(),
})

const imageLayerSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.literal('image'),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
  locked: z.boolean(),
  hidden: z.boolean(),
  storageKey: z.string().max(512),
  fit: z.enum(['fill', 'contain', 'cover']),
  flipX: z.boolean(),
  flipY: z.boolean(),
  brightness: z.number().min(0).max(200),
  contrast: z.number().min(0).max(200),
  saturation: z.number().min(0).max(200),
  blur: z.number().min(0).max(20),
  overlayColor: z.string().nullable(),
  groupId: z.string().max(64).nullable().optional(),
})

const stickerLayerSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.literal('sticker'),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
  locked: z.boolean(),
  hidden: z.boolean(),
  stickerId: z.string().max(64),
  groupId: z.string().max(64).nullable().optional(),
})

const backgroundSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('solid'), color: z.string() }),
  z.object({
    type: z.literal('gradient'),
    angle: z.number(),
    stops: z.array(z.object({ offset: z.number().min(0).max(1), color: z.string() })).min(2).max(8),
  }),
  z.object({ type: z.literal('pattern'), patternId: z.string(), color: z.string(), scale: z.number().min(0.1).max(4) }),
  z.object({ type: z.literal('image'), storageKey: z.string(), fit: z.enum(['fill', 'contain', 'cover']) }),
])

export const coverLayerSchema = z.discriminatedUnion('type', [
  textLayerSchema,
  shapeLayerSchema,
  imageLayerSchema,
  stickerLayerSchema,
])

export type CoverLayer = z.infer<typeof coverLayerSchema>
export type CoverDesignDocument = {
  version: 1
  width: number
  height: number
  background: z.infer<typeof backgroundSchema>
  layers: CoverLayer[]
}

export const coverDesignDocumentSchema = z.object({
  version: z.literal(1),
  width: z.literal(COVER_DESIGN_WIDTH),
  height: z.literal(COVER_DESIGN_HEIGHT),
  background: backgroundSchema,
  layers: z.array(coverLayerSchema).max(200),
})

export function parseCoverDesignJson(raw: unknown): CoverDesignDocument | null {
  const parsed = coverDesignDocumentSchema.safeParse(raw)
  if (!parsed.success) return null
  const bytes = new TextEncoder().encode(JSON.stringify(parsed.data)).length
  if (bytes > COVER_DESIGN_JSON_MAX_BYTES) return null
  return parsed.data
}

export function emptyCoverDesign(): CoverDesignDocument {
  return {
    version: 1,
    width: COVER_DESIGN_WIDTH,
    height: COVER_DESIGN_HEIGHT,
    background: { type: 'solid', color: '#3d2c24' },
    layers: [],
  }
}

import type { Database, Json } from '../database.types.ts'
import type { Audience } from './types.ts'

type CreationUpdate = Database['public']['Tables']['creations']['Update']

export function fieldsForSaveCreation(input: {
  title: string
  bodyText: string
  bodyJson: Json
  caption?: string
  audience?: Audience
}): Pick<CreationUpdate, 'title' | 'body_text' | 'body_json' | 'caption' | 'audience'> {
  const patch: Pick<CreationUpdate, 'title' | 'body_text' | 'body_json' | 'caption' | 'audience'> = {
    title: input.title.trim() || null,
    body_text: input.bodyText,
    body_json: input.bodyJson,
    caption: input.caption?.trim() ? input.caption.trim() : null,
  }
  if (input.audience) patch.audience = input.audience
  return patch
}

export function fieldsForPublish(audience: Audience): Pick<CreationUpdate, 'status' | 'audience'> {
  return {
    status: 'published',
    audience,
  }
}

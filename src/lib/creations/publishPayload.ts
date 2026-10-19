import type { Database, Json } from '../database.types.ts'
import type { Audience } from './types.ts'

type CreationUpdate = Database['public']['Tables']['creations']['Update']

export function fieldsForSaveCreation(input: {
  title: string
  bodyText: string
  bodyJson: Json
}): Pick<CreationUpdate, 'title' | 'body_text' | 'body_json'> {
  return {
    title: input.title.trim() || null,
    body_text: input.bodyText,
    body_json: input.bodyJson,
  }
}

export function fieldsForPublish(audience: Audience): Pick<CreationUpdate, 'status' | 'audience'> {
  return {
    status: 'published',
    audience,
  }
}

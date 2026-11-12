import type { Database, Json } from '../database.types.ts'
import type { Audience } from './types.ts'

type CreationUpdate = Database['public']['Tables']['creations']['Update']

export function fieldsForSaveCreation(input: {
  title: string
  bodyText: string
  bodyJson: Json
  caption?: string
  audience?: Audience
  mood?: string | null
  language?: string
  containsSexualContent?: boolean
  isMatureContent?: boolean
}): Pick<
  CreationUpdate,
  | 'title'
  | 'body_text'
  | 'body_json'
  | 'caption'
  | 'audience'
  | 'mood'
  | 'language'
  | 'contains_sexual_content'
  | 'is_mature_content'
> {
  const patch: Pick<
    CreationUpdate,
    | 'title'
    | 'body_text'
    | 'body_json'
    | 'caption'
    | 'audience'
    | 'mood'
    | 'language'
    | 'contains_sexual_content'
    | 'is_mature_content'
  > = {
    title: input.title.trim() || null,
    body_text: input.bodyText,
    body_json: input.bodyJson,
    caption: input.caption?.trim() ? input.caption.trim() : null,
  }
  if (input.audience) patch.audience = input.audience
  if (input.mood !== undefined) patch.mood = input.mood
  if (input.language !== undefined) patch.language = input.language
  if (input.containsSexualContent !== undefined) patch.contains_sexual_content = input.containsSexualContent
  if (input.isMatureContent !== undefined) patch.is_mature_content = input.isMatureContent
  return patch
}

export function fieldsForPublish(
  audience: Audience,
  mature?: { containsSexualContent: boolean; isMatureContent: boolean },
): Pick<CreationUpdate, 'status' | 'audience' | 'contains_sexual_content' | 'is_mature_content'> {
  return {
    status: 'published',
    audience,
    ...(mature
      ? {
          contains_sexual_content: mature.containsSexualContent,
          is_mature_content: mature.isMatureContent,
        }
      : {}),
  }
}

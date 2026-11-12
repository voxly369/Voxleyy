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
  isSelfHarmTopic?: boolean
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
  | 'is_self_harm_topic'
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
    | 'is_self_harm_topic'
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
  if (input.isSelfHarmTopic !== undefined) patch.is_self_harm_topic = input.isSelfHarmTopic
  return patch
}

export function fieldsForPublish(
  audience: Audience,
  flags?: {
    containsSexualContent: boolean
    isMatureContent: boolean
    isSelfHarmTopic?: boolean
  },
): Pick<
  CreationUpdate,
  'status' | 'audience' | 'contains_sexual_content' | 'is_mature_content' | 'is_self_harm_topic'
> {
  return {
    status: 'published',
    audience,
    ...(flags
      ? {
          contains_sexual_content: flags.containsSexualContent,
          is_mature_content: flags.isMatureContent,
          ...(flags.isSelfHarmTopic !== undefined ? { is_self_harm_topic: flags.isSelfHarmTopic } : {}),
        }
      : {}),
  }
}

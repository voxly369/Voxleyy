export type CountNoun = 'like' | 'follower' | 'following' | 'comment' | 'work' | 'save'

const NOUN_FORMS: Record<CountNoun, { one: string; other: string }> = {
  like: { one: 'like', other: 'likes' },
  follower: { one: 'follower', other: 'followers' },
  following: { one: 'following', other: 'following' },
  comment: { one: 'comment', other: 'comments' },
  work: { one: 'work', other: 'works' },
  save: { one: 'save', other: 'saves' },
}

export function formatCountLabel(count: number, noun: CountNoun): string {
  const forms = NOUN_FORMS[noun]
  const word = count === 1 ? forms.one : forms.other
  return `${count} ${word}`
}

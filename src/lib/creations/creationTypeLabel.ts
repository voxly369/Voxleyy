import { CREATION_TYPE_CARDS, type CreationType } from './creationTypes.ts'

export function creationTypeLabel(type: string): string {
  const match = CREATION_TYPE_CARDS.find((card) => card.type === type)
  return match?.name ?? type.replace(/_/g, ' ')
}

export function isCreationType(value: string): value is CreationType {
  return CREATION_TYPE_CARDS.some((card) => card.type === value)
}

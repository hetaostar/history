import type { ITextbookPerson } from '../../domain/textbookTypes'

type TextbookPersonSource = readonly [
  id: string,
  name: string,
  lifeTime: string,
  summary: string,
]

export function createTextbookPeople(
  people: readonly TextbookPersonSource[],
  textbookIds: readonly string[],
): readonly ITextbookPerson[] {
  return people.map(([id, name, lifeTime, summary]) => ({
    id,
    name,
    lifeTime,
    summary,
    textbookIds: [...textbookIds],
  }))
}

import type {
  ITextbookPerson,
  TextbookPersonHistoryPeriodId,
} from '../../domain/textbookTypes'

type TextbookPersonSource = readonly [
  id: string,
  name: string,
  lifeTime: string,
  summary: string,
  historyPeriodId: TextbookPersonHistoryPeriodId,
]

export function createTextbookPeople(
  people: readonly TextbookPersonSource[],
  textbookIds: readonly string[],
): readonly ITextbookPerson[] {
  return people.map(([id, name, lifeTime, summary, historyPeriodId]) => ({
    id,
    name,
    lifeTime,
    summary,
    textbookIds: [...textbookIds],
    historyPeriodId,
  }))
}

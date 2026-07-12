import type {
  ITextbook,
  ITextbookLesson,
  ITextbookPerson,
  ITextbookUnit,
} from './textbookTypes'

export interface ITextbookPersonEntry {
  readonly person: ITextbookPerson
  readonly lessons: readonly ITextbookLesson[]
}

export interface ITextbookPeopleGroup {
  readonly textbook: ITextbook
  readonly entries: readonly ITextbookPersonEntry[]
}

export interface ITextbookPeopleCatalog {
  readonly groups: readonly ITextbookPeopleGroup[]
  readonly uniquePersonCount: number
}

export function buildTextbookPeopleCatalog(
  textbooks: readonly ITextbook[],
  people: readonly ITextbookPerson[],
  units: readonly ITextbookUnit[],
  lessons: readonly ITextbookLesson[],
): ITextbookPeopleCatalog {
  const textbookIdByUnitId = new Map(
    units.map((unit) => [unit.id, unit.textbookId]),
  )
  const groups = textbooks
    .filter((textbook) => textbook.status === 'published')
    .sort((left, right) => left.order - right.order)
    .map((textbook) => {
      const textbookLessons = lessons.filter(
        (lesson) => textbookIdByUnitId.get(lesson.unitId) === textbook.id,
      )

      return {
        textbook,
        entries: people
          .filter((person) => person.textbookIds.includes(textbook.id))
          .map((person) => ({
            person,
            lessons: textbookLessons
              .filter((lesson) => lesson.personIds.includes(person.id))
              .sort((left, right) => left.lessonNumber - right.lessonNumber),
          })),
      }
    })

  return {
    groups,
    uniquePersonCount: new Set(
      groups.flatMap((group) =>
        group.entries.map((entry) => entry.person.id),
      ),
    ).size,
  }
}

import type {
  ITextbook,
  ITextbookLesson,
  ITextbookPerson,
  ITextbookUnit,
} from './textbookTypes'

export function buildPublishedTextbookPeopleCatalog(
  textbooks: readonly ITextbook[],
  people: readonly ITextbookPerson[],
  units: readonly ITextbookUnit[] = [],
  lessons: readonly ITextbookLesson[] = [],
) {
  const textbookIdByUnitId = new Map(
    units.map(({ id, textbookId }) => [id, textbookId]),
  )
  const lessonsByTextbookAndPerson = new Map<string, ITextbookLesson[]>()

  ;[...lessons]
    .sort((left, right) => left.lessonNumber - right.lessonNumber)
    .forEach((lesson) => {
      const textbookId = textbookIdByUnitId.get(lesson.unitId)
      if (!textbookId) {
        return
      }
      lesson.personIds.forEach((personId) => {
        const key = `${textbookId}:${personId}`
        const personLessons = lessonsByTextbookAndPerson.get(key) ?? []
        personLessons.push(lesson)
        lessonsByTextbookAndPerson.set(key, personLessons)
      })
    })

  const groups = textbooks
    .filter(({ status }) => status === 'published')
    .sort((left, right) => left.order - right.order)
    .map((textbook) => {
      const textbookPeople = people.filter(({ textbookIds }) =>
        textbookIds.includes(textbook.id),
      )
      return {
        textbook,
        people: textbookPeople,
        entries: textbookPeople.map((person) => ({
          person,
          lessons:
            lessonsByTextbookAndPerson.get(`${textbook.id}:${person.id}`) ?? [],
        })),
      }
    })
  const displayedPersonIds = groups.flatMap(({ people: groupPeople }) =>
    groupPeople.map(({ id }) => id),
  )

  return {
    groups,
    uniquePersonCount: new Set(displayedPersonIds).size,
  }
}

export function buildTextbookPersonLessonGroups(
  person: ITextbookPerson,
  textbooks: readonly ITextbook[],
  units: readonly ITextbookUnit[],
  lessons: readonly ITextbookLesson[],
) {
  return person.textbookIds.flatMap((textbookId) => {
    const textbook = textbooks.find(({ id }) => id === textbookId)
    if (!textbook) {
      return []
    }

    const unitIds = new Set(
      units
        .filter((unit) => unit.textbookId === textbookId)
        .map(({ id }) => id),
    )
    const personLessons = lessons
      .filter(
        (lesson) =>
          unitIds.has(lesson.unitId) && lesson.personIds.includes(person.id),
      )
      .sort((left, right) => left.lessonNumber - right.lessonNumber)

    return [{ textbook, lessons: personLessons }]
  })
}

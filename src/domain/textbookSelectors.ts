import type { IHistoricalEvent } from './chinaRiverTypes'
import { KEY_EVENTS } from '../data/chinaHistoryRiver'
import {
  TEXTBOOK_LESSONS,
  TEXTBOOK_PEOPLE,
  TEXTBOOK_UNITS,
  TEXTBOOKS,
} from '../data/textbooks'
import type {
  ITextbook,
  ITextbookEventYearRange,
  ITextbookLesson,
  ITextbookPerson,
  ITextbookUnit,
} from './textbookTypes'

const textbooks: readonly ITextbook[] = TEXTBOOKS
const units: readonly ITextbookUnit[] = TEXTBOOK_UNITS
const lessons: readonly ITextbookLesson[] = TEXTBOOK_LESSONS
const people: readonly ITextbookPerson[] = TEXTBOOK_PEOPLE
const events: readonly IHistoricalEvent[] = KEY_EVENTS
const eventById = new Map(events.map((event) => [event.id, event]))
const publishedTextbookIds = new Set(
  textbooks
    .filter((textbook) => textbook.status === 'published')
    .map((textbook) => textbook.id),
)
const publishedUnitIds = new Set(
  units
    .filter((unit) => publishedTextbookIds.has(unit.textbookId))
    .map((unit) => unit.id),
)
const textbookEventIds = new Set(
  lessons
    .filter((lesson) => publishedUnitIds.has(lesson.unitId))
    .flatMap((lesson) => lesson.eventIds),
)
const textbookEvents = events
  .filter((event) => textbookEventIds.has(event.id))
  .sort(
    (left, right) =>
      left.year - right.year || left.id.localeCompare(right.id),
  )

export function getTextbookById(textbookId: string): ITextbook | undefined {
  return textbooks.find((textbook) => textbook.id === textbookId)
}

export function getTextbookUnits(textbookId: string): readonly ITextbookUnit[] {
  return units
    .filter((unit) => unit.textbookId === textbookId)
    .sort((left, right) => left.order - right.order)
}

export function getTextbookLessons(
  textbookId: string,
): readonly ITextbookLesson[] {
  const unitIds = new Set(
    getTextbookUnits(textbookId).map((unit) => unit.id),
  )
  return lessons
    .filter((lesson) => unitIds.has(lesson.unitId))
    .sort((left, right) => left.lessonNumber - right.lessonNumber)
}

export function getTextbookEvents(
  textbookId: string,
): readonly IHistoricalEvent[] {
  const eventIds = new Set(
    getTextbookLessons(textbookId).flatMap((lesson) => lesson.eventIds),
  )
  return events
    .filter((event) => eventIds.has(event.id))
    .sort((left, right) => left.year - right.year || left.id.localeCompare(right.id))
}

export function getTextbookPeople(
  textbookId: string,
): readonly ITextbookPerson[] {
  return people.filter((person) => person.textbookIds.includes(textbookId))
}

export function getAllTextbookPeople(): readonly ITextbookPerson[] {
  return people
}

export function getAllTextbookEvents(): readonly IHistoricalEvent[] {
  return textbookEvents
}

export function getTextbookEventById(
  eventId: string,
): IHistoricalEvent | undefined {
  const event = eventById.get(eventId)
  return event && textbookEventIds.has(eventId) ? event : undefined
}

export function getTextbookPersonById(
  personId: string,
): ITextbookPerson | undefined {
  return people.find((person) => person.id === personId)
}

export function findLessonsByPersonId(
  personId: string,
  textbookId?: string,
): readonly ITextbookLesson[] {
  const candidates =
    textbookId === undefined ? lessons : getTextbookLessons(textbookId)
  return candidates.filter((lesson) => lesson.personIds.includes(personId))
}

export function findLessonsByEventId(
  eventId: string,
  textbookId?: string,
): readonly ITextbookLesson[] {
  const candidates =
    textbookId === undefined ? lessons : getTextbookLessons(textbookId)
  return candidates.filter((lesson) => lesson.eventIds.includes(eventId))
}

export function getTextbookEventYearRange(
  textbookId: string,
): ITextbookEventYearRange | undefined {
  const textbookEvents = getTextbookEvents(textbookId)
  if (textbookEvents.length === 0) {
    return undefined
  }

  return {
    startYear: textbookEvents[0].year,
    endYear: textbookEvents[textbookEvents.length - 1].year,
  }
}

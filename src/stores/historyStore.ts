import { defineStore } from 'pinia'
import { createId } from '@/domain/createId'
import {
  CURRENT_SCHEMA_VERSION,
  createEmptyHistoryData,
  normalizeHistoryEvent,
  normalizePerson,
  normalizeStudyCard,
  parseHistoryData,
} from '@/domain/historySchema'
import { safeLocalStorage } from '@/domain/safeLocalStorage'
import type {
  IHistoryData,
  IHistoryEvent,
  IPerson,
  IStudyCard,
  IStudyRecord,
  StudyResult,
  StudyTargetType,
} from '@/domain/historyTypes'

const STORAGE_KEY = 'history-memorization:data'
const SAVE_ERROR_MESSAGE = '本地保存失败，请重试。'

type EventInput = Omit<IHistoryEvent, 'id' | 'createdAt' | 'updatedAt'>
type PersonInput = Omit<IPerson, 'id' | 'createdAt' | 'updatedAt'>
type CardInput = Omit<IStudyCard, 'id' | 'createdAt' | 'updatedAt' | 'hint'> &
  Partial<Pick<IStudyCard, 'hint'>>
type HistoryState = IHistoryData & {
  lastError: string
}

const LOAD_ERROR_MESSAGE = '本地数据损坏，已重置为空数据。'

export const useHistoryStore = defineStore('history', {
  state: (): HistoryState => {
    const raw = safeLocalStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { ...createEmptyHistoryData(), lastError: '' }
    }
    try {
      const storedData = JSON.parse(raw) as { version?: unknown }
      const parsed = parseHistoryData(storedData)
      const requiresMigration =
        storedData.version !== CURRENT_SCHEMA_VERSION
      const migrationSaved =
        !requiresMigration ||
        safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))

      return {
        ...parsed,
        lastError: migrationSaved ? '' : SAVE_ERROR_MESSAGE,
      }
    } catch (error) {
      console.warn('Failed to load history data:', error)
      return {
        ...createEmptyHistoryData(),
        lastError: LOAD_ERROR_MESSAGE,
      }
    }
  },
  getters: {
    sortedEvents(state): IHistoryEvent[] {
      return [...state.events].sort(
        (a, b) =>
          getTimeSortValue(a.timeLabel) - getTimeSortValue(b.timeLabel),
      )
    },
  },
  actions: {
    createEvent(input: EventInput): IHistoryEvent {
      const event = normalizeHistoryEvent({
        id: createId(),
        ...input,
        personIds: input.personIds ?? [],
        createdAt: now(),
        updatedAt: now(),
      })
      this.events.push(event)
      this.persist()
      return event
    },
    updateEvent(id: string, input: EventInput): IHistoryEvent | undefined {
      const event = this.events.find((item) => item.id === id)
      if (!event) {
        return undefined
      }

      Object.assign(
        event,
        normalizeHistoryEvent({
          ...event,
          ...input,
          personIds: input.personIds ?? [],
          updatedAt: now(),
        }),
      )
      this.persist()
      return event
    },
    deleteEvent(id: string): boolean {
      const initialLength = this.events.length

      this.events = this.events.filter((event) => event.id !== id)
      this.cards.forEach((card) => {
        card.eventIds = card.eventIds.filter((eventId) => eventId !== id)
      })
      this.studyRecords = this.studyRecords.filter(
        (record) => record.targetType !== 'event' || record.targetId !== id,
      )
      this.persist()
      return this.events.length !== initialLength
    },
    createPerson(input: PersonInput): IPerson {
      const person = normalizePerson({
        id: createId(),
        ...input,
        createdAt: now(),
        updatedAt: now(),
      })
      this.people.push(person)
      this.persist()
      return person
    },
    updatePerson(id: string, input: PersonInput): IPerson | undefined {
      const person = this.people.find((item) => item.id === id)
      if (!person) {
        return undefined
      }

      Object.assign(
        person,
        normalizePerson({
          ...person,
          ...input,
          updatedAt: now(),
        }),
      )
      this.persist()
      return person
    },
    deletePerson(id: string): boolean {
      const initialLength = this.people.length

      this.people = this.people.filter((person) => person.id !== id)
      this.events.forEach((event) => {
        event.personIds = event.personIds.filter((personId) => personId !== id)
      })
      this.cards.forEach((card) => {
        card.personIds = card.personIds.filter((personId) => personId !== id)
      })
      this.studyRecords = this.studyRecords.filter(
        (record) => record.targetType !== 'person' || record.targetId !== id,
      )
      this.persist()
      return this.people.length !== initialLength
    },
    createCard(input: CardInput): IStudyCard {
      const card = normalizeStudyCard({
        id: createId(),
        ...input,
        hint: input.hint ?? '',
        personIds: input.personIds ?? [],
        eventIds: input.eventIds ?? [],
        createdAt: now(),
        updatedAt: now(),
      })
      this.cards.push(card)
      this.persist()
      return card
    },
    updateCard(id: string, input: CardInput): IStudyCard | undefined {
      const card = this.cards.find((item) => item.id === id)
      if (!card) {
        return undefined
      }

      Object.assign(
        card,
        normalizeStudyCard({
          ...card,
          ...input,
          hint: input.hint ?? '',
          personIds: input.personIds ?? [],
          eventIds: input.eventIds ?? [],
          updatedAt: now(),
        }),
      )
      this.persist()
      return card
    },
    deleteCard(id: string): boolean {
      const initialLength = this.cards.length

      this.cards = this.cards.filter((card) => card.id !== id)
      this.studyRecords = this.studyRecords.filter(
        (record) => record.targetType !== 'card' || record.targetId !== id,
      )
      this.persist()
      return this.cards.length !== initialLength
    },
    recordStudy(
      targetType: StudyTargetType,
      targetId: string,
      result: StudyResult,
    ): IStudyRecord {
      const record: IStudyRecord = {
        id: createId(),
        targetType,
        targetId,
        result,
        createdAt: now(),
      }
      this.studyRecords.push(record)
      this.persist()
      return record
    },
    persist(): boolean {
      const ok = safeLocalStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: CURRENT_SCHEMA_VERSION,
          events: this.events,
          people: this.people,
          cards: this.cards,
          studyRecords: this.studyRecords,
        }),
      )
      if (ok) {
        this.lastError = ''
      } else {
        this.lastError = SAVE_ERROR_MESSAGE
      }
      return ok
    },
    eventsByPerson(personId: string): IHistoryEvent[] {
      return this.events.filter((event) => event.personIds.includes(personId))
    },
    search(query: string) {
      const keyword = query.trim().toLowerCase()
      const includes = (values: string[]) =>
        values.some((value) => value.toLowerCase().includes(keyword))

      if (!keyword) {
        return { events: [], people: [], cards: [] }
      }

      return {
        events: this.events.filter((event) =>
          includes([
            event.timeLabel,
            event.title,
            event.hint,
            event.summary,
            event.detail,
            ...event.keywords,
          ]),
        ),
        people: this.people.filter((person) =>
          includes([
            person.name,
            person.lifeTime,
            person.summary,
            person.biography,
            person.achievements,
            ...person.keywords,
          ]),
        ),
        cards: this.cards.filter((card) =>
          includes([card.front, card.back, card.hint, ...card.keywords]),
        ),
      }
    },
  },
})

function now(): string {
  return new Date().toISOString()
}

function getTimeSortValue(timeLabel: string): number {
  if (!timeLabel) return Number.MAX_SAFE_INTEGER

  const bceMatch = timeLabel.match(/(?:公元前|前)\s*(\d+)/)
  if (bceMatch) return -Number(bceMatch[1])

  const yearMatch = timeLabel.match(/^\s*(\d+)\s*年/)
  if (yearMatch) return Number(yearMatch[1])

  const anyYearMatch = timeLabel.match(/(\d{3,4})\s*年/)
  if (anyYearMatch) return Number(anyYearMatch[1])

  return Number.MAX_SAFE_INTEGER
}

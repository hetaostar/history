import { defineStore } from 'pinia'
import { createId } from '@/domain/createId'
import {
  CURRENT_SCHEMA_VERSION,
  createEmptyHistoryData,
  normalizeStudyCard,
  parseHistoryData,
} from '@/domain/historySchema'
import { safeLocalStorage } from '@/domain/safeLocalStorage'
import {
  getAllTextbookEvents,
  getAllTextbookPeople,
  getTextbookEventById,
} from '@/domain/textbookSelectors'
import type {
  IHistoryData,
  IStudyCard,
  IStudyRecord,
  StudyResult,
  StudyTargetType,
} from '@/domain/historyTypes'

const STORAGE_KEY = 'history-memorization:data'
const SAVE_ERROR_MESSAGE = '本地保存失败，请重试。'
const LOAD_ERROR_MESSAGE = '本地数据损坏，已重置为空数据。'

type CardInput = Omit<IStudyCard, 'id' | 'createdAt' | 'updatedAt' | 'hint'> &
  Partial<Pick<IStudyCard, 'hint'>>
type HistoryState = IHistoryData & {
  lastError: string
}

export const useHistoryStore = defineStore('history', {
  state: (): HistoryState => {
    const raw = safeLocalStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { ...createEmptyHistoryData(), lastError: '' }
    }

    try {
      const storedData = JSON.parse(raw) as { version?: unknown }
      const parsed = parseHistoryData(storedData)
      const requiresMigration = storedData.version !== CURRENT_SCHEMA_VERSION
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
  actions: {
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
    ): IStudyRecord | undefined {
      const targetExists =
        (targetType === 'card' &&
          this.cards.some((card) => card.id === targetId)) ||
        (targetType === 'event' &&
          getTextbookEventById(targetId) !== undefined)
      if (!targetExists) {
        return undefined
      }

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
          cards: this.cards,
          studyRecords: this.studyRecords,
        }),
      )
      this.lastError = ok ? '' : SAVE_ERROR_MESSAGE
      return ok
    },
    search(query: string) {
      const keyword = query.trim().toLowerCase()
      const includes = (values: string[]) =>
        values.some((value) => value.toLowerCase().includes(keyword))

      if (!keyword) {
        return { events: [], people: [], cards: [] }
      }

      return {
        events: getAllTextbookEvents().filter((event) =>
          includes([
            String(event.year),
            event.title,
            event.type,
            event.description ?? '',
            String(event.importance),
          ]),
        ),
        people: getAllTextbookPeople().filter((person) =>
          includes([person.name, person.lifeTime, person.summary]),
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

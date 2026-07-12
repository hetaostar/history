import {
  getAllTextbookEvents,
  getAllTextbookPeople,
} from './textbookSelectors'
import type { IHistoryData, IStudyCard, IStudyRecord } from './historyTypes'

export const CURRENT_SCHEMA_VERSION = 4

const LEAKED_FORMAT_KEY_PREFIX_RE =
  /^(?:(?:[a-z][a-z_]*_)?format\.[a-z][a-z_]*\s*)+/i
const TEXTBOOK_PERSON_IDS = new Set(
  getAllTextbookPeople().map((person) => person.id),
)
const TEXTBOOK_EVENT_IDS = new Set(
  getAllTextbookEvents().map((event) => event.id),
)

export function createEmptyHistoryData(): IHistoryData {
  return {
    version: CURRENT_SCHEMA_VERSION,
    cards: [],
    studyRecords: [],
  }
}

export function parseHistoryData(value: unknown): IHistoryData {
  if (!isRecord(value)) {
    throw new Error('导入文件格式不正确')
  }

  if (
    value.version !== undefined &&
    (typeof value.version !== 'number' ||
      !Number.isInteger(value.version) ||
      value.version < 1)
  ) {
    throw new Error('导入文件格式不正确')
  }

  const version = value.version ?? 0
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error('导入文件版本过高，请升级应用')
  }
  if (!Array.isArray(value.cards) || !Array.isArray(value.studyRecords)) {
    throw new Error('导入文件格式不正确')
  }
  if (version < 4 && !Array.isArray(value.events)) {
    throw new Error('导入文件格式不正确')
  }
  if (version < 2 && !Array.isArray(value.timelines)) {
    throw new Error('导入文件格式不正确')
  }
  if (version < 3 && !Array.isArray(value.people)) {
    throw new Error('导入文件格式不正确')
  }

  const cards = value.cards as unknown[]
  const studyRecords = value.studyRecords as unknown[]
  if (!cards.every(isStudyCard) || !studyRecords.every(isStudyRecord)) {
    throw new Error('导入文件格式不正确')
  }

  const normalizedCards = cards.map((card) =>
    normalizeStudyCard(card as IStudyCard),
  )
  const cardIds = new Set(normalizedCards.map((card) => card.id))

  return {
    version: CURRENT_SCHEMA_VERSION,
    cards: normalizedCards,
    studyRecords: (studyRecords as IStudyRecord[]).filter(
      (record) =>
        record.targetType !== 'person' &&
        (record.targetType !== 'event' ||
          TEXTBOOK_EVENT_IDS.has(record.targetId)) &&
        (record.targetType !== 'card' || cardIds.has(record.targetId)),
    ),
  }
}

export function normalizeStudyCard(value: IStudyCard): IStudyCard {
  const card = value as Omit<IStudyCard, 'hint'> & { hint?: string }

  return {
    ...card,
    front: removeLeakedFormatKeyPrefix(card.front),
    back: removeLeakedFormatKeyPrefix(card.back),
    hint: removeLeakedFormatKeyPrefix(card.hint ?? ''),
    keywords: card.keywords.map(removeLeakedFormatKeyPrefix),
    personIds: card.personIds.filter((personId) =>
      TEXTBOOK_PERSON_IDS.has(personId),
    ),
    eventIds: card.eventIds.filter((eventId) =>
      TEXTBOOK_EVENT_IDS.has(eventId),
    ),
  }
}

function removeLeakedFormatKeyPrefix(value: string): string {
  return value.replace(LEAKED_FORMAT_KEY_PREFIX_RE, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStudyCard(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.front) &&
    isString(value.back) &&
    (!('hint' in value) ||
      value.hint === undefined ||
      isString(value.hint)) &&
    isStringArray(value.keywords) &&
    isStringArray(value.personIds) &&
    isStringArray(value.eventIds) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  )
}

function isStudyRecord(value: unknown): value is IStudyRecord {
  return (
    isRecord(value) &&
    isString(value.id) &&
    (value.targetType === 'person' ||
      value.targetType === 'event' ||
      value.targetType === 'card') &&
    isString(value.targetId) &&
    (value.result === 'remembered' || value.result === 'forgotten') &&
    isString(value.createdAt)
  )
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString)
}

import type {
  IHistoryData,
  IHistoryEvent,
  IStudyCard,
} from './historyTypes'
import { TEXTBOOK_PEOPLE } from '../data/textbooks'

export const CURRENT_SCHEMA_VERSION = 3

const LEAKED_FORMAT_KEY_PREFIX_RE =
  /^(?:(?:[a-z][a-z_]*_)?format\.[a-z][a-z_]*\s*)+/i
const TEXTBOOK_PERSON_IDS = new Set<string>(
  TEXTBOOK_PEOPLE.map((person) => person.id),
)

const REQUIRED_COLLECTIONS: Array<keyof Omit<IHistoryData, 'version'>> = [
  'events',
  'cards',
  'studyRecords',
]

export function createEmptyHistoryData(): IHistoryData {
  return {
    version: CURRENT_SCHEMA_VERSION,
    events: [],
    cards: [],
    studyRecords: [],
  }
}

export function parseHistoryData(value: unknown): IHistoryData {
  if (!isRecord(value)) {
    throw new Error('导入文件格式不正确')
  }

  const hasExplicitVersion = Object.prototype.hasOwnProperty.call(value, 'version')
  if (
    hasExplicitVersion &&
    (typeof value.version !== 'number' ||
      !Number.isInteger(value.version) ||
      value.version <= 0)
  ) {
    throw new Error('导入文件格式不正确')
  }

  const version = hasExplicitVersion ? (value.version as number) : 0
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error('导入文件版本过高，请升级应用')
  }

  for (const key of REQUIRED_COLLECTIONS) {
    if (!Array.isArray(value[key])) {
      throw new Error('导入文件格式不正确')
    }
  }

  if (version < 2 && !Array.isArray(value.timelines)) {
    throw new Error('导入文件格式不正确')
  }
  if (version < CURRENT_SCHEMA_VERSION && !Array.isArray(value.people)) {
    throw new Error('导入文件格式不正确')
  }

  const events = value.events as unknown[]
  const cards = value.cards as unknown[]
  const studyRecords = value.studyRecords as unknown[]

  if (
    !events.every(isHistoryEvent) ||
    !cards.every(isStudyCard) ||
    !studyRecords.every(isStudyRecord)
  ) {
    throw new Error('导入文件格式不正确')
  }

  return {
    version: CURRENT_SCHEMA_VERSION,
    events: events.map((event) => normalizeHistoryEvent(event as IHistoryEvent)),
    cards: cards.map((card) => normalizeStudyCard(card as IStudyCard)),
    studyRecords:
      version < CURRENT_SCHEMA_VERSION
        ? studyRecords.filter(
            (record) =>
              (record as { targetType: string }).targetType !== 'person',
          )
        : studyRecords,
  } as IHistoryData
}

export function normalizeHistoryEvent(value: IHistoryEvent): IHistoryEvent {
  const event = { ...(value as object) } as IHistoryEvent & {
    sortValue?: unknown
    timelineId?: unknown
  }
  delete event.sortValue
  delete event.timelineId

  return {
    ...event,
    timeLabel: removeLeakedFormatKeyPrefix(event.timeLabel),
    title: removeLeakedFormatKeyPrefix(event.title),
    hint: removeLeakedFormatKeyPrefix(event.hint),
    summary: removeLeakedFormatKeyPrefix(event.summary),
    detail: removeLeakedFormatKeyPrefix(event.detail),
    keywords: event.keywords.map(removeLeakedFormatKeyPrefix),
    personIds: event.personIds.filter((personId) =>
      TEXTBOOK_PERSON_IDS.has(personId),
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
  }
}

function removeLeakedFormatKeyPrefix(value: string): string {
  return value.replace(LEAKED_FORMAT_KEY_PREFIX_RE, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isHistoryEvent(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    (!('timelineId' in value) || isString(value.timelineId)) &&
    isString(value.timeLabel) &&
    isString(value.title) &&
    isString(value.hint) &&
    isString(value.summary) &&
    isString(value.detail) &&
    isStringArray(value.keywords) &&
    isStringArray(value.personIds) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  )
}

function isStudyCard(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.front) &&
    isString(value.back) &&
    (!('hint' in value) || isString(value.hint)) &&
    isStringArray(value.keywords) &&
    isStringArray(value.personIds) &&
    isStringArray(value.eventIds) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  )
}

function isStudyRecord(value: unknown): boolean {
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

import type { IHistoryData, IHistoryEvent } from './historyTypes'
import type { IStudyCard } from './historyTypes'

export const CURRENT_SCHEMA_VERSION = 1

const REQUIRED_COLLECTIONS: Array<keyof Omit<IHistoryData, 'version'>> = [
  'timelines',
  'events',
  'people',
  'cards',
  'studyRecords',
]

export function createEmptyHistoryData(): IHistoryData {
  return {
    version: CURRENT_SCHEMA_VERSION,
    timelines: [],
    events: [],
    people: [],
    cards: [],
    studyRecords: [],
  }
}

export function parseHistoryData(value: unknown): IHistoryData {
  if (!isRecord(value)) {
    throw new Error('导入文件格式不正确')
  }

  const version = typeof value.version === 'number' ? value.version : 0
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error('导入文件版本过高，请升级应用')
  }

  for (const key of REQUIRED_COLLECTIONS) {
    if (!Array.isArray(value[key])) {
      throw new Error('导入文件格式不正确')
    }
  }

  const timelines = value.timelines as unknown[]
  const events = value.events as unknown[]
  const people = value.people as unknown[]
  const cards = value.cards as unknown[]
  const studyRecords = value.studyRecords as unknown[]

  if (
    !timelines.every(isTimeline) ||
    !events.every(isHistoryEvent) ||
    !people.every(isPerson) ||
    !cards.every(isStudyCard) ||
    !studyRecords.every(isStudyRecord)
  ) {
    throw new Error('导入文件格式不正确')
  }

  // v0 (legacy, no version field) → v1 is a shape no-op: just inject version.
  // Future v1 → v2 migrations would dispatch on `version` here.
  return {
    version: CURRENT_SCHEMA_VERSION,
    timelines,
    events: events.map(stripLegacySortValue),
    people,
    cards: cards.map(normalizeStudyCard),
    studyRecords,
  } as IHistoryData
}

function stripLegacySortValue(value: unknown): IHistoryEvent {
  const event = { ...(value as object) } as IHistoryEvent & {
    sortValue?: unknown
  }
  delete event.sortValue
  return event
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTimeline(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.description) &&
    isStringArray(value.tags) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  )
}

function isHistoryEvent(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.timelineId) &&
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

function isPerson(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.lifeTime) &&
    isString(value.summary) &&
    isString(value.biography) &&
    isString(value.achievements) &&
    isStringArray(value.keywords) &&
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

function normalizeStudyCard(value: unknown): IStudyCard {
  const card = value as Omit<IStudyCard, 'hint'> & { hint?: string }

  return {
    ...card,
    hint: card.hint ?? '',
  }
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

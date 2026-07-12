import { describe, expect, it } from 'vitest'
import {
  CURRENT_SCHEMA_VERSION,
  createEmptyHistoryData,
  parseHistoryData,
} from './historySchema'

const timestamp = '2026-06-21T00:00:00.000Z'

function createEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    timeLabel: '前221年',
    title: '秦统一六国',
    hint: '秦',
    summary: '秦完成统一。',
    detail: '秦灭六国。',
    keywords: ['秦'],
    personIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  }
}

describe('historySchema', () => {
  it('uses a flat v2 schema without timelines', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2)
    expect(createEmptyHistoryData()).toEqual({
      version: 2,
      events: [],
      people: [],
      cards: [],
      studyRecords: [],
    })
  })

  it('accepts valid v2 data', () => {
    const data = {
      ...createEmptyHistoryData(),
      events: [createEvent()],
    }

    expect(parseHistoryData(data)).toEqual(data)
  })

  it('migrates v1 timelines to flat events without losing event data', () => {
    const parsed = parseHistoryData({
      version: 1,
      timelines: [
        {
          id: 'timeline-1',
          name: '中国近代史',
          description: '',
          tags: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      events: [
        createEvent({
          timelineId: 'timeline-1',
          title: '辛亥革命',
          personIds: ['person-1'],
        }),
      ],
      people: [
        {
          id: 'person-1',
          name: '孙中山',
          lifeTime: '1866-1925',
          summary: '革命家。',
          biography: '',
          achievements: '',
          keywords: ['辛亥革命'],
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      cards: [
        {
          id: 'card-1',
          front: '辛亥革命发生于哪一年？',
          back: '1911年',
          hint: '',
          keywords: [],
          personIds: ['person-1'],
          eventIds: ['event-1'],
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      studyRecords: [
        {
          id: 'record-1',
          targetType: 'event',
          targetId: 'event-1',
          result: 'remembered',
          createdAt: timestamp,
        },
      ],
    })

    expect(parsed.version).toBe(2)
    expect(parsed).not.toHaveProperty('timelines')
    expect(parsed.events[0]).toMatchObject({
      id: 'event-1',
      title: '辛亥革命',
      personIds: ['person-1'],
    })
    expect(parsed.events[0]).not.toHaveProperty('timelineId')
    expect(parsed.people[0]?.id).toBe('person-1')
    expect(parsed.cards[0]?.eventIds).toEqual(['event-1'])
    expect(parsed.studyRecords[0]).toMatchObject({
      targetId: 'event-1',
      result: 'remembered',
    })
  })

  it('migrates legacy data without a version through v1 to v2', () => {
    const parsed = parseHistoryData({
      timelines: [],
      events: [],
      people: [],
      cards: [],
      studyRecords: [],
    })

    expect(parsed).toEqual(createEmptyHistoryData())
  })

  it('rejects future schema versions and malformed collections', () => {
    expect(() =>
      parseHistoryData({ ...createEmptyHistoryData(), version: 999 }),
    ).toThrow('导入文件版本过高，请升级应用')
    expect(() => parseHistoryData({ events: [] })).toThrow(
      '导入文件格式不正确',
    )
    expect(() =>
      parseHistoryData({
        ...createEmptyHistoryData(),
        events: [{}],
      }),
    ).toThrow('导入文件格式不正确')
  })

  it('normalizes legacy optional fields and leaked format prefixes', () => {
    const parsed = parseHistoryData({
      ...createEmptyHistoryData(),
      events: [
        createEvent({
          timeLabel: 'date_format.bc前202年',
          title: 'ate_format.bc汉朝建立',
          hint: 'year_format.bc刘邦称帝',
          summary: 'date_format.ad统一天下',
          keywords: ['date_format.bc汉朝', '西汉'],
          sortValue: -202,
        }),
      ],
      cards: [
        {
          id: 'card-1',
          front: 'date_format.bc汉朝何时建立？',
          back: 'date_format.bc前202年',
          keywords: ['date_format.bc汉朝'],
          personIds: [],
          eventIds: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    })

    expect(parsed.events[0]).toMatchObject({
      timeLabel: '前202年',
      title: '汉朝建立',
      hint: '刘邦称帝',
      summary: '统一天下',
      keywords: ['汉朝', '西汉'],
    })
    expect(parsed.events[0]).not.toHaveProperty('sortValue')
    expect(parsed.cards[0]).toMatchObject({
      front: '汉朝何时建立？',
      back: '前202年',
      hint: '',
      keywords: ['汉朝'],
    })
  })
})

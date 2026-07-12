import { describe, expect, it } from 'vitest'
import { TEXTBOOK_PEOPLE } from '../data/textbooks'
import {
  CURRENT_SCHEMA_VERSION,
  createEmptyHistoryData,
  parseHistoryData,
} from './historySchema'

const timestamp = '2026-06-21T00:00:00.000Z'
const validPersonId = TEXTBOOK_PEOPLE[0].id

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
  it('使用不含 timelines 和 people 的扁平 v3 schema', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(3)
    expect(createEmptyHistoryData()).toEqual({
      version: 3,
      events: [],
      cards: [],
      studyRecords: [],
    })
  })

  it('接受有效 v3 数据并过滤事件与卡片中的无效教材人物 ID', () => {
    const data = {
      ...createEmptyHistoryData(),
      events: [
        createEvent({ personIds: ['legacy-person', validPersonId, validPersonId] }),
      ],
      cards: [
        {
          id: 'card-1',
          front: '孔子是谁？',
          back: '儒家学派创始人',
          hint: '',
          keywords: [],
          personIds: ['legacy-person', validPersonId],
          eventIds: ['event-1'],
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    }

    const parsed = parseHistoryData(data)

    expect(parsed.events[0].personIds).toEqual([validPersonId, validPersonId])
    expect(parsed.cards[0].personIds).toEqual([validPersonId])
  })

  it('迁移 v1 时移除 timeline、旧 people 与人物学习记录并保留其他数据', () => {
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
          personIds: ['person-1', validPersonId],
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
          personIds: ['person-1', validPersonId],
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
        {
          id: 'record-2',
          targetType: 'person',
          targetId: 'person-1',
          result: 'forgotten',
          createdAt: timestamp,
        },
      ],
    })

    expect(parsed.version).toBe(3)
    expect(parsed).not.toHaveProperty('timelines')
    expect(parsed).not.toHaveProperty('people')
    expect(parsed.events[0]).toMatchObject({
      id: 'event-1',
      title: '辛亥革命',
      personIds: [validPersonId],
    })
    expect(parsed.events[0]).not.toHaveProperty('timelineId')
    expect(parsed.cards[0]?.eventIds).toEqual(['event-1'])
    expect(parsed.cards[0]?.personIds).toEqual([validPersonId])
    expect(parsed.studyRecords[0]).toMatchObject({
      targetId: 'event-1',
      result: 'remembered',
    })
    expect(parsed.studyRecords).toHaveLength(1)
  })

  it.each([undefined, 1, 2])('兼容旧版本 %s 并迁移到 v3', (version) => {
    const parsed = parseHistoryData({
      ...(version === undefined ? {} : { version }),
      timelines: [],
      events: [],
      people: [],
      cards: [],
      studyRecords: [
        {
          id: 'record-1',
          targetType: 'person',
          targetId: validPersonId,
          result: 'remembered',
          createdAt: timestamp,
        },
      ],
    })

    expect(parsed).toEqual(createEmptyHistoryData())
  })

  it('显式版本仅接受正整数并区分未来版本与格式错误', () => {
    expect(() =>
      parseHistoryData({ ...createEmptyHistoryData(), version: 999 }),
    ).toThrow('导入文件版本过高，请升级应用')

    for (const version of [-1, 0, 1.5, Number.NaN, '2']) {
      expect(() =>
        parseHistoryData({ ...createEmptyHistoryData(), version }),
      ).toThrow('导入文件格式不正确')
    }
  })

  it('拒绝集合缺失或集合成员格式错误', () => {
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

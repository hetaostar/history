import { describe, expect, it } from 'vitest'
import {
  CURRENT_SCHEMA_VERSION,
  createEmptyHistoryData,
  parseHistoryData,
} from './historySchema'

const timestamp = '2026-06-21T00:00:00.000Z'

function createLegacyEvent() {
  return {
    id: 'event-1',
    timeLabel: '前221年',
    title: '旧自建事件',
    hint: '',
    summary: '',
    detail: '',
    keywords: [],
    personIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function createCard(overrides: Record<string, unknown> = {}) {
  return {
    id: 'card-1',
    front: '秦朝何时建立？',
    back: '前221年',
    hint: '',
    keywords: [],
    personIds: [],
    eventIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  }
}

describe('historySchema', () => {
  it('使用仅含卡片和学习记录的 v4 本地数据结构', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(4)
    expect(createEmptyHistoryData()).toEqual({
      version: 4,
      cards: [],
      studyRecords: [],
    })
  })

  it('读取 v3 时丢弃事件并过滤卡片的教材人物和事件引用', () => {
    const parsed = parseHistoryData({
      version: 3,
      events: [
        {
          ...createLegacyEvent(),
          personIds: ['unknown-person', 'g7u-confucius'],
        },
      ],
      cards: [
        createCard({
          personIds: ['unknown-person', 'g7u-confucius'],
          eventIds: ['event-1', 'china-event-0029'],
        }),
      ],
      studyRecords: [],
    })

    expect(parsed.cards[0].personIds).toEqual(['g7u-confucius'])
    expect(parsed.cards[0].eventIds).toEqual(['china-event-0029'])
    expect(parsed).not.toHaveProperty('events')
    expect(parsed).not.toHaveProperty('people')
  })

  it('迁移旧数据时删除人物记录并仅保留教材事件及卡片学习记录', () => {
    const parsed = parseHistoryData({
      version: 2,
      events: [createLegacyEvent()],
      people: [],
      cards: [
        createCard({
          eventIds: ['event-1', 'china-event-0029'],
        }),
      ],
      studyRecords: [
        {
          id: 'legacy-event-record',
          targetType: 'event',
          targetId: 'event-1',
          result: 'remembered',
          createdAt: timestamp,
        },
        {
          id: 'textbook-event-record',
          targetType: 'event',
          targetId: 'china-event-0029',
          result: 'remembered',
          createdAt: timestamp,
        },
        {
          id: 'person-record',
          targetType: 'person',
          targetId: 'g7u-confucius',
          result: 'remembered',
          createdAt: timestamp,
        },
        {
          id: 'card-record',
          targetType: 'card',
          targetId: 'card-1',
          result: 'forgotten',
          createdAt: timestamp,
        },
      ],
    })

    expect(parsed).toEqual({
      version: 4,
      cards: [
        expect.objectContaining({
          eventIds: ['china-event-0029'],
        }),
      ],
      studyRecords: [
        expect.objectContaining({ id: 'textbook-event-record' }),
        expect.objectContaining({ id: 'card-record' }),
      ],
    })
  })

  it('迁移时删除指向不存在卡片的学习记录', () => {
    const parsed = parseHistoryData({
      version: 4,
      cards: [
        createCard({
          personIds: ['g7u-confucius', 'missing-person'],
          eventIds: ['china-event-0029', 'missing-event'],
        }),
      ],
      studyRecords: [
        {
          id: 'orphan-card-record',
          targetType: 'card',
          targetId: 'missing-card',
          result: 'remembered',
          createdAt: timestamp,
        },
        {
          id: 'orphan-event-record',
          targetType: 'event',
          targetId: 'missing-event',
          result: 'remembered',
          createdAt: timestamp,
        },
      ],
    })

    expect(parsed.cards[0].personIds).toEqual(['g7u-confucius'])
    expect(parsed.cards[0].eventIds).toEqual(['china-event-0029'])
    expect(parsed.studyRecords).toEqual([])
  })

  it('继续接受无版本旧数据并迁移为空 v4 数据', () => {
    expect(
      parseHistoryData({
        timelines: [],
        events: [],
        people: [],
        cards: [],
        studyRecords: [],
      }),
    ).toEqual(createEmptyHistoryData())
  })

  it('拒绝未来版本、缺失集合和畸形卡片', () => {
    expect(() =>
      parseHistoryData({ ...createEmptyHistoryData(), version: 999 }),
    ).toThrow('导入文件版本过高，请升级应用')
    expect(() => parseHistoryData({ version: 4, cards: [] })).toThrow(
      '导入文件格式不正确',
    )
    expect(() =>
      parseHistoryData({
        ...createEmptyHistoryData(),
        cards: [{}],
      }),
    ).toThrow('导入文件格式不正确')
  })

  it.each([-1, 0, 2.5, Number.NaN, '2'])(
    '拒绝非法 schema 版本：%s',
    (version) => {
      expect(() =>
        parseHistoryData({
          ...createEmptyHistoryData(),
          version,
          timelines: [],
          events: [],
          people: [],
        }),
      ).toThrow('导入文件格式不正确')
    },
  )

  it('清理卡片中泄漏的格式键并补齐旧版 hint', () => {
    const parsed = parseHistoryData({
      version: 4,
      events: [],
      cards: [
        createCard({
          front: 'date_format.bc汉朝何时建立？',
          back: 'date_format.bc前202年',
          hint: undefined,
          keywords: ['date_format.bc汉朝'],
        }),
      ],
      studyRecords: [],
    })

    expect(parsed.cards[0]).toMatchObject({
      front: '汉朝何时建立？',
      back: '前202年',
      hint: '',
      keywords: ['汉朝'],
    })
  })
})

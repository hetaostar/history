import { describe, expect, it } from 'vitest'
import {
  CURRENT_SCHEMA_VERSION,
  createEmptyHistoryData,
  parseHistoryData,
} from './historySchema'

describe('historySchema', () => {
  it('creates empty data with every collection', () => {
    expect(createEmptyHistoryData()).toEqual({
      version: CURRENT_SCHEMA_VERSION,
      timelines: [],
      events: [],
      people: [],
      cards: [],
      studyRecords: [],
    })
  })

  it('includes version: 1 in empty data', () => {
    expect(createEmptyHistoryData().version).toBe(1)
    expect(CURRENT_SCHEMA_VERSION).toBe(1)
  })

  it('accepts v1 data with version field', () => {
    const data = {
      ...createEmptyHistoryData(),
      timelines: [
        {
          id: 'timeline-1',
          name: '中国近代史',
          description: '',
          tags: [],
          createdAt: '2026-06-21T00:00:00.000Z',
          updatedAt: '2026-06-21T00:00:00.000Z',
        },
      ],
    }

    const parsed = parseHistoryData(data)

    expect(parsed.version).toBe(1)
    expect(parsed.timelines).toHaveLength(1)
    expect(parsed.timelines[0].name).toBe('中国近代史')
  })

  it('migrates legacy data without version field to v1', () => {
    const legacyData = {
      timelines: [],
      events: [],
      people: [],
      cards: [],
      studyRecords: [],
    }

    const parsed = parseHistoryData(legacyData)

    expect(parsed.version).toBe(1)
  })

  it('rejects data with future schema version', () => {
    const futureData = {
      version: 999,
      timelines: [],
      events: [],
      people: [],
      cards: [],
      studyRecords: [],
    }

    expect(() => parseHistoryData(futureData)).toThrow(
      '导入文件版本过高，请升级应用',
    )
  })

  it('accepts valid exported data', () => {
    const data = createEmptyHistoryData()
    expect(parseHistoryData(data)).toEqual(data)
  })

  it('rejects objects missing required collections', () => {
    expect(() => parseHistoryData({ timelines: [] })).toThrow(
      '导入文件格式不正确',
    )
  })

  it('rejects malformed timeline elements', () => {
    expect(() =>
      parseHistoryData({
        timelines: [{}],
        events: [],
        people: [],
        cards: [],
        studyRecords: [],
      }),
    ).toThrow('导入文件格式不正确')
  })

  it('rejects event elements missing personIds', () => {
    expect(() =>
      parseHistoryData({
        ...createEmptyHistoryData(),
        events: [
          {
            id: 'event-1',
            timelineId: 'timeline-1',
            timeLabel: '前221年',
            title: '秦统一六国',
            hint: '秦',
            summary: '秦完成统一。',
            detail: '秦灭六国。',
            keywords: ['秦'],
            createdAt: '2026-06-21T00:00:00.000Z',
            updatedAt: '2026-06-21T00:00:00.000Z',
          },
        ],
      }),
    ).toThrow('导入文件格式不正确')
  })

  it('rejects malformed person elements', () => {
    expect(() =>
      parseHistoryData({
        ...createEmptyHistoryData(),
        people: [{}],
      }),
    ).toThrow('导入文件格式不正确')
  })

  it('rejects malformed card elements', () => {
    expect(() =>
      parseHistoryData({
        ...createEmptyHistoryData(),
        cards: [{}],
      }),
    ).toThrow('导入文件格式不正确')
  })

  it('keeps card hints when parsing exported data', () => {
    const data = {
      ...createEmptyHistoryData(),
      cards: [
        {
          id: 'card-1',
          front: '商鞅变法的主要内容是什么？',
          back: '废井田、重农抑商、奖励军功。',
          hint: '秦国变法',
          keywords: ['商鞅'],
          personIds: [],
          eventIds: [],
          createdAt: '2026-06-21T00:00:00.000Z',
          updatedAt: '2026-06-21T00:00:00.000Z',
        },
      ],
    }

    expect(parseHistoryData(data).cards[0].hint).toBe('秦国变法')
  })

  it('normalizes legacy cards without hints', () => {
    const data = {
      ...createEmptyHistoryData(),
      cards: [
        {
          id: 'card-1',
          front: '商鞅变法的主要内容是什么？',
          back: '废井田、重农抑商、奖励军功。',
          keywords: ['商鞅'],
          personIds: [],
          eventIds: [],
          createdAt: '2026-06-21T00:00:00.000Z',
          updatedAt: '2026-06-21T00:00:00.000Z',
        },
      ],
    }

    expect(parseHistoryData(data).cards[0].hint).toBe('')
  })

  it('removes leaked format-key prefixes from event text fields', () => {
    const data = {
      ...createEmptyHistoryData(),
      events: [
        {
          id: 'event-1',
          timelineId: 'timeline-1',
          timeLabel: 'date_format.bc前202年',
          title: 'ate_format.bc汉朝建立',
          hint: 'year_format.bc刘邦称帝',
          summary: 'date_format.ad统一天下',
          detail: '发生在汉初。',
          keywords: ['date_format.bc汉朝', '西汉'],
          personIds: [],
          createdAt: '2026-06-21T00:00:00.000Z',
          updatedAt: '2026-06-21T00:00:00.000Z',
        },
      ],
    }

    const parsedEvent = parseHistoryData(data).events[0]

    expect(parsedEvent.timeLabel).toBe('前202年')
    expect(parsedEvent.title).toBe('汉朝建立')
    expect(parsedEvent.hint).toBe('刘邦称帝')
    expect(parsedEvent.summary).toBe('统一天下')
    expect(parsedEvent.detail).toBe('发生在汉初。')
    expect(parsedEvent.keywords).toEqual(['汉朝', '西汉'])
  })

  it('removes leaked format-key prefixes from all visible data fields', () => {
    const data = {
      ...createEmptyHistoryData(),
      timelines: [
        {
          id: 'timeline-1',
          name: 'date_format.bc中国古代史',
          description: 'date_format.ad朝代更迭',
          tags: ['date_format.bc高考'],
          createdAt: '2026-06-21T00:00:00.000Z',
          updatedAt: '2026-06-21T00:00:00.000Z',
        },
      ],
      people: [
        {
          id: 'person-1',
          name: 'date_format.bc刘邦',
          lifeTime: 'date_format.bc前256年-前195年',
          summary: 'date_format.ad汉高祖',
          biography: 'date_format.bc建立汉朝。',
          achievements: 'date_format.ad休养生息。',
          keywords: ['date_format.bc西汉'],
          createdAt: '2026-06-21T00:00:00.000Z',
          updatedAt: '2026-06-21T00:00:00.000Z',
        },
      ],
      cards: [
        {
          id: 'card-1',
          front: 'date_format.bc汉朝何时建立？',
          back: 'date_format.bc前202年',
          hint: 'date_format.ad刘邦',
          keywords: ['date_format.bc汉朝'],
          personIds: [],
          eventIds: [],
          createdAt: '2026-06-21T00:00:00.000Z',
          updatedAt: '2026-06-21T00:00:00.000Z',
        },
      ],
    }

    const parsed = parseHistoryData(data)

    expect(parsed.timelines[0]).toMatchObject({
      name: '中国古代史',
      description: '朝代更迭',
      tags: ['高考'],
    })
    expect(parsed.people[0]).toMatchObject({
      name: '刘邦',
      lifeTime: '前256年-前195年',
      summary: '汉高祖',
      biography: '建立汉朝。',
      achievements: '休养生息。',
      keywords: ['西汉'],
    })
    expect(parsed.cards[0]).toMatchObject({
      front: '汉朝何时建立？',
      back: '前202年',
      hint: '刘邦',
      keywords: ['汉朝'],
    })
  })

  it('rejects malformed study record elements', () => {
    expect(() =>
      parseHistoryData({
        ...createEmptyHistoryData(),
        studyRecords: [{}],
      }),
    ).toThrow('导入文件格式不正确')
  })
})

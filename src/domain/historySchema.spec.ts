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

  it('rejects malformed study record elements', () => {
    expect(() =>
      parseHistoryData({
        ...createEmptyHistoryData(),
        studyRecords: [{}],
      }),
    ).toThrow('导入文件格式不正确')
  })
})

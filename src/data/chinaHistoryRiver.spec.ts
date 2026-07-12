import { describe, expect, it } from 'vitest'
import {
  buildHistoricalEvents,
  DYNASTIES,
  KEY_EVENTS,
} from './chinaHistoryRiver'
import type { IHistoricalEvent } from '../domain/chinaRiverTypes'

const EVENT_TYPES = ['war', 'culture', 'politics', 'science']
const REQUIRED_DYNASTY_TEXT_FIELDS = [
  'id',
  'name',
  'chineseName',
  'color',
  'description',
] as const

describe('chinaHistoryRiver', () => {
  it('完整迁移源文件的数据规模', () => {
    expect(DYNASTIES).toHaveLength(52)
    expect(KEY_EVENTS).toHaveLength(241)
    expect(DYNASTIES.map((dynasty) => dynasty.chineseName)).not.toEqual(
      expect.arrayContaining(['中华民国', '中华人民共和国']),
    )
    expect(Math.max(...DYNASTIES.map((dynasty) => dynasty.endYear))).toBe(1912)
    expect(Math.max(...KEY_EVENTS.map((event) => event.year))).toBeLessThan(1912)
  })

  it('为每个事件提供唯一且不依赖标题的显式 ID', () => {
    const ids = KEY_EVENTS.map((event) => event.id)

    expect(new Set(ids).size).toBe(KEY_EVENTS.length)
    KEY_EVENTS.forEach((event) => {
      expect(event.id).not.toContain(encodeURIComponent(event.title))
    })
  })

  it('固定关键事件 ID，覆盖公元前和同年多事件', () => {
    const eventByTitle = Object.fromEntries(
      KEY_EVENTS.map((event) => [event.title, event]),
    )

    expect(eventByTitle['夏朝建立']).toMatchObject({
      id: 'china-event-0001',
      year: -2070,
    })
    expect(eventByTitle['秦灭齐 • 统一六国']).toMatchObject({
      id: 'china-event-0028',
      year: -221,
    })
    expect(eventByTitle['秦始皇统一六国']).toMatchObject({
      id: 'china-event-0029',
      year: -221,
    })
    expect(eventByTitle['《尼布楚条约》签订']).toMatchObject({
      id: 'china-event-0267',
      year: 1689,
    })
    expect(eventByTitle['设置驻藏大臣']).toMatchObject({
      id: 'china-event-0268',
      year: 1727,
    })
    expect(eventByTitle['平定准噶尔叛乱']).toMatchObject({
      id: 'china-event-0269',
      year: 1757,
    })
    expect(eventByTitle['设置伊犁将军']).toMatchObject({
      id: 'china-event-0270',
      year: 1762,
    })
    expect(eventByTitle['设立军机处']).toMatchObject({
      id: 'china-event-0271',
      year: 1729,
    })
    expect(eventByTitle['限定广州一口通商']).toMatchObject({
      id: 'china-event-0272',
      year: 1757,
    })
  })

  it('仅使用 title 作为 canonical 标题字段', () => {
    KEY_EVENTS.forEach((event) => {
      expect(event.title.trim()).not.toBe('')
      expect('titleEn' in event).toBe(false)
      expect('titleZh' in event).toBe(false)
    })
  })

  it('所有事件年份均为范围内的有限整数', () => {
    KEY_EVENTS.forEach((event) => {
      expect(Number.isFinite(event.year)).toBe(true)
      expect(Number.isInteger(event.year)).toBe(true)
      expect(event.year).toBeGreaterThanOrEqual(-2500)
      expect(event.year).toBeLessThan(1912)
    })
  })

  it('所有朝代年份均为有限整数且起始年份不晚于结束年份', () => {
    DYNASTIES.forEach((dynasty) => {
      expect(Number.isFinite(dynasty.startYear)).toBe(true)
      expect(Number.isInteger(dynasty.startYear)).toBe(true)
      expect(Number.isFinite(dynasty.endYear)).toBe(true)
      expect(Number.isInteger(dynasty.endYear)).toBe(true)
      expect(dynasty.startYear).toBeLessThanOrEqual(dynasty.endYear)
    })
  })

  it('所有朝代 ID 唯一', () => {
    const ids = DYNASTIES.map((dynasty) => dynasty.id)

    expect(new Set(ids).size).toBe(DYNASTIES.length)
  })

  it('所有必填文本字段均非空', () => {
    DYNASTIES.forEach((dynasty) => {
      REQUIRED_DYNASTY_TEXT_FIELDS.forEach((field) => {
        expect(dynasty[field].trim()).not.toBe('')
      })
    })

    KEY_EVENTS.forEach((event) => {
      expect(event.id.trim()).not.toBe('')
      expect(event.title.trim()).not.toBe('')
      expect(event.type.trim()).not.toBe('')
    })
  })

  it('所有事件类型均为合法类型', () => {
    KEY_EVENTS.forEach((event) => {
      expect(EVENT_TYPES).toContain(event.type)
    })
  })

  it('所有事件重要度均为 1 到 10 的整数', () => {
    KEY_EVENTS.forEach((event) => {
      expect(Number.isInteger(event.importance)).toBe(true)
      expect(event.importance).toBeGreaterThanOrEqual(1)
      expect(event.importance).toBeLessThanOrEqual(10)
    })
  })

  it('为全部内置事件提供非空的本地静态说明', () => {
    expect(KEY_EVENTS).toHaveLength(241)

    KEY_EVENTS.forEach((event) => {
      expect(event.description.trim()).not.toBe('')
    })
  })

  it('生成确定性的公元前、并立时期和无朝代说明', () => {
    const eventByTitle = Object.fromEntries(
      KEY_EVENTS.map((event) => [event.title, event]),
    )

    expect(eventByTitle['秦始皇统一六国'].description).toBe(
      '公元前221年，秦始皇统一六国。这是一项发生于秦时期的政治事件。',
    )
    expect(eventByTitle['夷陵之战'].description).toBe(
      '222年，夷陵之战。这是一项处于魏、蜀、吴等政权并立阶段的战争事件。',
    )
    const modernEvent: IHistoricalEvent = {
      id: 'modern-event',
      year: 2026,
      title: '现代测试事件',
      type: 'science',
      importance: 10,
    }
    expect(buildHistoricalEvents([modernEvent], DYNASTIES)[0].description).toBe(
      '2026年，现代测试事件。这是一项科技事件。',
    )
  })

  it('保留事件已有的非空说明', () => {
    const event: IHistoricalEvent = {
      id: 'described-event',
      year: 2026,
      title: '已有说明事件',
      type: 'culture',
      description: '  这是人工编写的说明。  ',
      importance: 10,
    }

    expect(buildHistoricalEvents([event], DYNASTIES)[0].description).toBe(
      '  这是人工编写的说明。  ',
    )
  })
})

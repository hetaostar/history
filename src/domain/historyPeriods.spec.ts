import { describe, expect, it } from 'vitest'
import { KEY_EVENTS } from '@/data/chinaHistoryRiver'
import type { IHistoricalEvent } from './chinaRiverTypes'
import {
  HISTORY_PERIODS,
  groupHistoricalEventsByPeriod,
} from './historyPeriods'

describe('historyPeriods', () => {
  it('按时间顺序提供不重叠的主要历史时期', () => {
    expect(HISTORY_PERIODS.map((period) => period.name)).toEqual([
      '夏',
      '商',
      '西周',
      '春秋',
      '战国',
      '秦与楚汉之际',
      '两汉',
      '三国',
      '两晋南北朝',
      '隋',
      '唐',
      '五代十国',
      '宋辽金',
      '元',
      '明',
      '清',
    ])
    expect(Math.max(...HISTORY_PERIODS.map((period) => period.endYear))).toBe(
      1912,
    )

    HISTORY_PERIODS.slice(1).forEach((period, index) => {
      expect(period.startYear).toBe(HISTORY_PERIODS[index].endYear)
    })
  })

  it('使用半开区间把边界年份归入后一个时期', () => {
    const boundaryEvents = [
      createEvent('before-boundary', -1601),
      createEvent('at-boundary', -1600),
    ]

    const groups = groupHistoricalEventsByPeriod(boundaryEvents)

    expect(findGroup(groups, 'xia').events.map((event) => event.id)).toEqual([
      'before-boundary',
    ])
    expect(findGroup(groups, 'shang').events.map((event) => event.id)).toEqual([
      'at-boundary',
    ])
  })

  it('保持组内事件按年份升序且每个事件只出现一次', () => {
    const events = [
      createEvent('later', 200),
      createEvent('earlier', -2000),
      createEvent('middle', 100),
    ]

    const groups = groupHistoricalEventsByPeriod(events)
    const groupedEvents = groups.flatMap((group) => group.events)

    expect(groupedEvents.map((event) => event.id)).toEqual([
      'earlier',
      'middle',
      'later',
    ])
    expect(new Set(groupedEvents.map((event) => event.id))).toHaveLength(
      events.length,
    )
  })

  it('为中华历史长河的全部内置事件提供归属', () => {
    const groups = groupHistoricalEventsByPeriod(KEY_EVENTS)
    const groupedEventIds = groups.flatMap((group) =>
      group.events.map((event) => event.id),
    )

    expect(groupedEventIds).toHaveLength(KEY_EVENTS.length)
    expect(new Set(groupedEventIds).size).toBe(KEY_EVENTS.length)
  })
})

function createEvent(id: string, year: number): IHistoricalEvent {
  return {
    id,
    year,
    title: id,
    type: 'politics',
    importance: 1,
  }
}

function findGroup(
  groups: ReturnType<typeof groupHistoricalEventsByPeriod>,
  periodId: string,
) {
  const group = groups.find(({ period }) => period.id === periodId)
  expect(group).toBeDefined()
  return group!
}

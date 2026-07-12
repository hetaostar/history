import type { IHistoricalEvent } from './chinaRiverTypes'

export interface IHistoryPeriod {
  readonly id: string
  readonly name: string
  readonly startYear: number
  readonly endYear: number
}

export interface IHistoryPeriodGroup {
  readonly period: IHistoryPeriod
  readonly events: readonly IHistoricalEvent[]
}

export const HISTORY_PERIODS = [
  { id: 'xia', name: '夏', startYear: -2070, endYear: -1600 },
  { id: 'shang', name: '商', startYear: -1600, endYear: -1046 },
  { id: 'western-zhou', name: '西周', startYear: -1046, endYear: -770 },
  { id: 'spring-autumn', name: '春秋', startYear: -770, endYear: -403 },
  { id: 'warring-states', name: '战国', startYear: -403, endYear: -221 },
  {
    id: 'qin-chu-han',
    name: '秦与楚汉之际',
    startYear: -221,
    endYear: -202,
  },
  { id: 'han', name: '两汉', startYear: -202, endYear: 220 },
  { id: 'three-kingdoms', name: '三国', startYear: 220, endYear: 280 },
  {
    id: 'jin-northern-southern',
    name: '两晋南北朝',
    startYear: 280,
    endYear: 589,
  },
  { id: 'sui', name: '隋', startYear: 589, endYear: 618 },
  { id: 'tang', name: '唐', startYear: 618, endYear: 907 },
  {
    id: 'five-dynasties',
    name: '五代十国',
    startYear: 907,
    endYear: 960,
  },
  { id: 'song-liao-jin', name: '宋辽金', startYear: 960, endYear: 1279 },
  { id: 'yuan', name: '元', startYear: 1279, endYear: 1368 },
  { id: 'ming', name: '明', startYear: 1368, endYear: 1644 },
  { id: 'qing', name: '清', startYear: 1644, endYear: 1912 },
] as const satisfies readonly IHistoryPeriod[]

export type HistoryPeriodId = (typeof HISTORY_PERIODS)[number]['id']

export function groupHistoricalEventsByPeriod(
  events: readonly IHistoricalEvent[],
): readonly IHistoryPeriodGroup[] {
  const eventsByPeriod = new Map<string, IHistoricalEvent[]>(
    HISTORY_PERIODS.map((period) => [period.id, []]),
  )

  events
    .map((event, index) => ({ event, index }))
    .sort(
      (left, right) =>
        left.event.year - right.event.year || left.index - right.index,
    )
    .forEach(({ event }) => {
      const period = HISTORY_PERIODS.find(
        (candidate) =>
          candidate.startYear <= event.year && event.year < candidate.endYear,
      )

      if (!period) {
        throw new RangeError(`事件 ${event.id} 的年份 ${event.year} 未匹配历史时期`)
      }

      eventsByPeriod.get(period.id)!.push(event)
    })

  return HISTORY_PERIODS.map((period) => ({
    period,
    events: eventsByPeriod.get(period.id)!,
  }))
}

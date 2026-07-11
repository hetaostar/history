import { describe, expect, it } from 'vitest'
import {
  calculateTimelineTicks,
  createRiverDataPoints,
  formatHistoricalYear,
  getEventTypeColor,
  getMaxVisibleImportance,
  getRiverSampleStep,
  layoutRiverEvents,
} from './chinaRiverLayout'
import type { IDynasty, IHistoricalEvent } from './chinaRiverTypes'

describe('formatHistoricalYear', () => {
  it.each([
    [-2500, '公元前2500年'],
    [0, '公元0年'],
    [2025, '公元2025年'],
  ])('将年份 %i 格式化为 %s', (year, expected) => {
    expect(formatHistoricalYear(year)).toBe(expected)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    '拒绝非有限年份 %s',
    (year) => {
      expect(() => formatHistoricalYear(year)).toThrowError(
        'year must be finite',
      )
    },
  )

  it.each([1.5, Number.MAX_SAFE_INTEGER + 1])(
    '拒绝非安全整数年份 %s',
    (year) => {
      expect(() => formatHistoricalYear(year)).toThrowError(
        'year must be a safe integer',
      )
    },
  )
})

describe('缩放级别映射', () => {
  it.each([
    [0.05, 12],
    [0.249, 12],
    [0.25, 6],
    [0.799, 6],
    [0.8, 3],
    [1.999, 3],
    [2, 2],
    [50, 2],
  ])('缩放 %f 对应河流采样步长 %i', (zoom, expected) => {
    expect(getRiverSampleStep(zoom)).toBe(expected)
  })

  it.each([
    [0.05, 1],
    [0.299, 1],
    [0.3, 2],
    [0.799, 2],
    [0.8, 3],
    [1.999, 3],
    [2, 4],
    [3.499, 4],
    [3.5, 5],
    [5.999, 5],
    [6, 10],
    [50, 10],
  ])('缩放 %f 对应最大可见重要度 %i', (zoom, expected) => {
    expect(getMaxVisibleImportance(zoom)).toBe(expected)
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    '河流采样拒绝非法缩放 %s',
    (zoom) => {
      expect(() => getRiverSampleStep(zoom)).toThrowError(
        Number.isFinite(zoom)
          ? 'zoom must be greater than 0'
          : 'zoom must be finite',
      )
    },
  )

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    '事件重要度拒绝非法缩放 %s',
    (zoom) => {
      expect(() => getMaxVisibleImportance(zoom)).toThrowError(
        Number.isFinite(zoom)
          ? 'zoom must be greater than 0'
          : 'zoom must be finite',
      )
    },
  )
})

describe('getEventTypeColor', () => {
  it.each([
    ['war', '#ef4444'],
    ['politics', '#2563eb'],
    ['culture', '#d97706'],
    ['science', '#9333ea'],
  ] as const)('返回 %s 类型的固定颜色', (type, expected) => {
    expect(getEventTypeColor(type)).toBe(expected)
  })
})

describe('createRiverDataPoints', () => {
  const dynasties = [
    {
      id: 'short',
      name: 'Short',
      chineseName: '短',
      startYear: -2,
      endYear: 2,
      color: '#000000',
      description: '用于测试的短朝代',
    },
    {
      id: 'tang',
      name: 'Tang',
      chineseName: '唐',
      startYear: -10,
      endYear: 10,
      color: '#ffffff',
      description: '用于测试权重的朝代',
    },
  ] as const satisfies readonly IDynasty[]

  it('按指定范围和步长生成河流点', () => {
    const points = createRiverDataPoints(dynasties, {
      startYear: -10,
      endYear: 10,
      step: 6,
    })

    expect(points.map((point) => point.year)).toEqual([-10, -4, 2, 8])
  })

  it('使用计数式采样生成安全整数年份', () => {
    const endYear = Number.MAX_SAFE_INTEGER
    const points = createRiverDataPoints([], {
      startYear: endYear - 4,
      endYear,
      step: 2,
    })

    expect(points.map((point) => point.year)).toEqual([
      endYear - 4,
      endYear - 2,
      endYear,
    ])
  })

  it('依据朝代范围计算各层力量与总力量', () => {
    const points = createRiverDataPoints(dynasties, {
      startYear: -10,
      endYear: 10,
      step: 2,
    })
    const yearTwo = points.find((point) => point.year === 2)

    expect(yearTwo).toBeDefined()
    expect(yearTwo?.powers.short).toBeGreaterThan(0)
    expect(yearTwo?.powers.tang).toBeGreaterThan(0)
    expect(yearTwo?.totalPower).toBe(
      (yearTwo?.powers.short ?? 0) + (yearTwo?.powers.tang ?? 0),
    )
  })

  it('不修改 readonly 朝代输入', () => {
    const snapshot = JSON.stringify(dynasties)

    createRiverDataPoints(dynasties, {
      startYear: -10,
      endYear: 10,
      step: 2,
    })

    expect(JSON.stringify(dynasties)).toBe(snapshot)
  })

  it.each([
    [{ startYear: -10, endYear: 10, step: -1 }, 'step must be greater than 0'],
    [{ startYear: -10, endYear: 10, step: 0 }, 'step must be greater than 0'],
    [{ startYear: -10, endYear: 10, step: Number.NaN }, 'step must be finite'],
    [
      { startYear: Number.NaN, endYear: 10, step: 1 },
      'startYear must be finite',
    ],
    [
      { startYear: -10, endYear: Number.NEGATIVE_INFINITY, step: 1 },
      'endYear must be finite',
    ],
    [
      { startYear: 10, endYear: -10, step: 1 },
      'startYear must be less than or equal to endYear',
    ],
  ])('拒绝非法河流数据范围 %#', (range, message) => {
    expect(() => createRiverDataPoints(dynasties, range)).toThrowError(message)
  })

  it('拒绝包含非有限年份的朝代', () => {
    const invalidDynasties: readonly IDynasty[] = [
      { ...dynasties[0], startYear: Number.NaN },
    ]

    expect(() =>
      createRiverDataPoints(invalidDynasties, {
        startYear: -10,
        endYear: 10,
        step: 1,
      }),
    ).toThrowError('dynasty "short" startYear must be finite')
  })

  it.each([
    [
      { startYear: -10.5, endYear: 10, step: 1 },
      'startYear must be a safe integer',
    ],
    [
      { startYear: -10, endYear: 10.5, step: 1 },
      'endYear must be a safe integer',
    ],
    [{ startYear: -10, endYear: 10, step: 1.5 }, 'step must be a safe integer'],
  ])('拒绝非安全整数河流范围 %#', (range, message) => {
    expect(() => createRiverDataPoints(dynasties, range)).toThrowError(message)
  })

  it('拒绝包含非安全整数年份的朝代', () => {
    const invalidDynasties: readonly IDynasty[] = [
      { ...dynasties[0], endYear: 2.5 },
    ]

    expect(() =>
      createRiverDataPoints(invalidDynasties, {
        startYear: -10,
        endYear: 10,
        step: 1,
      }),
    ).toThrowError('dynasty "short" endYear must be a safe integer')
  })

  it('拒绝生成超过最大上限的河流数据点', () => {
    expect(() =>
      createRiverDataPoints([], {
        startYear: 0,
        endYear: 100_000,
        step: 1,
      }),
    ).toThrowError('river data point count must not exceed 100000')
  })
})

describe('calculateTimelineTicks', () => {
  it.each([
    [-2500, 2025, 100, 20],
    [0, 500, 50, 10],
    [0, 200, 10, 2],
    [0, 80, 5, 1],
    [0, 20, 1, null],
  ])(
    '范围 %i 至 %i 使用主刻度 %i 与次刻度 %s',
    (startYear, endYear, majorStep, minorStep) => {
      const ticks = calculateTimelineTicks(startYear, endYear)

      expect(ticks.majorStep).toBe(majorStep)
      expect(ticks.minorStep).toBe(minorStep)
    },
  )

  it('仅在可见上下界内生成等距主次刻度', () => {
    const ticks = calculateTimelineTicks(27, 157)

    expect(ticks.majorTicks).toEqual([
      30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150,
    ])
    expect(ticks.minorTicks.slice(0, 4)).toEqual([28, 30, 32, 34])
    expect(ticks.minorTicks[ticks.minorTicks.length - 1]).toBe(156)
    expect(
      [...ticks.majorTicks, ...ticks.minorTicks].every(
        (year) => year >= 27 && year <= 157,
      ),
    ).toBe(true)
  })

  it('接受反向传入的年份范围', () => {
    expect(calculateTimelineTicks(133, 27)).toEqual(
      calculateTimelineTicks(27, 133),
    )
  })

  it.each([
    [Number.NaN, 100, 'firstYear must be finite'],
    [0, Number.NaN, 'secondYear must be finite'],
  ])('拒绝非有限可见年份 %s 至 %s', (firstYear, secondYear, message) => {
    expect(() => calculateTimelineTicks(firstYear, secondYear)).toThrowError(
      message,
    )
  })

  it.each([
    [0.5, 100, 'firstYear must be a safe integer'],
    [0, 100.5, 'secondYear must be a safe integer'],
  ])('拒绝非安全整数刻度年份 %s 至 %s', (firstYear, secondYear, message) => {
    expect(() => calculateTimelineTicks(firstYear, secondYear)).toThrowError(
      message,
    )
  })

  it('拒绝输出超过最大上限的刻度', () => {
    expect(() => calculateTimelineTicks(0, 200_000)).toThrowError(
      'timeline tick count must not exceed 10000',
    )
  })

  it('拒绝超出安全整数范围的刻度跨度', () => {
    expect(() =>
      calculateTimelineTicks(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
    ).toThrowError('timeline span must be a safe integer')
  })
})

describe('layoutRiverEvents', () => {
  const events = [
    {
      id: 'importance-3',
      year: 99,
      title: '邻近低优先级事件',
      type: 'culture',
      importance: 3,
    },
    {
      id: 'same-year-2',
      year: 100,
      title: '同年次优先事件',
      type: 'politics',
      importance: 2,
    },
    {
      id: 'importance-1',
      year: 100,
      title: '同年最高优先事件',
      type: 'war',
      importance: 1,
    },
    {
      id: 'nearby-2',
      year: 101,
      title: '邻近同优先级事件',
      type: 'science',
      importance: 2,
    },
  ] as const satisfies readonly IHistoricalEvent[]

  const collidingEvents = [
    {
      id: 'collision-first',
      year: 100,
      title: '同一首选车道的第一个长标题事件',
      type: 'politics',
      importance: 2,
    },
    {
      id: 'collision-second',
      year: 102,
      title: '同一首选车道的第二个长标题事件',
      type: 'science',
      importance: 2,
    },
  ] as const satisfies readonly IHistoricalEvent[]

  const sameYearAndImportanceEvents = [
    {
      id: 'input-first',
      year: 100,
      title: '输入中的第一个同年同优先级事件',
      type: 'politics',
      importance: 2,
    },
    {
      id: 'input-second',
      year: 100,
      title: '输入中的第二个同年同优先级事件',
      type: 'science',
      importance: 2,
    },
  ] as const satisfies readonly IHistoricalEvent[]

  it('先按 importance、再按年份稳定排序', () => {
    const nodes = layoutRiverEvents(events, {
      zoom: 1,
      pixelsPerYear: 10,
    })

    expect(nodes.map((node) => node.event.id)).toEqual([
      'importance-1',
      'same-year-2',
      'nearby-2',
      'importance-3',
    ])
  })

  it('相同 importance 和年份时保持输入顺序', () => {
    const nodes = layoutRiverEvents(sameYearAndImportanceEvents, {
      zoom: 1,
      pixelsPerYear: 1,
    })

    expect(nodes.map((node) => node.event.id)).toEqual([
      'input-first',
      'input-second',
    ])
  })

  it('为同年和邻近事件选择无水平重叠的分道', () => {
    const nodes = layoutRiverEvents(events, {
      zoom: 1,
      pixelsPerYear: 10,
    })

    nodes.forEach((node, index) => {
      nodes.slice(index + 1).forEach((otherNode) => {
        if (node.lane !== otherNode.lane) return

        expect(
          node.endX < otherNode.startX || node.startX > otherNode.endX,
        ).toBe(true)
      })
    })
  })

  it('将所有事件放在时间河流上方的正向分道', () => {
    const nodes = layoutRiverEvents(events, {
      zoom: 1,
      pixelsPerYear: 10,
    })

    expect(nodes.every((node) => node.lane > 0)).toBe(true)
  })

  it('达到最大分道数后省略无法避让的低优先级事件', () => {
    const crowdedEvents = Array.from({ length: 3 }, (_, index) => ({
      ...sameYearAndImportanceEvents[0],
      id: `crowded-${index}`,
      title: `同年拥挤事件${index}`,
    }))
    const nodes = layoutRiverEvents(crowdedEvents, {
      zoom: 1,
      pixelsPerYear: 1,
      maxLane: 2,
    })

    expect(nodes).toHaveLength(2)
    expect(nodes.every((node) => node.lane <= 2)).toBe(true)
  })

  it('同 importance、同年份奇偶且水平重叠时避让首选车道', () => {
    const nodes = layoutRiverEvents(collidingEvents, {
      zoom: 1,
      pixelsPerYear: 1,
    })
    const [firstNode, secondNode] = nodes

    expect(firstNode?.endX).toBeGreaterThan(secondNode?.startX ?? Infinity)
    expect(firstNode?.lane).toBe(2)
    expect(secondNode?.lane).not.toBe(firstNode?.lane)
  })

  it('按缩放级别过滤不可见重要度', () => {
    const nodes = layoutRiverEvents(events, {
      zoom: 0.2,
      pixelsPerYear: 10,
    })

    expect(nodes.map((node) => node.event.id)).toEqual(['importance-1'])
  })

  it('不修改 readonly 事件输入', () => {
    const snapshot = JSON.stringify(events)

    layoutRiverEvents(events, {
      zoom: 1,
      pixelsPerYear: 10,
    })

    expect(JSON.stringify(events)).toBe(snapshot)
  })

  it.each([
    [{ zoom: 0, pixelsPerYear: 1 }, 'zoom must be greater than 0'],
    [{ zoom: -1, pixelsPerYear: 1 }, 'zoom must be greater than 0'],
    [{ zoom: Number.NaN, pixelsPerYear: 1 }, 'zoom must be finite'],
    [{ zoom: 1, pixelsPerYear: 0 }, 'pixelsPerYear must be greater than 0'],
    [{ zoom: 1, pixelsPerYear: -1 }, 'pixelsPerYear must be greater than 0'],
    [
      { zoom: 1, pixelsPerYear: Number.POSITIVE_INFINITY },
      'pixelsPerYear must be finite',
    ],
    [
      { zoom: 1, pixelsPerYear: 1, overlapTolerance: -1 },
      'overlapTolerance must be greater than or equal to 0',
    ],
    [
      { zoom: 1, pixelsPerYear: 1, overlapTolerance: Number.NaN },
      'overlapTolerance must be finite',
    ],
    [
      { zoom: 1, pixelsPerYear: 1, originYear: Number.POSITIVE_INFINITY },
      'originYear must be finite',
    ],
    [
      { zoom: 1, pixelsPerYear: 1, maxLane: 0 },
      'maxLane must be greater than 0',
    ],
  ])('拒绝非法事件布局选项 %#', (options, message) => {
    expect(() => layoutRiverEvents(events, options)).toThrowError(message)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    '拒绝非有限事件年份 %s',
    (year) => {
      const invalidEvents: readonly IHistoricalEvent[] = [
        { ...events[0], id: 'invalid-year', year },
      ]

      expect(() =>
        layoutRiverEvents(invalidEvents, {
          zoom: 1,
          pixelsPerYear: 1,
        }),
      ).toThrowError('event "invalid-year" year must be finite')
    },
  )

  it('拒绝非安全整数事件年份', () => {
    const invalidEvents: readonly IHistoricalEvent[] = [
      { ...events[0], id: 'unsafe-year', year: 99.5 },
    ]

    expect(() =>
      layoutRiverEvents(invalidEvents, {
        zoom: 1,
        pixelsPerYear: 1,
      }),
    ).toThrowError('event "unsafe-year" year must be a safe integer')
  })

  it('拒绝非安全整数原点年份', () => {
    expect(() =>
      layoutRiverEvents(events, {
        zoom: 1,
        pixelsPerYear: 1,
        originYear: 0.5,
      }),
    ).toThrowError('originYear must be a safe integer')
  })

  it('拒绝溢出的事件横向布局值', () => {
    expect(() =>
      layoutRiverEvents([events[0]], {
        zoom: 1,
        pixelsPerYear: 1e308,
      }),
    ).toThrowError('event "importance-3" x must be finite')
  })
})

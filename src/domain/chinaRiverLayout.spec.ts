import { describe, expect, it } from 'vitest'
import {
  calculateTimelineTicks,
  createDynastySegments,
  createRiverDataPoints,
  formatHistoricalYear,
  getEventTypeColor,
  getMaxVisibleImportance,
  getRiverSampleStep,
  layoutRiverEvents,
} from './chinaRiverLayout'
import { DYNASTIES, KEY_EVENTS } from '@/data/chinaHistoryRiver'
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

describe('createDynastySegments', () => {
  it('总览折叠复杂并立时期且完整保留成员引用', () => {
    const segments = createDynastySegments(DYNASTIES, { grouped: true })
    const items = new Map(segments.map(({ item }) => [item.id, item]))

    expect(items.get('overview-spring-warring')).toMatchObject({
      startYear: -770,
      endYear: -221,
      memberIds: [
        'zhou_east',
        'spring_autumn',
        'ws_qi',
        'ws_chu',
        'ws_yan',
        'ws_han',
        'ws_zhao',
        'ws_wei',
        'ws_qin',
      ],
    })
    expect(items.get('overview-three-kingdoms')).toMatchObject({
      startYear: 220,
      endYear: 280,
      memberIds: ['threekingdoms_wei', 'threekingdoms_shu', 'threekingdoms_wu'],
    })
    expect(items.get('overview-wei-jin')).toMatchObject({
      startYear: 266,
      endYear: 589,
      memberIds: [
        'jin',
        'liu_song',
        'southern_qi',
        'liang',
        'chen',
        'northern_wei',
        'eastern_wei',
        'western_wei',
        'northern_qi',
        'northern_zhou',
      ],
    })
    expect(items.get('overview-five-ten')).toMatchObject({
      startYear: 902,
      endYear: 979,
      memberIds: [
        'five_later_liang',
        'five_later_tang',
        'five_later_jin',
        'five_later_han',
        'five_later_zhou',
        'ten_wu',
        'ten_southern_tang',
        'ten_former_shu',
        'ten_later_shu',
        'ten_min',
        'ten_chu',
        'ten_southern_han',
        'ten_wuyue',
        'ten_jingnan',
        'ten_northern_han',
      ],
    })
    const groupedMemberIds = [...items.values()].flatMap(
      ({ memberIds }) => memberIds,
    )
    expect(groupedMemberIds).toHaveLength(DYNASTIES.length)
    expect(new Set(groupedMemberIds).size).toBe(DYNASTIES.length)
    expect(items.has('ws_qi')).toBe(false)
    expect(items.has('ten_wuyue')).toBe(false)
  })

  it('明清易代的共同年份按北中南顺序等分三层', () => {
    const transitionSegments = createDynastySegments(DYNASTIES, {
      grouped: false,
    }).filter(
      ({ startYear, endYear }) => startYear === 1644 && endYear === 1645,
    )

    expect(transitionSegments.map(({ item }) => item.id)).toEqual([
      'qing',
      'shun',
      'ming',
    ])
    expect(
      transitionSegments.map(({ stackIndex, stackCount }) => [
        stackIndex,
        stackCount,
      ]),
    ).toEqual([
      [0, 3],
      [1, 3],
      [2, 3],
    ])
  })

  it('北宋与南宋按顺承关系保持单层首尾相接', () => {
    const segments = createDynastySegments(DYNASTIES, { grouped: false })
    const northernSongEnd = segments.find(
      ({ item, endYear }) => item.id === 'northern_song' && endYear === 1127,
    )
    const southernSongStart = segments.find(
      ({ item, startYear }) =>
        item.id === 'southern_song' && startYear === 1127,
    )

    expect(northernSongEnd).toMatchObject({ stackIndex: 0, stackCount: 1 })
    expect(southernSongStart).toMatchObject({ stackIndex: 0, stackCount: 1 })
  })

  it('东汉曹魏与晋刘宋的同年顺承不产生额外重叠层', () => {
    const segments = createDynastySegments(DYNASTIES, { grouped: false })
    const year220 = segments.filter(
      ({ startYear, endYear }) => startYear <= 220 && endYear >= 221,
    )
    const year420 = segments.filter(
      ({ startYear, endYear }) => startYear <= 420 && endYear >= 421,
    )

    expect(year220.map(({ item }) => item.id)).toEqual(['threekingdoms_wei'])
    expect(year420.map(({ item }) => item.id)).not.toContain('jin')
    expect(year420.map(({ item }) => item.id)).toContain('liu_song')
  })

  it('合并同一政权相邻且分层位置不变的片段', () => {
    const dynasties: readonly IDynasty[] = [
      {
        id: 'qing',
        name: 'Qing',
        chineseName: '清',
        startYear: 0,
        endYear: 100,
        color: '#111111',
        description: '用于测试的长期政权',
      },
      {
        id: 'han_west',
        name: 'Han',
        chineseName: '汉',
        startYear: 0,
        endYear: 9,
        color: '#222222',
        description: '用于测试的顺承政权',
      },
      {
        id: 'xin',
        name: 'Xin',
        chineseName: '新',
        startYear: 9,
        endYear: 20,
        color: '#333333',
        description: '用于测试的顺承政权',
      },
    ]
    const qingSegments = createDynastySegments(dynasties, {
      grouped: false,
    }).filter(({ item }) => item.id === 'qing')

    expect(qingSegments[0]).toMatchObject({
      startYear: 0,
      endYear: 21,
      stackIndex: 0,
      stackCount: 2,
    })
  })

  it('每个时间片段的政权层无缝填满整条色带', () => {
    const segments = createDynastySegments(DYNASTIES, { grouped: false })
    const boundaries = [
      ...new Set(
        segments.flatMap(({ startYear, endYear }) => [startYear, endYear]),
      ),
    ].sort((first, second) => first - second)

    boundaries.slice(0, -1).forEach((startYear, index) => {
      const endYear = boundaries[index + 1]
      const intervalSegments = segments.filter(
        (segment) =>
          segment.startYear <= startYear && segment.endYear >= endYear,
      )
      if (intervalSegments.length === 0) return

      expect(intervalSegments).toHaveLength(intervalSegments[0].stackCount)
      expect(
        intervalSegments
          .map(({ stackIndex }) => stackIndex)
          .sort((first, second) => first - second),
      ).toEqual(
        Array.from(
          { length: intervalSegments.length },
          (_, stackIndex) => stackIndex,
        ),
      )
      expect(
        intervalSegments.reduce(
          (total, { stackCount }) => total + 1 / stackCount,
          0,
        ),
      ).toBeCloseTo(1)
    })
  })

  it('不修改完整朝代数据', () => {
    const snapshot = JSON.stringify(DYNASTIES)

    createDynastySegments(DYNASTIES, { grouped: true })
    createDynastySegments(DYNASTIES, { grouped: false })

    expect(JSON.stringify(DYNASTIES)).toBe(snapshot)
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

  it('宽跨度配合可用宽度时使用更粗的主刻度', () => {
    const ticks = calculateTimelineTicks(-2500, 2025, {
      availableWidth: 800,
    })

    expect(ticks.majorStep).toBe(1000)
    expect(ticks.minorStep).toBe(200)
    expect(ticks.majorTicks.length).toBeLessThanOrEqual(
      Math.floor(800 / 96) + 2,
    )
  })

  it('窄跨度配合可用宽度时细化到逐年主刻度', () => {
    const ticks = calculateTimelineTicks(100, 108, {
      availableWidth: 800,
    })

    expect(ticks.majorStep).toBe(1)
    expect(ticks.minorStep).toBeNull()
    expect(ticks.majorTicks).toEqual([100, 101, 102, 103, 104, 105, 106, 107, 108])
  })

  it('按可用宽度保证主刻度间距不低于最小间距', () => {
    const availableWidth = 800
    const minMajorTickSpacing = 96
    const startYear = 0
    const endYear = 200
    const span = endYear - startYear
    const ticks = calculateTimelineTicks(startYear, endYear, {
      availableWidth,
      minMajorTickSpacing,
    })

    const estimatedSpacing = (availableWidth * ticks.majorStep) / span
    expect(estimatedSpacing).toBeGreaterThanOrEqual(minMajorTickSpacing)
    expect(ticks.majorStep).toBe(25)
    expect(ticks.minorStep).toBe(5)
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

  it('拒绝非正可用宽度', () => {
    expect(() =>
      calculateTimelineTicks(0, 100, { availableWidth: 0 }),
    ).toThrowError('availableWidth must be greater than 0')
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

  it('使用最终展示宽度为重要事件卡片避让', () => {
    const shortFeaturedEvents: readonly IHistoricalEvent[] = [
      {
        id: 'featured-first',
        year: 100,
        title: '甲',
        type: 'politics',
        importance: 1,
      },
      {
        id: 'featured-second',
        year: 250,
        title: '乙',
        type: 'politics',
        importance: 1,
      },
    ]
    const nodes = layoutRiverEvents(shortFeaturedEvents, {
      zoom: 1,
      pixelsPerYear: 1,
    })

    expect(nodes.map(({ width }) => width)).toEqual([152, 152])
    expect(nodes[0]?.lane).not.toBe(nodes[1]?.lane)
  })

  it('完整事件数据在最高重要度下全部完成无碰撞布局', () => {
    const nodes = layoutRiverEvents(KEY_EVENTS, {
      zoom: 6,
      pixelsPerYear: 100,
      maxVisibleImportance: 10,
      maxLane: KEY_EVENTS.length,
    })

    expect(nodes).toHaveLength(KEY_EVENTS.length)
    nodes.forEach((node, index) => {
      nodes.slice(index + 1).forEach((otherNode) => {
        if (node.lane !== otherNode.lane) return
        expect(
          node.endX < otherNode.startX || node.startX > otherNode.endX,
        ).toBe(true)
      })
    })
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

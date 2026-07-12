import type {
  HistoricalEventImportance,
  HistoricalEventType,
  IDynasty,
  IHistoricalEvent,
} from './chinaRiverTypes'

const EVENT_TYPE_COLORS: Readonly<Record<HistoricalEventType, string>> = {
  war: '#ef4444',
  politics: '#2563eb',
  culture: '#d97706',
  science: '#9333ea',
}

const MAX_RIVER_DATA_POINTS = 100_000
const MAX_TIMELINE_TICKS = 10_000

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`)
  }
}

function assertSafeInteger(value: number, name: string): void {
  assertFinite(value, name)
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} must be a safe integer`)
  }
}

function assertGreaterThanZero(value: number, name: string): void {
  assertFinite(value, name)
  if (value <= 0) {
    throw new RangeError(`${name} must be greater than 0`)
  }
}

function assertPositiveSafeInteger(value: number, name: string): void {
  assertSafeInteger(value, name)
  if (value <= 0) {
    throw new RangeError(`${name} must be greater than 0`)
  }
}

export function formatHistoricalYear(year: number): string {
  assertSafeInteger(year, 'year')
  return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`
}

export function getRiverSampleStep(zoom: number): number {
  assertGreaterThanZero(zoom, 'zoom')
  if (zoom < 0.25) return 12
  if (zoom < 0.8) return 6
  if (zoom < 2) return 3
  return 2
}

export function getMaxVisibleImportance(
  zoom: number,
): HistoricalEventImportance {
  assertGreaterThanZero(zoom, 'zoom')
  if (zoom < 0.3) return 1
  if (zoom < 0.8) return 2
  if (zoom < 2) return 3
  if (zoom < 3.5) return 4
  if (zoom < 6) return 5
  return 10
}

export function getEventTypeColor(type: HistoricalEventType): string {
  return EVENT_TYPE_COLORS[type]
}

export interface IRiverDataRange {
  readonly startYear: number
  readonly endYear: number
  readonly step: number
}

export interface IRiverDataPoint {
  readonly year: number
  readonly powers: Readonly<Record<string, number>>
  readonly totalPower: number
}

function getDynastyWeight(dynastyId: string): number {
  if (
    ['tang', 'han_west', 'han_east', 'qing', 'yuan', 'prc', 'ming'].includes(
      dynastyId,
    )
  ) {
    return 90
  }
  if (['song', 'sui'].includes(dynastyId)) return 70
  if (['qin', 'shang', 'zhou_west', 'zhou_east'].includes(dynastyId)) return 60
  if (dynastyId === 'spring_autumn') return 55
  if (dynastyId.startsWith('ws_')) return 55
  if (dynastyId.startsWith('five_')) return 60
  if (dynastyId.startsWith('ten_')) return 55
  if (dynastyId.startsWith('threekingdoms')) return 30
  return 50
}

function getDynastyPower(dynasty: IDynasty, year: number): number {
  const overlap = 5
  const extendedStart = dynasty.startYear - overlap
  const extendedEnd = dynasty.endYear + overlap

  if (year < extendedStart || year > extendedEnd) return 0

  const span = extendedEnd - extendedStart
  const progress = (year - extendedStart) / span
  let power: number

  if (span < 20) {
    power = 1
  } else if (dynasty.id === 'prc') {
    power = Math.pow(progress, 0.55)
    if (year >= dynasty.startYear && year <= dynasty.endYear) {
      power = Math.max(power, 0.45)
    }
  } else {
    power = Math.sin(progress * Math.PI)
    if (power > 0.5) {
      power = 0.5 + Math.pow((power - 0.5) * 2, 0.2) * 0.5
    }
    if (year >= dynasty.startYear && year <= dynasty.endYear) {
      power = Math.max(power, 0.4)
    }
  }

  return power * getDynastyWeight(dynasty.id)
}

export function createRiverDataPoints(
  dynasties: readonly IDynasty[],
  range: IRiverDataRange,
): readonly IRiverDataPoint[] {
  assertSafeInteger(range.startYear, 'startYear')
  assertSafeInteger(range.endYear, 'endYear')
  assertPositiveSafeInteger(range.step, 'step')
  if (range.startYear > range.endYear) {
    throw new RangeError('startYear must be less than or equal to endYear')
  }
  dynasties.forEach((dynasty) => {
    assertSafeInteger(dynasty.startYear, `dynasty "${dynasty.id}" startYear`)
    assertSafeInteger(dynasty.endYear, `dynasty "${dynasty.id}" endYear`)
  })

  const startYear = BigInt(range.startYear)
  const endYear = BigInt(range.endYear)
  const step = BigInt(range.step)
  const pointCount = (endYear - startYear) / step + 1n
  if (pointCount > BigInt(MAX_RIVER_DATA_POINTS)) {
    throw new RangeError(
      `river data point count must not exceed ${MAX_RIVER_DATA_POINTS}`,
    )
  }

  const points: IRiverDataPoint[] = []

  for (let index = 0; index < Number(pointCount); index += 1) {
    const year = Number(startYear + BigInt(index) * step)
    const powers: Record<string, number> = {}
    let totalPower = 0

    dynasties.forEach((dynasty) => {
      const power = getDynastyPower(dynasty, year)
      powers[dynasty.id] = power
      totalPower += power
    })

    points.push({ year, powers, totalPower })
  }

  return points
}

interface IDynastyOverviewGroup {
  readonly id: string
  readonly chineseName: string
  readonly memberIds: readonly string[]
}

const DYNASTY_OVERVIEW_GROUPS: readonly IDynastyOverviewGroup[] = [
  {
    id: 'overview-spring-warring',
    chineseName: '春秋战国',
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
  },
  {
    id: 'overview-three-kingdoms',
    chineseName: '三国',
    memberIds: ['threekingdoms_wei', 'threekingdoms_shu', 'threekingdoms_wu'],
  },
  {
    id: 'overview-wei-jin',
    chineseName: '魏晋南北朝',
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
  },
  {
    id: 'overview-five-ten',
    chineseName: '五代十国',
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
  },
]

const DYNASTY_GEOGRAPHIC_ORDER: Readonly<Record<string, number>> = {
  ws_yan: 10,
  ws_zhao: 20,
  ws_qi: 30,
  ws_wei: 40,
  ws_han: 50,
  ws_qin: 60,
  ws_chu: 90,
  threekingdoms_wei: 10,
  threekingdoms_shu: 60,
  threekingdoms_wu: 90,
  northern_wei: 10,
  eastern_wei: 10,
  western_wei: 20,
  northern_qi: 10,
  northern_zhou: 20,
  liu_song: 80,
  southern_qi: 80,
  liang: 80,
  chen: 80,
  five_later_liang: 10,
  five_later_tang: 10,
  five_later_jin: 10,
  five_later_han: 10,
  five_later_zhou: 10,
  ten_northern_han: 20,
  ten_jingnan: 50,
  ten_former_shu: 55,
  ten_later_shu: 55,
  ten_wu: 70,
  ten_southern_tang: 70,
  ten_chu: 75,
  ten_wuyue: 80,
  ten_min: 85,
  ten_southern_han: 90,
  qing: 10,
  shun: 50,
  ming: 90,
}

const CONTINUOUS_SUCCESSION_PAIRS = new Set([
  'xia:shang',
  'shang:zhou_west',
  'han_west:xin',
  'xin:han_east',
  'han_east:threekingdoms_wei',
  'jin:liu_song',
  'liu_song:southern_qi',
  'southern_qi:liang',
  'liang:chen',
  'northern_zhou:sui',
  'sui:tang',
  'tang:five_later_liang',
  'five_later_liang:five_later_tang',
  'five_later_tang:five_later_jin',
  'five_later_jin:five_later_han',
  'five_later_han:five_later_zhou',
  'northern_song:southern_song',
  'yuan:ming',
  'qing:roc',
  'roc:prc',
  'overview-spring-warring:qin',
  'han_east:overview-three-kingdoms',
  'overview-wei-jin:sui',
  'tang:overview-five-ten',
  'overview-five-ten:northern_song',
])

export interface IDynastyDisplayItem {
  readonly id: string
  readonly chineseName: string
  readonly startYear: number
  readonly endYear: number
  readonly color: string
  readonly memberIds: readonly string[]
  readonly dynasty: IDynasty | null
}

export interface IDynastySegment {
  readonly id: string
  readonly item: IDynastyDisplayItem
  readonly startYear: number
  readonly endYear: number
  readonly stackIndex: number
  readonly stackCount: number
}

export interface IDynastySegmentOptions {
  readonly grouped: boolean
}

function createDetailedDynastyItems(
  dynasties: readonly IDynasty[],
): readonly IDynastyDisplayItem[] {
  return dynasties.map((dynasty) => ({
    id: dynasty.id,
    chineseName: dynasty.chineseName,
    startYear: dynasty.startYear,
    endYear: dynasty.endYear,
    color: dynasty.color,
    memberIds: [dynasty.id],
    dynasty,
  }))
}

function createOverviewDynastyItems(
  dynasties: readonly IDynasty[],
): readonly IDynastyDisplayItem[] {
  const dynastyById = new Map(dynasties.map((dynasty) => [dynasty.id, dynasty]))
  const groupByMemberId = new Map(
    DYNASTY_OVERVIEW_GROUPS.flatMap((group) =>
      group.memberIds.map((memberId) => [memberId, group] as const),
    ),
  )
  const emittedGroupIds = new Set<string>()
  const items: IDynastyDisplayItem[] = []

  dynasties.forEach((dynasty) => {
    const group = groupByMemberId.get(dynasty.id)
    if (!group) {
      items.push({
        id: dynasty.id,
        chineseName: dynasty.chineseName,
        startYear: dynasty.startYear,
        endYear: dynasty.endYear,
        color: dynasty.color,
        memberIds: [dynasty.id],
        dynasty,
      })
      return
    }
    if (emittedGroupIds.has(group.id)) return

    const members = group.memberIds
      .map((memberId) => dynastyById.get(memberId))
      .filter((member): member is IDynasty => member !== undefined)
    if (members.length === 0) return
    emittedGroupIds.add(group.id)
    items.push({
      id: group.id,
      chineseName: group.chineseName,
      startYear: Math.min(...members.map((member) => member.startYear)),
      endYear: Math.max(...members.map((member) => member.endYear)),
      color: members[0].color,
      memberIds: members.map((member) => member.id),
      dynasty: null,
    })
  })

  return items
}

function getDisplayEndYear(
  item: IDynastyDisplayItem,
  items: readonly IDynastyDisplayItem[],
): number {
  const hasContinuousSuccessor = items.some(
    (candidate) =>
      candidate.startYear === item.endYear &&
      CONTINUOUS_SUCCESSION_PAIRS.has(`${item.id}:${candidate.id}`),
  )

  return hasContinuousSuccessor ? item.endYear : item.endYear + 1
}

export function createDynastySegments(
  dynasties: readonly IDynasty[],
  options: IDynastySegmentOptions,
): readonly IDynastySegment[] {
  const items = options.grouped
    ? createOverviewDynastyItems(dynasties)
    : createDetailedDynastyItems(dynasties)
  const inputOrder = new Map(items.map((item, index) => [item.id, index]))
  const displayEndYears = new Map(
    items.map((item) => [item.id, getDisplayEndYear(item, items)]),
  )
  const boundaries = [
    ...new Set(
      items.flatMap((item) => [
        item.startYear,
        displayEndYears.get(item.id) ?? item.endYear + 1,
      ]),
    ),
  ].sort((first, second) => first - second)
  const segments: IDynastySegment[] = []

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startYear = boundaries[index]
    const endYear = boundaries[index + 1]
    const activeItems = items
      .filter(
        (item) =>
          item.startYear <= startYear &&
          (displayEndYears.get(item.id) ?? item.endYear + 1) >= endYear,
      )
      .sort(
        (first, second) =>
          (DYNASTY_GEOGRAPHIC_ORDER[first.id] ?? 50) -
            (DYNASTY_GEOGRAPHIC_ORDER[second.id] ?? 50) ||
          (inputOrder.get(first.id) ?? 0) - (inputOrder.get(second.id) ?? 0),
      )

    activeItems.forEach((item, stackIndex) => {
      segments.push({
        id: `${item.id}:${startYear}:${endYear}`,
        item,
        startYear,
        endYear,
        stackIndex,
        stackCount: activeItems.length,
      })
    })
  }

  const mergedSegments: IDynastySegment[] = []
  const lastSegmentIndexByItemId = new Map<string, number>()

  segments.forEach((segment) => {
    const previousIndex = lastSegmentIndexByItemId.get(segment.item.id)
    const previous =
      previousIndex === undefined ? undefined : mergedSegments[previousIndex]

    if (
      previousIndex !== undefined &&
      previous &&
      previous.endYear === segment.startYear &&
      previous.stackIndex === segment.stackIndex &&
      previous.stackCount === segment.stackCount
    ) {
      mergedSegments[previousIndex] = {
        ...previous,
        id: `${previous.item.id}:${previous.startYear}:${segment.endYear}`,
        endYear: segment.endYear,
      }
      return
    }

    lastSegmentIndexByItemId.set(segment.item.id, mergedSegments.length)
    mergedSegments.push(segment)
  })

  return mergedSegments
}

export interface ITimelineTicks {
  readonly majorStep: number
  readonly minorStep: number | null
  readonly majorTicks: readonly number[]
  readonly minorTicks: readonly number[]
}

interface ITickPlan {
  readonly firstTick: bigint
  readonly step: bigint
  readonly count: bigint
}

function createTickPlan(
  startYear: bigint,
  endYear: bigint,
  step: number,
): ITickPlan {
  assertPositiveSafeInteger(step, 'tick step')
  const bigintStep = BigInt(step)
  const quotient = startYear / bigintStep
  const remainder = startYear % bigintStep
  const firstTick = (remainder > 0n ? quotient + 1n : quotient) * bigintStep
  const count =
    firstTick > endYear ? 0n : (endYear - firstTick) / bigintStep + 1n

  return { firstTick, step: bigintStep, count }
}

function createTicks(plan: ITickPlan): readonly number[] {
  return Array.from({ length: Number(plan.count) }, (_, index) =>
    Number(plan.firstTick + BigInt(index) * plan.step),
  )
}

export function calculateTimelineTicks(
  firstYear: number,
  secondYear: number,
): ITimelineTicks {
  assertSafeInteger(firstYear, 'firstYear')
  assertSafeInteger(secondYear, 'secondYear')

  const startYear = Math.min(firstYear, secondYear)
  const endYear = Math.max(firstYear, secondYear)
  const bigintStartYear = BigInt(startYear)
  const bigintEndYear = BigInt(endYear)
  const bigintSpan = bigintEndYear - bigintStartYear
  if (bigintSpan > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('timeline span must be a safe integer')
  }
  const span = Number(bigintSpan)
  let majorStep = 1

  if (span > 800) majorStep = 100
  else if (span > 300) majorStep = 50
  else if (span > 120) majorStep = 10
  else if (span > 40) majorStep = 5

  const minorStep = majorStep >= 5 ? majorStep / 5 : null
  const majorPlan = createTickPlan(bigintStartYear, bigintEndYear, majorStep)
  const minorPlan =
    minorStep === null
      ? null
      : createTickPlan(bigintStartYear, bigintEndYear, minorStep)
  const tickCount = majorPlan.count + (minorPlan?.count ?? 0n)
  if (tickCount > BigInt(MAX_TIMELINE_TICKS)) {
    throw new RangeError(
      `timeline tick count must not exceed ${MAX_TIMELINE_TICKS}`,
    )
  }

  return {
    majorStep,
    minorStep,
    majorTicks: createTicks(majorPlan),
    minorTicks: minorPlan === null ? [] : createTicks(minorPlan),
  }
}

export interface IRiverEventLayoutOptions {
  readonly zoom: number
  readonly pixelsPerYear: number
  readonly originYear?: number
  readonly maxVisibleImportance?: HistoricalEventImportance
  readonly overlapTolerance?: number
  readonly maxLane?: number
}

export interface IRiverEventLayoutNode {
  readonly event: IHistoricalEvent
  readonly x: number
  readonly lane: number
  readonly width: number
  readonly startX: number
  readonly endX: number
}

interface IOccupiedRange {
  readonly startX: number
  readonly endX: number
}

function createLaneCandidates(primaryLane: number, maxLane: number) {
  const candidates = primaryLane <= maxLane ? [primaryLane] : []

  for (let lane = 1; lane <= maxLane; lane += 1) {
    candidates.push(lane)
  }

  return [...new Set(candidates)]
}

export function layoutRiverEvents(
  events: readonly IHistoricalEvent[],
  options: IRiverEventLayoutOptions,
): readonly IRiverEventLayoutNode[] {
  assertGreaterThanZero(options.zoom, 'zoom')
  assertGreaterThanZero(options.pixelsPerYear, 'pixelsPerYear')
  if (options.originYear !== undefined) {
    assertSafeInteger(options.originYear, 'originYear')
  }
  if (options.overlapTolerance !== undefined) {
    assertFinite(options.overlapTolerance, 'overlapTolerance')
    if (options.overlapTolerance < 0) {
      throw new RangeError(
        'overlapTolerance must be greater than or equal to 0',
      )
    }
  }
  if (options.maxLane !== undefined) {
    assertPositiveSafeInteger(options.maxLane, 'maxLane')
  }
  events.forEach((event) => {
    assertSafeInteger(event.year, `event "${event.id}" year`)
  })

  const maxVisibleImportance =
    options.maxVisibleImportance ?? getMaxVisibleImportance(options.zoom)
  const sortedEvents = events
    .filter((event) => event.importance <= maxVisibleImportance)
    .map((event, inputIndex) => ({ event, inputIndex }))
    .sort(
      (first, second) =>
        first.event.importance - second.event.importance ||
        first.event.year - second.event.year ||
        first.inputIndex - second.inputIndex,
    )
  const occupiedLanes = new Map<number, IOccupiedRange[]>()
  const nodes: IRiverEventLayoutNode[] = []
  const originYear = options.originYear ?? 0
  const overlapTolerance =
    options.overlapTolerance ?? (options.zoom <= 0.05 ? 30 : 5)
  const maxLane = options.maxLane ?? sortedEvents.length + 1
  const horizontalPadding = options.zoom <= 0.05 ? 10 : 20
  const labelScale = Math.min(1.2, Math.max(0.8, options.zoom))

  sortedEvents.forEach(({ event }) => {
    const x = (event.year - originYear) * options.pixelsPerYear * options.zoom
    const yearLabel = formatHistoricalYear(event.year)
    const measuredWidth =
      event.title.length * 14 + yearLabel.length * 9 + 15 + horizontalPadding
    const scaledWidth = measuredWidth * labelScale
    const width =
      event.importance === 1
        ? Math.min(220, Math.max(152, scaledWidth))
        : Math.min(184, Math.max(104, scaledWidth))
    const startX = x - width / 2
    const endX = x + width / 2
    assertFinite(x, `event "${event.id}" x`)
    assertFinite(width, `event "${event.id}" width`)
    assertFinite(startX, `event "${event.id}" startX`)
    assertFinite(endX, `event "${event.id}" endX`)
    const band = Math.min(5, Math.max(1, event.importance))
    const primaryLane = band

    for (const lane of createLaneCandidates(primaryLane, maxLane)) {
      const occupiedRanges = occupiedLanes.get(lane) ?? []
      const overlaps = occupiedRanges.some(
        (range) =>
          !(
            endX < range.startX - overlapTolerance ||
            startX > range.endX + overlapTolerance
          ),
      )

      if (overlaps) continue

      occupiedRanges.push({ startX, endX })
      occupiedLanes.set(lane, occupiedRanges)
      nodes.push({ event, x, lane, width, startX, endX })
      break
    }
  })

  return nodes
}

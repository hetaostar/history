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
    const textWidth =
      event.title.length * 14 + yearLabel.length * 9 + 15 + horizontalPadding
    const width = textWidth * labelScale
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

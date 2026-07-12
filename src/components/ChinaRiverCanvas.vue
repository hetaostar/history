<script setup lang="ts">
import * as d3 from 'd3'
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  useId,
  watch,
} from 'vue'
import {
  calculateTimelineTicks,
  createRiverDataPoints,
  formatHistoricalYear,
  getEventTypeColor,
  getMaxVisibleImportance,
  getRiverSampleStep,
  layoutRiverEvents,
} from '@/domain/chinaRiverLayout'
import type {
  HistoricalEventImportance,
  IDynasty,
  IHistoricalEvent,
  IViewport,
} from '@/domain/chinaRiverTypes'

const DEFAULT_START_YEAR = -2500
const DEFAULT_END_YEAR = 2025
const DEFAULT_CENTER_YEAR = 900
const DEFAULT_ZOOM = 0.12
const MAX_TIMELINE_SPAN_YEARS = 10_000
const MIN_ZOOM = 0.05
const MAX_ZOOM = 50
const EVENT_LANE_HEIGHT = 48
const KEYBOARD_PAN_DISTANCE = 80
const KEYBOARD_ZOOM_FACTOR = 1.5
const TIMELINE_BOTTOM_OFFSET = 42
const TIMELINE_DIVIDER_GAP = 44
const RIVER_BOTTOM_GAP = 18
const EVENT_BASELINE_GAP = 18
const EVENT_AREA_TOP_PADDING = 24

const props = defineProps<{
  width: number
  height: number
  dynasties: readonly IDynasty[]
  events: readonly IHistoricalEvent[]
  startYear?: number
  endYear?: number
  initialCenterYear?: number
  initialZoom?: number
}>()

const emit = defineEmits<{
  select: [event: IHistoricalEvent]
  'importance-change': [importance: HistoricalEventImportance]
}>()

function normalizeYear(value: number | undefined): number | undefined {
  if (!Number.isFinite(value)) return undefined
  const integer = Math.round(value!)
  return Number.isSafeInteger(integer) ? integer : undefined
}

function normalizeYearRange(
  requestedStart: number | undefined,
  requestedEnd: number | undefined,
): { startYear: number; endYear: number } {
  const normalizedStart = normalizeYear(requestedStart)
  const normalizedEnd = normalizeYear(requestedEnd)
  if (normalizedStart === undefined || normalizedEnd === undefined) {
    return { startYear: DEFAULT_START_YEAR, endYear: DEFAULT_END_YEAR }
  }

  let startYear = Math.min(normalizedStart, normalizedEnd)
  let endYear = Math.max(normalizedStart, normalizedEnd)
  if (startYear === endYear) {
    if (endYear === Number.MAX_SAFE_INTEGER) {
      startYear -= 1
    } else {
      endYear += 1
    }
  }

  const span = endYear - startYear
  if (!Number.isSafeInteger(span) || span > MAX_TIMELINE_SPAN_YEARS) {
    return { startYear: DEFAULT_START_YEAR, endYear: DEFAULT_END_YEAR }
  }

  return { startYear, endYear }
}

const timelineConfig = computed(() => {
  const { startYear, endYear } = normalizeYearRange(
    props.startYear ?? DEFAULT_START_YEAR,
    props.endYear ?? DEFAULT_END_YEAR,
  )
  const requestedCenter =
    normalizeYear(props.initialCenterYear) ?? DEFAULT_CENTER_YEAR
  const requestedZoom =
    Number.isFinite(props.initialZoom) && props.initialZoom! > 0
      ? props.initialZoom!
      : DEFAULT_ZOOM

  return {
    startYear,
    endYear,
    centerYear: Math.max(startYear, Math.min(endYear, requestedCenter)),
    zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, requestedZoom)),
  }
})

const container = ref<HTMLElement | null>(null)
const svg = ref<SVGSVGElement | null>(null)
const zoomSurface = ref<SVGRectElement | null>(null)
const zoomBehavior = ref<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
const viewport = ref<IViewport>(createInitialViewport())
const pointerPosition = ref<{ x: number; y: number } | null>(null)
const instanceId = useId()
const riverBackgroundId = `${instanceId}-river-background`
const riverGlowId = `${instanceId}-river-glow`
let targetViewport = viewport.value
let targetPointer: { x: number; y: number } | null = null
let frameId: number | null = null
let mountedContainer: HTMLElement | null = null
let mountedZoomTarget: SVGSVGElement | null = null

function getWorldWidth(): number {
  return props.width * 8
}

function clampHorizontalOffset(offset: number, zoom: number): number {
  const scaledWorldWidth = getWorldWidth() * zoom

  if (scaledWorldWidth <= props.width) {
    return (props.width - scaledWorldWidth) / 2
  }

  return Math.max(props.width - scaledWorldWidth, Math.min(0, offset))
}

function yearToWorldX(year: number): number {
  return (
    ((year - timelineConfig.value.startYear) /
      (timelineConfig.value.endYear - timelineConfig.value.startYear)) *
    getWorldWidth()
  )
}

function normalizeViewport(nextViewport: IViewport): IViewport {
  return {
    x: clampHorizontalOffset(nextViewport.x, nextViewport.k),
    y: 0,
    k: nextViewport.k,
  }
}

function createInitialViewport(): IViewport {
  const centerWorldX = yearToWorldX(timelineConfig.value.centerYear)

  return normalizeViewport({
    x: props.width / 2 - centerWorldX * timelineConfig.value.zoom,
    y: 0,
    k: timelineConfig.value.zoom,
  })
}

function screenXToYear(screenX: number): number {
  const worldX = (screenX - viewport.value.x) / viewport.value.k
  return Math.round(
    timelineConfig.value.startYear +
      (worldX / getWorldWidth()) *
        (timelineConfig.value.endYear - timelineConfig.value.startYear),
  )
}

function yearToScreenX(year: number): number {
  return viewport.value.x + yearToWorldX(year) * viewport.value.k
}

function scheduleFrame(): void {
  if (frameId !== null) return

  frameId = requestAnimationFrame(() => {
    frameId = null
    viewport.value = targetViewport
    pointerPosition.value = targetPointer
  })
}

function queueViewport(nextViewport: IViewport): void {
  targetViewport = normalizeViewport(nextViewport)
  scheduleFrame()
}

function handlePointerMove(event: PointerEvent): void {
  const bounds = svg.value?.getBoundingClientRect()
  if (!bounds) return
  const scaleX = bounds.width > 0 ? props.width / bounds.width : 1
  const scaleY = bounds.height > 0 ? props.height / bounds.height : 1

  targetPointer = {
    x: Math.max(
      0,
      Math.min(props.width, (event.clientX - bounds.left) * scaleX),
    ),
    y: Math.max(
      0,
      Math.min(props.height, (event.clientY - bounds.top) * scaleY),
    ),
  }
  scheduleFrame()
}

function handlePointerLeave(): void {
  targetPointer = null
  scheduleFrame()
}

function applyZoomTransform(nextViewport: IViewport): void {
  const normalizedViewport = normalizeViewport(nextViewport)
  if (mountedZoomTarget && zoomBehavior.value) {
    d3.select(mountedZoomTarget).call(
      zoomBehavior.value.transform,
      d3.zoomIdentity
        .translate(normalizedViewport.x, normalizedViewport.y)
        .scale(normalizedViewport.k),
    )
    return
  }
  queueViewport(normalizedViewport)
}

function zoomAroundCanvasCenter(zoomFactor: number): void {
  const nextZoom = Math.max(
    MIN_ZOOM,
    Math.min(MAX_ZOOM, viewport.value.k * zoomFactor),
  )
  const centerWorldX = (props.width / 2 - viewport.value.x) / viewport.value.k
  applyZoomTransform({
    x: props.width / 2 - centerWorldX * nextZoom,
    y: 0,
    k: nextZoom,
  })
}

function handleCanvasKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    applyZoomTransform({
      ...viewport.value,
      x:
        viewport.value.x +
        (event.key === 'ArrowLeft'
          ? KEYBOARD_PAN_DISTANCE
          : -KEYBOARD_PAN_DISTANCE),
    })
    return
  }

  if (event.key === '+' || event.key === '=') {
    event.preventDefault()
    zoomAroundCanvasCenter(KEYBOARD_ZOOM_FACTOR)
  } else if (event.key === '-' || event.key === '_') {
    event.preventDefault()
    zoomAroundCanvasCenter(1 / KEYBOARD_ZOOM_FACTOR)
  }
}

function selectEvent(event: IHistoricalEvent): void {
  emit('select', event)
}

const maxVisibleImportance = computed(() =>
  getMaxVisibleImportance(viewport.value.k),
)

watch(
  maxVisibleImportance,
  (importance) => emit('importance-change', importance),
  { immediate: true },
)

const riverSampleStep = computed(() => getRiverSampleStep(viewport.value.k))

const timelineAxisY = computed(() =>
  Math.max(96, props.height - TIMELINE_BOTTOM_OFFSET),
)

const timelineDividerY = computed(
  () => timelineAxisY.value - TIMELINE_DIVIDER_GAP,
)

const riverBottomY = computed(
  () => timelineDividerY.value - RIVER_BOTTOM_GAP,
)

const riverTopY = computed(() =>
  Math.max(
    props.height * 0.5,
    riverBottomY.value - Math.min(220, props.height * 0.3),
  ),
)

const eventBaselineY = computed(() => riverTopY.value - EVENT_BASELINE_GAP)

const maxEventLanes = computed(() =>
  Math.max(
    1,
    Math.floor(
      (eventBaselineY.value - EVENT_AREA_TOP_PADDING) / EVENT_LANE_HEIGHT,
    ),
  ),
)

const prcTrackY = computed(() => riverTopY.value + 22)

const riverPoints = computed(() =>
  createRiverDataPoints(props.dynasties, {
    startYear: timelineConfig.value.startYear,
    endYear: timelineConfig.value.endYear,
    step: riverSampleStep.value,
  }),
)

const riverStackLayout = computed(() => {
  const stackInput = riverPoints.value.map((point) => ({
    year: point.year,
    ...point.powers,
  }))
  const stack = d3
    .stack<Record<string, number>>()
    .keys(props.dynasties.map((dynasty) => dynasty.id))
    .offset(d3.stackOffsetSilhouette)
  const series = stack(stackInput)
  const maximumTotalPower =
    d3.max(riverPoints.value, (point) => point.totalPower) ?? 0
  const paddedHalfDomain = Math.max(1, (maximumTotalPower / 2) * 1.1)
  const yScale = d3
    .scaleLinear()
    .domain([-paddedHalfDomain, paddedHalfDomain])
    .range([riverBottomY.value, riverTopY.value])

  return { series, yScale }
})

const dynastyPaths = computed(() => {
  const area = d3
    .area<d3.SeriesPoint<Record<string, number>>>()
    .x((point) => yearToWorldX(point.data.year))
    .y0((point) => riverStackLayout.value.yScale(point[0]))
    .y1((point) => riverStackLayout.value.yScale(point[1]))
    .curve(d3.curveBasis)

  return riverStackLayout.value.series.map((dynastySeries, index) => ({
    dynasty: props.dynasties[index],
    path: area(dynastySeries) ?? '',
  }))
})

const visibleYearRange = computed(() => {
  const firstYear = Math.max(
    timelineConfig.value.startYear,
    screenXToYear(0),
  )
  const lastYear = Math.min(
    timelineConfig.value.endYear,
    screenXToYear(props.width),
  )
  return firstYear <= lastYear
    ? { start: firstYear, end: lastYear }
    : { start: lastYear, end: firstYear }
})

const visibleYearMargin = computed(
  () => (visibleYearRange.value.end - visibleYearRange.value.start) * 0.05,
)

const dynastyLabels = computed(() =>
  props.dynasties
    .map((dynasty, dynastyIndex) => ({
      dynasty,
      dynastyIndex,
      labelYear: (dynasty.startYear + dynasty.endYear) / 2,
    }))
    .filter(
      ({ labelYear }) =>
        labelYear >= visibleYearRange.value.start - visibleYearMargin.value &&
        labelYear <= visibleYearRange.value.end + visibleYearMargin.value,
    )
    .map(({ dynasty, dynastyIndex, labelYear }) => {
      const series = riverStackLayout.value.series[dynastyIndex]
      const layerPoint = series.reduce((nearestPoint, point) =>
        Math.abs(point.data.year - labelYear) <
        Math.abs(nearestPoint.data.year - labelYear)
          ? point
          : nearestPoint,
      )
      const layerMiddle = (layerPoint[0] + layerPoint[1]) / 2
      const worldY = riverStackLayout.value.yScale(layerMiddle)

      return {
        dynasty,
        x: yearToScreenX(labelYear),
        y: worldY,
      }
    })
    .filter(({ x }) => x > -120 && x < props.width + 120),
)

const timelineTicks = computed(() =>
  calculateTimelineTicks(
    visibleYearRange.value.start,
    visibleYearRange.value.end,
  ),
)

const majorTicks = computed(() =>
  timelineTicks.value.majorTicks.map((year) => ({
    year,
    x: yearToScreenX(year),
    label: formatHistoricalYear(year),
  })),
)

const minorTicks = computed(() =>
  timelineTicks.value.minorTicks
    .filter((year) => !timelineTicks.value.majorTicks.includes(year))
    .map((year) => ({ year, x: yearToScreenX(year) })),
)

const eventNodes = computed(() => {
  const pixelsPerYear =
    getWorldWidth() /
    (timelineConfig.value.endYear - timelineConfig.value.startYear)
  const visibleEvents = props.events.filter(
    (event) =>
      event.year >= visibleYearRange.value.start - visibleYearMargin.value &&
      event.year <= visibleYearRange.value.end + visibleYearMargin.value,
  )
  return layoutRiverEvents(visibleEvents, {
    zoom: viewport.value.k,
    pixelsPerYear,
    originYear: timelineConfig.value.startYear,
    maxVisibleImportance: maxVisibleImportance.value,
    maxLane: maxEventLanes.value,
  }).map((node) => ({
    ...node,
    screenX: viewport.value.x + node.x,
    screenY: eventBaselineY.value - node.lane * EVENT_LANE_HEIGHT,
    color: getEventTypeColor(node.event.type),
    yearLabel: formatHistoricalYear(node.event.year),
  }))
})

const hoverYear = computed(() =>
  pointerPosition.value === null
    ? null
    : screenXToYear(pointerPosition.value.x),
)

const hoverYearLabel = computed(() =>
  hoverYear.value === null ? '' : formatHistoricalYear(hoverYear.value),
)

const worldTransform = computed(
  () => `translate(${viewport.value.x} 0) scale(${viewport.value.k} 1)`,
)

const prcTrackStart = computed(() => yearToScreenX(1949))
const prcTrackEnd = computed(() =>
  yearToScreenX(timelineConfig.value.endYear),
)
const hasPrcTrack = computed(
  () =>
    timelineConfig.value.startYear <= 1949 &&
    timelineConfig.value.endYear >= 1949,
)

function initializeZoom(): void {
  if (!svg.value) return

  mountedZoomTarget = svg.value
  const behavior = d3
    .zoom<SVGSVGElement, unknown>()
    .extent([
      [0, 0],
      [props.width, props.height],
    ])
    .translateExtent([
      [0, 0],
      [getWorldWidth(), props.height],
    ])
    .scaleExtent([MIN_ZOOM, MAX_ZOOM])
    .filter((event) => {
      if (event.type === 'wheel') return true
      return !(
        event.target instanceof Element && event.target.closest('.river-event')
      )
    })
    .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      const normalizedViewport = normalizeViewport({
        x: Number.isFinite(event.transform.x)
          ? event.transform.x
          : targetViewport.x,
        y: 0,
        k: Number.isFinite(event.transform.k)
          ? event.transform.k
          : targetViewport.k,
      })
      if (mountedZoomTarget) {
        d3.select(mountedZoomTarget).property(
          '__zoom',
          d3.zoomIdentity
            .translate(normalizedViewport.x, normalizedViewport.y)
            .scale(normalizedViewport.k),
        )
      }
      queueViewport(normalizedViewport)
    })
  const selection = d3.select(svg.value)

  zoomBehavior.value = behavior
  selection.call(behavior)
  selection.call(
    behavior.transform,
    d3.zoomIdentity
      .translate(viewport.value.x, viewport.value.y)
      .scale(viewport.value.k),
  )
}

onMounted(() => {
  mountedContainer = container.value
  mountedContainer?.addEventListener('pointermove', handlePointerMove)
  mountedContainer?.addEventListener('pointerleave', handlePointerLeave)
  initializeZoom()
})

watch(
  () =>
    [
      props.width,
      props.height,
      timelineConfig.value.startYear,
      timelineConfig.value.endYear,
      timelineConfig.value.centerYear,
      timelineConfig.value.zoom,
    ] as const,
  async () => {
    targetViewport = createInitialViewport()
    viewport.value = targetViewport
    await nextTick()
    if (!svg.value || !zoomBehavior.value) return
    zoomBehavior.value.extent([
      [0, 0],
      [props.width, props.height],
    ])
    zoomBehavior.value.translateExtent([
      [0, 0],
      [getWorldWidth(), props.height],
    ])
    d3.select(svg.value).call(
      zoomBehavior.value.transform,
      d3.zoomIdentity
        .translate(targetViewport.x, targetViewport.y)
        .scale(targetViewport.k),
    )
  },
)

onUnmounted(() => {
  if (frameId !== null) {
    cancelAnimationFrame(frameId)
    frameId = null
  }
  mountedContainer?.removeEventListener('pointermove', handlePointerMove)
  mountedContainer?.removeEventListener('pointerleave', handlePointerLeave)
  if (mountedZoomTarget) {
    d3.select(mountedZoomTarget).on('.zoom', null)
  }
  mountedContainer = null
  mountedZoomTarget = null
  zoomBehavior.value = null
})
</script>

<template>
  <section
    ref="container"
    class="china-river-canvas"
    role="region"
    aria-label="中国历史长河，拖动浏览并滚轮缩放"
  >
    <svg
      ref="svg"
      class="river-svg"
      :width="props.width"
      :height="props.height"
      :viewBox="`0 0 ${props.width} ${props.height}`"
      role="group"
      tabindex="0"
      aria-label="中国历史朝代与事件时间河流，可使用方向键和加减键浏览"
      @keydown="handleCanvasKeydown"
    >
      <defs>
        <linearGradient :id="riverBackgroundId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#050a14" />
          <stop offset="55%" stop-color="#0b1727" />
          <stop offset="100%" stop-color="#030711" />
        </linearGradient>
        <filter :id="riverGlowId" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        ref="zoomSurface"
        data-test="zoom-surface"
        class="zoom-surface"
        :width="props.width"
        :height="props.height"
        :fill="`url(#${riverBackgroundId})`"
      />

      <g class="river-world" :transform="worldTransform">
        <path
          v-for="{ dynasty, path } in dynastyPaths"
          :key="dynasty.id"
          data-test="dynasty-river"
          class="dynasty-river"
          :d="path"
          :fill="dynasty.color"
          :style="{ filter: `url(#${riverGlowId})` }"
        />
      </g>

      <g class="timeline-axis" aria-hidden="true">
        <line
          data-test="timeline-divider"
          class="timeline-divider"
          x1="0"
          :x2="props.width"
          :y1="timelineDividerY"
          :y2="timelineDividerY"
        />
        <line
          v-for="tick in minorTicks"
          :key="`minor-${tick.year}`"
          class="minor-tick"
          :x1="tick.x"
          :x2="tick.x"
          :y1="timelineAxisY - 7"
          :y2="timelineAxisY + 7"
        />
        <g
          v-for="tick in majorTicks"
          :key="`major-${tick.year}`"
          :transform="`translate(${tick.x} ${timelineAxisY})`"
        >
          <line class="major-tick" y1="-13" y2="13" />
          <text class="tick-label" y="31" text-anchor="middle">
            {{ tick.label }}
          </text>
        </g>
      </g>

      <g class="dynasty-labels" aria-hidden="true">
        <g
          v-for="{ dynasty, x, y } in dynastyLabels"
          :key="`label-${dynasty.id}`"
          :data-test="`dynasty-label-${dynasty.id}`"
          :transform="`translate(${x} ${y})`"
        >
          <text class="dynasty-label" text-anchor="middle">
            {{ dynasty.chineseName }}
          </text>
        </g>
      </g>

      <g
        data-test="prc-track"
        class="prc-track"
        :class="{
          'prc-track--visible':
            hasPrcTrack && prcTrackEnd >= 0 && prcTrackStart <= props.width,
        }"
      >
        <line
          :x1="prcTrackStart"
          :x2="prcTrackEnd"
          :y1="prcTrackY"
          :y2="prcTrackY"
        />
        <circle :cx="prcTrackStart" :cy="prcTrackY" r="5" />
        <text
          :x="Math.max(84, prcTrackStart + 12)"
          :y="prcTrackY + 25"
        >
          1949 · 中华人民共和国
        </text>
      </g>

      <g class="river-events">
        <g
          v-for="node in eventNodes"
          :key="node.event.id"
          class="river-event"
          :data-test="`river-event-${node.event.id}`"
          :transform="`translate(${node.screenX} ${node.screenY})`"
          role="button"
          tabindex="0"
          :aria-label="`${node.event.title}，${node.yearLabel}`"
          @click.stop="selectEvent(node.event)"
          @keydown.enter.stop.prevent="selectEvent(node.event)"
          @keydown.space.stop.prevent="selectEvent(node.event)"
        >
          <g class="river-event__content">
            <line
              class="event-connector"
              x1="0"
              :y1="node.lane * EVENT_LANE_HEIGHT"
              x2="0"
              y2="0"
              :stroke="node.color"
            />
            <circle class="event-dot" r="5" :fill="node.color" />
            <rect
              class="event-card"
              :x="-node.width / 2"
              y="-17"
              :width="node.width"
              height="34"
              rx="9"
              :stroke="node.color"
            />
            <text class="event-title" y="4" text-anchor="middle">
              {{ node.event.title }} · {{ node.yearLabel }}
            </text>
          </g>
        </g>
      </g>

      <g
        v-if="pointerPosition && hoverYear !== null"
        class="hover-year"
        aria-live="polite"
      >
        <line
          data-test="hover-year-line"
          class="hover-year__line"
          :x1="pointerPosition.x"
          :x2="pointerPosition.x"
          y1="0"
          :y2="props.height"
        />
        <g
          data-test="hover-year-badge"
          :transform="`translate(${Math.min(props.width - 68, Math.max(68, pointerPosition.x))} 88)`"
        >
          <rect x="-62" y="-17" width="124" height="34" rx="17" />
          <text y="5" text-anchor="middle">{{ hoverYearLabel }}</text>
        </g>
      </g>
    </svg>
  </section>
</template>

<style scoped>
.china-river-canvas {
  position: relative;
  width: fit-content;
  max-width: 100%;
  overflow: hidden;
  color: #f4ead2;
  background: #030711;
  border: 1px solid rgb(148 163 184 / 18%);
  border-radius: 22px;
  box-shadow:
    0 30px 80px rgb(0 0 0 / 42%),
    inset 0 1px 0 rgb(255 255 255 / 5%);
  isolation: isolate;
  touch-action: none;
}

.river-svg {
  display: block;
  max-width: 100%;
  cursor: crosshair;
  outline: none;
  user-select: none;
}

.river-svg:focus-visible {
  outline: 3px solid #f6d98d;
  outline-offset: -5px;
}

.zoom-surface {
  cursor: grab;
}

.zoom-surface:active {
  cursor: grabbing;
}

.river-world,
.timeline-axis,
.dynasty-labels,
.prc-track {
  pointer-events: none;
}

.dynasty-river {
  opacity: 0.82;
  stroke: rgb(255 255 255 / 14%);
  stroke-width: 1;
}

.minor-tick,
.major-tick {
  stroke: rgb(226 232 240 / 30%);
}

.timeline-divider {
  stroke: rgb(246 217 141 / 24%);
  stroke-width: 1;
}

.major-tick {
  stroke-width: 1.5;
}

.tick-label {
  fill: #98a8bd;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
}

.dynasty-label {
  fill: #fff6dc;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 24px;
  font-weight: 800;
  paint-order: stroke;
  stroke: rgb(3 7 17 / 78%);
  stroke-width: 5px;
}

.prc-track {
  opacity: 0;
  pointer-events: none;
}

.prc-track--visible {
  opacity: 1;
}

.prc-track line {
  stroke: #ef4444;
  stroke-width: 2;
  stroke-dasharray: 7 6;
}

.prc-track circle {
  fill: #fecaca;
  stroke: #ef4444;
  stroke-width: 3;
}

.prc-track text {
  fill: #fecaca;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.river-event {
  cursor: pointer;
  outline: none;
}

.river-event__content {
  transform-box: fill-box;
  transform-origin: center;
  transition:
    transform 160ms ease,
    filter 160ms ease;
}

.river-event:hover .river-event__content,
.river-event:focus-visible .river-event__content {
  filter: drop-shadow(0 7px 14px rgb(0 0 0 / 55%));
  transform: scale(1.12);
}

.river-event:focus-visible .event-card {
  stroke: #fff;
  stroke-width: 3;
}

.event-connector {
  opacity: 0.48;
  stroke-dasharray: 3 4;
  stroke-width: 1.5;
}

.event-card {
  fill: rgb(7 15 27 / 92%);
  stroke-width: 1.5;
}

.event-dot {
  stroke: #fff8e7;
  stroke-width: 1.5;
}

.event-title {
  fill: #f8fafc;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 12px;
  font-weight: 700;
}

.hover-year {
  pointer-events: none;
}

.hover-year__line {
  stroke: rgb(253 230 138 / 68%);
  stroke-dasharray: 4 5;
  stroke-width: 1;
}

.hover-year rect {
  fill: rgb(15 23 42 / 94%);
  stroke: #f6d98d;
}

.hover-year text {
  fill: #fff3c4;
  font-size: 13px;
  font-weight: 800;
}

@media (prefers-reduced-motion: reduce) {
  .river-event__content {
    transition: none;
  }
}
</style>

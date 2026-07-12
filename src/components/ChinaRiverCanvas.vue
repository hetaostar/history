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
  createDynastySegments,
  formatHistoricalYear,
  getEventTypeColor,
  getMaxVisibleImportance,
  layoutRiverEvents,
} from '@/domain/chinaRiverLayout'
import type { IDynastyDisplayItem } from '@/domain/chinaRiverLayout'
import type {
  HistoricalEventImportance,
  IDynasty,
  IHistoricalEvent,
  IViewport,
} from '@/domain/chinaRiverTypes'

const DATA_START_YEAR = -2500
const DATA_END_YEAR = 2025
const INITIAL_CENTER_YEAR = 900
const INITIAL_ZOOM = 0.12
const MIN_ZOOM = 0.05
const MAX_ZOOM = 50
const EVENT_LANE_HEIGHT = 64
const KEYBOARD_PAN_DISTANCE = 80
const KEYBOARD_ZOOM_FACTOR = 1.5
const TIMELINE_BOTTOM_OFFSET = 42
const TIMELINE_DIVIDER_GAP = 44
const DYNASTY_DETAIL_ZOOM = 0.8
const DYNASTY_BAND_MAX_HEIGHT = 140
const DYNASTY_BAND_MIN_HEIGHT = 96
const DYNASTY_BAND_BOTTOM_GAP = 12
const EVENT_BASELINE_GAP = 18
const EVENT_AREA_TOP_PADDING = 24

const props = defineProps<{
  width: number
  height: number
  dynasties: readonly IDynasty[]
  events: readonly IHistoricalEvent[]
}>()

const emit = defineEmits<{
  select: [event: IHistoricalEvent]
  'importance-change': [importance: HistoricalEventImportance]
}>()

const container = ref<HTMLElement | null>(null)
const svg = ref<SVGSVGElement | null>(null)
const zoomSurface = ref<SVGRectElement | null>(null)
const zoomBehavior = ref<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
const viewport = ref<IViewport>(createInitialViewport())
const pointerPosition = ref<{ x: number; y: number } | null>(null)
const instanceId = useId()
const riverBackgroundId = `${instanceId}-river-background`
const eventPaperId = `${instanceId}-event-paper`
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
    ((year - DATA_START_YEAR) / (DATA_END_YEAR - DATA_START_YEAR)) *
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
  const centerWorldX =
    ((INITIAL_CENTER_YEAR - DATA_START_YEAR) /
      (DATA_END_YEAR - DATA_START_YEAR)) *
    (props.width * 8)

  return normalizeViewport({
    x: props.width / 2 - centerWorldX * INITIAL_ZOOM,
    y: 0,
    k: INITIAL_ZOOM,
  })
}

function screenXToYear(screenX: number): number {
  const worldX = (screenX - viewport.value.x) / viewport.value.k
  return Math.round(
    DATA_START_YEAR +
      (worldX / getWorldWidth()) * (DATA_END_YEAR - DATA_START_YEAR),
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

function truncateLabel(value: string, maxCharacters: number): string {
  if (value.length <= maxCharacters) return value
  if (maxCharacters <= 1) return '…'
  return `${value.slice(0, maxCharacters - 1)}…`
}

const maxVisibleImportance = computed(() =>
  getMaxVisibleImportance(viewport.value.k),
)

watch(
  maxVisibleImportance,
  (importance) => emit('importance-change', importance),
  { immediate: true },
)

const timelineAxisY = computed(() =>
  Math.max(96, props.height - TIMELINE_BOTTOM_OFFSET),
)

const timelineDividerY = computed(
  () => timelineAxisY.value - TIMELINE_DIVIDER_GAP,
)

const overviewDynastySegments = computed(() =>
  createDynastySegments(props.dynasties, { grouped: true }),
)

const detailedDynastySegments = computed(() =>
  createDynastySegments(props.dynasties, { grouped: false }),
)

const activeDynastySegments = computed(() =>
  viewport.value.k >= DYNASTY_DETAIL_ZOOM
    ? detailedDynastySegments.value
    : overviewDynastySegments.value,
)

const dynastyBandHeight = computed(() =>
  Math.max(
    DYNASTY_BAND_MIN_HEIGHT,
    Math.min(DYNASTY_BAND_MAX_HEIGHT, props.height * 0.2),
  ),
)

const dynastyBandBottomY = computed(
  () => timelineDividerY.value - DYNASTY_BAND_BOTTOM_GAP,
)

const dynastyBandTopY = computed(
  () => dynastyBandBottomY.value - dynastyBandHeight.value,
)

const eventBaselineY = computed(
  () => dynastyBandTopY.value - EVENT_BASELINE_GAP,
)

const maxEventLanes = computed(() =>
  Math.max(
    1,
    Math.floor(
      (eventBaselineY.value - EVENT_AREA_TOP_PADDING) / EVENT_LANE_HEIGHT,
    ),
  ),
)

const dynastyBands = computed(() =>
  activeDynastySegments.value.map((segment) => ({
    ...segment,
    x: yearToWorldX(segment.startYear),
    width: Math.max(
      1,
      yearToWorldX(segment.endYear) - yearToWorldX(segment.startYear),
    ),
    y:
      dynastyBandTopY.value +
      (segment.stackIndex / segment.stackCount) * dynastyBandHeight.value,
    height: dynastyBandHeight.value / segment.stackCount,
  })),
)

const visibleYearRange = computed(() => {
  const firstYear = Math.max(DATA_START_YEAR, screenXToYear(0))
  const lastYear = Math.min(DATA_END_YEAR, screenXToYear(props.width))
  return firstYear <= lastYear
    ? { start: firstYear, end: lastYear }
    : { start: lastYear, end: firstYear }
})

const visibleYearMargin = computed(
  () => (visibleYearRange.value.end - visibleYearRange.value.start) * 0.05,
)

const dynastyLabels = computed(() =>
  [
    ...dynastyBands.value
      .map(({ item, startYear, endYear, y, height }) => ({
        item,
        labelYear: (startYear + endYear) / 2,
        y: y + height / 2,
        visibleWidth:
          (yearToWorldX(endYear) - yearToWorldX(startYear)) * viewport.value.k,
      }))
      .filter(
        ({ labelYear, visibleWidth, y }) =>
          visibleWidth >= 34 &&
          y >= dynastyBandTopY.value &&
          labelYear >= visibleYearRange.value.start - visibleYearMargin.value &&
          labelYear <= visibleYearRange.value.end + visibleYearMargin.value,
      )
      .reduce((widestByItem, label) => {
        const existing = widestByItem.get(label.item.id)
        if (!existing || label.visibleWidth > existing.visibleWidth) {
          widestByItem.set(label.item.id, label)
        }
        return widestByItem
      }, new Map<string, { item: IDynastyDisplayItem; labelYear: number; y: number; visibleWidth: number }>())
      .values(),
  ]
    .map(({ item, labelYear, y }) => ({
      item,
      x: yearToScreenX(labelYear),
      y,
    }))
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
  const pixelsPerYear = getWorldWidth() / (DATA_END_YEAR - DATA_START_YEAR)
  const visibleEvents = props.events.filter(
    (event) =>
      event.year >= visibleYearRange.value.start - visibleYearMargin.value &&
      event.year <= visibleYearRange.value.end + visibleYearMargin.value,
  )
  return layoutRiverEvents(visibleEvents, {
    zoom: viewport.value.k,
    pixelsPerYear,
    originYear: DATA_START_YEAR,
    maxVisibleImportance: maxVisibleImportance.value,
    maxLane: maxEventLanes.value,
  }).map((node) => {
    const featured = node.event.importance === 1
    const cardHeight = featured ? 58 : 32
    const yearLabel = formatHistoricalYear(node.event.year)
    const availableTitleWidth = featured
      ? node.width - 28
      : node.width - yearLabel.length * 9 - 38
    const maxTitleCharacters = Math.max(
      featured ? 3 : 1,
      Math.floor(availableTitleWidth / 13),
    )

    return {
      ...node,
      featured,
      cardHeight,
      cardWidth: node.width,
      screenX: viewport.value.x + node.x,
      screenY:
        eventBaselineY.value - node.lane * EVENT_LANE_HEIGHT - cardHeight / 2,
      connectorLength: node.lane * EVENT_LANE_HEIGHT + cardHeight / 2,
      color: getEventTypeColor(node.event.type),
      yearLabel,
      displayTitle: truncateLabel(node.event.title, maxTitleCharacters),
    }
  })
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
  () => [props.width, props.height] as const,
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
          <stop offset="0%" stop-color="#123047" />
          <stop offset="52%" stop-color="#0b2538" />
          <stop offset="100%" stop-color="#061a29" />
        </linearGradient>
        <linearGradient :id="eventPaperId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fffdf0" />
          <stop offset="100%" stop-color="#eee7c9" />
        </linearGradient>
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
        <rect
          v-for="{
            id,
            item,
            startYear,
            endYear,
            stackCount,
            x,
            y,
            width: bandWidth,
            height: bandHeight,
          } in dynastyBands"
          :key="id"
          data-test="dynasty-band"
          class="dynasty-band"
          :class="{ 'dynasty-band--group': item.dynasty === null }"
          :data-dynasty-id="item.id"
          :data-start-year="startYear"
          :data-end-year="endYear"
          :data-stack-count="stackCount"
          :x="x"
          :y="y"
          :width="bandWidth"
          :height="bandHeight"
          :fill="item.color"
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
          v-for="offset in [-4, 4]"
          :key="`rail-${offset}`"
          data-test="timeline-rail"
          class="timeline-rail"
          x1="0"
          :x2="props.width"
          :y1="timelineAxisY + offset"
          :y2="timelineAxisY + offset"
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
          v-for="{ item, x, y } in dynastyLabels"
          :key="`label-${item.id}`"
          :data-test="`dynasty-label-${item.id}`"
          :transform="`translate(${x} ${y})`"
        >
          <text class="dynasty-label" text-anchor="middle">
            {{ item.chineseName }}
            <tspan
              v-if="item.memberIds.length > 1"
              class="dynasty-label__count"
            >
              · {{ item.memberIds.length }}政权
            </tspan>
          </text>
        </g>
      </g>

      <g class="river-events">
        <g
          v-for="node in eventNodes"
          :key="node.event.id"
          class="river-event"
          :class="
            node.featured ? 'river-event--featured' : 'river-event--compact'
          "
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
              :y1="node.connectorLength"
              x2="0"
              :y2="node.cardHeight / 2"
              :stroke="node.color"
            />
            <circle
              class="event-dot"
              :cy="node.connectorLength"
              r="5"
              :fill="node.color"
            />
            <rect
              class="event-card"
              :x="-node.cardWidth / 2"
              :y="-node.cardHeight / 2"
              :width="node.cardWidth"
              :height="node.cardHeight"
              :rx="node.featured ? 12 : 16"
              :stroke="node.color"
              :fill="`url(#${eventPaperId})`"
            />
            <text
              v-if="node.featured"
              class="event-title"
              y="-4"
              text-anchor="middle"
            >
              {{ node.displayTitle }}
            </text>
            <text
              v-if="node.featured"
              class="event-meta"
              y="17"
              text-anchor="middle"
            >
              {{ node.yearLabel }}
            </text>
            <text v-else class="event-title" y="4" text-anchor="middle">
              {{ node.displayTitle }} · {{ node.yearLabel }}
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
  color: #f8f1d7;
  background: #061a29;
  border: 1px solid rgb(229 203 139 / 32%);
  border-radius: 18px;
  box-shadow:
    0 28px 72px rgb(0 0 0 / 36%),
    inset 0 1px 0 rgb(255 253 240 / 8%);
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
.dynasty-labels {
  pointer-events: none;
}

.dynasty-band {
  opacity: 0.9;
  stroke: rgb(255 253 240 / 38%);
  stroke-width: 1;
}

.dynasty-band--group {
  opacity: 0.96;
  stroke: #d7bd7a;
  stroke-width: 1.5;
}

.minor-tick,
.major-tick {
  stroke: rgb(235 216 161 / 40%);
}

.timeline-divider {
  stroke: rgb(229 203 139 / 28%);
  stroke-width: 1;
}

.timeline-rail {
  stroke: #d7bd7a;
  stroke-width: 1.5;
}

.major-tick {
  stroke-width: 1.5;
}

.tick-label {
  fill: #c6b98f;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
}

.dynasty-label {
  fill: #fff9e5;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 13px;
  font-weight: 800;
  paint-order: stroke;
  stroke: rgb(6 26 41 / 72%);
  stroke-width: 3px;
}

.dynasty-label__count {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.river-event {
  cursor: pointer;
  outline: none;
}

.river-event__content {
  transform-box: fill-box;
  transform-origin: center;
  transition:
    transform 140ms ease,
    opacity 140ms ease;
}

.river-event:hover .river-event__content,
.river-event:focus-visible .river-event__content {
  opacity: 1;
  transform: translateY(-2px);
}

.river-event:focus-visible .event-card {
  stroke: #fff;
  stroke-width: 3;
}

.event-connector {
  opacity: 0.58;
  stroke-dasharray: 3 4;
  stroke-width: 1.25;
}

.event-card {
  stroke-width: 1.25;
}

.event-dot {
  stroke: #fff8e7;
  stroke-width: 1.5;
}

.event-title {
  fill: #172838;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 12px;
  font-weight: 800;
}

.event-meta {
  fill: #607080;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.river-event--featured .event-card {
  stroke-width: 2;
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
  fill: rgb(8 31 47 / 96%);
  stroke: #d7bd7a;
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

<script setup lang="ts">
import {
  computed,
  onErrorCaptured,
  onMounted,
  onUnmounted,
  ref,
  useId,
  watch,
} from 'vue'
import ChinaRiverCanvas from '@/components/ChinaRiverCanvas.vue'
import RiverEventDetail from '@/components/RiverEventDetail.vue'
import { DYNASTIES } from '@/data/chinaHistoryRiver'
import { getTextbookEvents } from '@/domain/textbookSelectors'
import type { IHistoricalEvent } from '@/domain/chinaRiverTypes'

const MINIMUM_YEAR_PADDING = 40
const YEAR_PADDING_RATIO = 0.08
const TIMELINE_ZOOM = 0.12

const props = defineProps<{
  textbookId: string
}>()

const canvasContainer = ref<HTMLElement | null>(null)
const canvasWidth = ref(0)
const canvasHeight = ref(0)
const selectedEvent = ref<IHistoricalEvent | null>(null)
const renderError = ref('')
const titleId = `${useId()}-textbook-river-title`
let resizeObserver: ResizeObserver | null = null

const events = computed(() => getTextbookEvents(props.textbookId))

const eventYearRange = computed(() => {
  if (events.value.length === 0) return undefined

  return {
    startYear: events.value[0].year,
    endYear: events.value[events.value.length - 1].year,
  }
})

const timelineConfig = computed(() => {
  const range = eventYearRange.value
  if (!range) return undefined

  const span = Math.max(1, range.endYear - range.startYear)
  const padding = Math.max(MINIMUM_YEAR_PADDING, Math.ceil(span * YEAR_PADDING_RATIO))

  return {
    startYear: range.startYear - padding,
    endYear: range.endYear + padding,
    centerYear: (range.startYear + range.endYear) / 2,
  }
})

const dynasties = computed(() => {
  const range = eventYearRange.value
  if (!range) return []

  return DYNASTIES.filter(
    (dynasty) =>
      dynasty.endYear >= range.startYear &&
      dynasty.startYear <= range.endYear,
  )
})

function measureCanvas(): void {
  const container = canvasContainer.value
  if (!container) {
    canvasWidth.value = 0
    canvasHeight.value = 0
    return
  }

  const bounds = container.getBoundingClientRect()
  canvasWidth.value = Math.max(0, Math.floor(bounds.width))
  canvasHeight.value = Math.max(0, Math.floor(bounds.height))
}

function selectEvent(event: IHistoricalEvent): void {
  selectedEvent.value = event
}

function closeEventDetail(): void {
  selectedEvent.value = null
}

onErrorCaptured(() => {
  renderError.value = '本册历史长河加载异常，请刷新页面后重试。'
  selectedEvent.value = null
  return false
})

watch(
  () => props.textbookId,
  () => {
    selectedEvent.value = null
    renderError.value = ''
  },
)

onMounted(() => {
  window.addEventListener('resize', measureCanvas)

  if (typeof ResizeObserver !== 'undefined' && canvasContainer.value) {
    resizeObserver = new ResizeObserver(measureCanvas)
    resizeObserver.observe(canvasContainer.value)
  }

  measureCanvas()
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', measureCanvas)
})
</script>

<template>
  <section
    class="textbook-river-timeline"
    data-test="textbook-river-timeline"
    role="region"
    :aria-labelledby="titleId"
  >
    <header class="timeline-heading">
      <div>
        <p class="eyebrow">Timeline</p>
        <h2 :id="titleId">本册历史长河</h2>
      </div>
      <p>拖动浏览、滚轮缩放，选择事件查看详情。</p>
    </header>

    <div ref="canvasContainer" class="timeline-canvas">
      <p
        v-if="renderError"
        class="timeline-status timeline-status--error"
        data-test="textbook-river-status"
        role="alert"
      >
        {{ renderError }}
      </p>
      <template v-else-if="timelineConfig">
        <ChinaRiverCanvas
          v-if="canvasWidth > 0 && canvasHeight > 0"
          :width="canvasWidth"
          :height="canvasHeight"
          :dynasties="dynasties"
          :events="events"
          :start-year="timelineConfig.startYear"
          :end-year="timelineConfig.endYear"
          :initial-center-year="timelineConfig.centerYear"
          :initial-zoom="TIMELINE_ZOOM"
          @select="selectEvent"
        />
        <p
          v-else
          class="timeline-status"
          data-test="textbook-river-status"
          role="status"
        >
          时间线尺寸暂不可用，请调整浏览器窗口后重试。
        </p>
      </template>
    </div>

    <RiverEventDetail
      v-if="!renderError && selectedEvent"
      :event="selectedEvent"
      read-only
      @close="closeEventDetail"
    />
  </section>
</template>

<style scoped>
.textbook-river-timeline {
  display: grid;
  gap: 22px;
  padding: clamp(22px, 4vw, 36px);
  overflow: hidden;
  color: var(--ink);
  background:
    linear-gradient(90deg, rgb(54 91 76 / 7%) 1px, transparent 1px) 0 0 / 38px
      100%,
    color-mix(in srgb, var(--paper) 88%, white);
  border: 1px solid rgb(74 50 35 / 16%);
  border-radius: 30px;
  box-shadow: 0 18px 45px rgb(36 27 20 / 10%);
}

.timeline-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
}

.timeline-heading h2,
.timeline-heading p {
  margin: 0;
}

.timeline-heading h2 {
  margin-top: 0;
  font-family: var(--font-display);
  font-size: clamp(28px, 5vw, 42px);
  line-height: 1.1;
}

.timeline-heading > p {
  max-width: 480px;
  color: var(--muted-ink);
  line-height: 1.7;
}

.eyebrow {
  margin: 0 0 5px;
  color: var(--cinnabar);
  font-family: var(--font-utility);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.timeline-canvas {
  position: relative;
  height: clamp(480px, 65vh, 660px);
  min-height: 480px;
  overflow: hidden;
  background: #071e2e;
  border: 1px solid color-mix(in srgb, #d8be7b 40%, transparent);
  border-radius: 18px;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #f7f0d5 7%, transparent);
}

.timeline-status {
  position: absolute;
  inset: 0;
  display: grid;
  padding: 28px;
  margin: 0;
  color: #b8c1bc;
  text-align: center;
  background: #071e2e;
  font-family: var(--font-utility);
  font-weight: 800;
  place-items: center;
}

.timeline-status--error {
  color: color-mix(in srgb, #f7f0d5 72%, var(--cinnabar));
}

@media (max-width: 620px) {
  .timeline-heading {
    align-items: start;
    flex-direction: column;
  }

  .timeline-canvas {
    height: 520px;
    min-height: 520px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .textbook-river-timeline {
    scroll-behavior: auto;
  }
}
</style>

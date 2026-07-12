<script setup lang="ts">
import { onErrorCaptured, onMounted, onUnmounted, ref } from 'vue'
import ChinaRiverCanvas from '@/components/ChinaRiverCanvas.vue'
import RiverEventDetail from '@/components/RiverEventDetail.vue'
import { DYNASTIES } from '@/data/chinaHistoryRiver'
import type { IHistoricalEvent } from '@/domain/chinaRiverTypes'
import { getAllTextbookEvents } from '@/domain/textbookSelectors'

const canvasContainer = ref<HTMLElement | null>(null)
const canvasWidth = ref(0)
const canvasHeight = ref(0)
const selectedEvent = ref<IHistoricalEvent | null>(null)
const renderError = ref('')
let resizeObserver: ResizeObserver | null = null
const textbookEvents = getAllTextbookEvents()

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
  renderError.value = '中华历史长河加载异常，请刷新页面后重试。'
  selectedEvent.value = null
  return false
})

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
  <div ref="canvasContainer" class="canvas-container">
    <p
      v-if="renderError"
      class="river-status river-status--error"
      data-test="river-status"
      role="alert"
    >
      {{ renderError }}
    </p>
    <template v-else>
      <ChinaRiverCanvas
        v-if="canvasWidth > 0 && canvasHeight > 0"
        :width="canvasWidth"
        :height="canvasHeight"
        :dynasties="DYNASTIES"
        :events="textbookEvents"
        @select="selectEvent"
      />
      <p v-else class="river-status" data-test="river-status" role="status">
        画布尺寸暂不可用，请调整浏览器窗口后重试。
      </p>
    </template>
  </div>

  <RiverEventDetail
    v-if="!renderError && selectedEvent"
    :event="selectedEvent"
    @close="closeEventDetail"
  />
</template>

<style scoped>
.canvas-container {
  position: relative;
  height: var(--river-canvas-height, 480px);
  min-height: var(--river-canvas-min-height, 480px);
  overflow: hidden;
  background: var(--river-page-background);
  border: 1px solid color-mix(in srgb, var(--river-page-gold) 40%, transparent);
  border-radius: 18px;
  box-shadow:
    0 22px 60px color-mix(in srgb, var(--ink) 30%, transparent),
    inset 0 0 0 1px color-mix(in srgb, var(--river-page-paper) 7%, transparent);
}

.river-status {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 32px;
  margin: 0;
  color: var(--river-page-paper);
  text-align: center;
  background: var(--river-page-background);
  font-family: var(--font-utility);
  font-weight: 800;
}

.river-status--error {
  color: color-mix(in srgb, var(--river-page-paper) 72%, var(--cinnabar));
}
</style>

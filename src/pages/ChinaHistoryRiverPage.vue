<script setup lang="ts">
import { onErrorCaptured, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ChinaRiverCanvas from '@/components/ChinaRiverCanvas.vue'
import RiverEventDetail from '@/components/RiverEventDetail.vue'
import { DYNASTIES, KEY_EVENTS } from '@/data/chinaHistoryRiver'
import type { IHistoricalEvent } from '@/domain/chinaRiverTypes'

const canvasContainer = ref<HTMLElement | null>(null)
const canvasWidth = ref(0)
const canvasHeight = ref(0)
const selectedEvent = ref<IHistoricalEvent | null>(null)
const renderError = ref('')
let resizeObserver: ResizeObserver | null = null

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
  <section class="china-river-page">
    <header class="river-heading">
      <div>
        <RouterLink class="back-link" to="/">返回主页</RouterLink>
        <p class="eyebrow">内置 · 只读 · {{ KEY_EVENTS.length }} 个事件</p>
        <h1>中华历史长河</h1>
        <p class="description">
          以朝代兴衰为河床，沿时间脉络浏览中华文明的重要事件。
        </p>
      </div>
      <p class="desktop-guide">
        桌面端浏览：拖动浏览、滚轮缩放、点击事件查看详情
      </p>
    </header>

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
          :events="KEY_EVENTS"
          @select="selectEvent"
        />
        <p v-else class="river-status" data-test="river-status" role="status">
          画布尺寸暂不可用，请调整桌面浏览器窗口后重试。
        </p>
      </template>
    </div>

    <RiverEventDetail
      v-if="!renderError && selectedEvent"
      :event="selectedEvent"
      @close="closeEventDetail"
    />
  </section>
</template>

<style scoped>
.china-river-page {
  display: grid;
  gap: 18px;
}

.river-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 32px;
  padding: 4px 2px 0;
}

.back-link {
  display: inline-block;
  margin-bottom: 14px;
  color: var(--bronze);
  font-family: var(--font-utility);
  font-size: 14px;
  font-weight: 800;
}

.eyebrow,
.description,
.desktop-guide {
  margin: 0;
}

.eyebrow {
  color: var(--cinnabar);
  font-family: var(--font-utility);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

h1 {
  margin: 4px 0 8px;
  font-family: var(--font-display);
  font-size: clamp(34px, 4vw, 54px);
  line-height: 1;
  letter-spacing: -0.06em;
}

.description {
  color: var(--muted-ink);
}

.desktop-guide {
  flex: 0 0 auto;
  padding: 10px 14px;
  color: var(--paper);
  background: var(--bronze);
  border: 1px solid color-mix(in srgb, var(--aged-gold) 55%, transparent);
  border-radius: 999px;
  font-family: var(--font-utility);
  font-size: 13px;
  font-weight: 800;
}

.canvas-container {
  position: relative;
  min-height: 560px;
  height: max(560px, calc(100vh - 260px));
  overflow: hidden;
  background: #101820;
  border: 1px solid color-mix(in srgb, var(--aged-gold) 58%, var(--ink));
  border-radius: 18px;
  box-shadow:
    0 24px 70px rgb(37 27 22 / 24%),
    inset 0 0 0 1px rgb(255 248 229 / 8%);
}

.river-status {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 32px;
  margin: 0;
  color: var(--paper-deep);
  text-align: center;
  background: #101820;
  font-family: var(--font-utility);
  font-weight: 800;
}

.river-status--error {
  color: #ffd7cc;
}
</style>

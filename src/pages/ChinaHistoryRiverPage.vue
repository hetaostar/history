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
  --river-page-background: #071e2e;
  --river-page-surface: #0b2a3f;
  --river-page-ink: #fff8df;
  --river-page-muted: #b8c1bc;
  --river-page-gold: #d8be7b;
  --river-page-paper: #f7f0d5;

  display: grid;
  gap: clamp(16px, 2vw, 24px);
  padding: clamp(18px, 3vw, 34px);
  color: var(--river-page-ink);
  background:
    radial-gradient(
      circle at 16% 0%,
      color-mix(in srgb, var(--river-page-gold) 12%, transparent),
      transparent 28rem
    ),
    linear-gradient(
      145deg,
      var(--river-page-surface),
      var(--river-page-background) 46%
    );
  border: 1px solid color-mix(in srgb, var(--river-page-gold) 26%, transparent);
  border-radius: 24px;
  box-shadow: 0 30px 80px color-mix(in srgb, var(--ink) 28%, transparent);
}

.river-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  padding: 2px 4px 0;
}

.back-link {
  display: inline-block;
  margin-bottom: 14px;
  color: var(--river-page-gold);
  font-family: var(--font-utility);
  font-size: 14px;
  font-weight: 800;
  text-decoration-color: color-mix(
    in srgb,
    var(--river-page-gold) 42%,
    transparent
  );
}

.eyebrow,
.description,
.desktop-guide {
  margin: 0;
}

.eyebrow {
  color: var(--river-page-gold);
  font-family: var(--font-utility);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.16em;
}

h1 {
  margin: 6px 0 9px;
  font-family: var(--font-display);
  font-size: clamp(34px, 4vw, 52px);
  line-height: 1.04;
  letter-spacing: -0.045em;
  text-shadow: 0 4px 18px color-mix(in srgb, var(--ink) 30%, transparent);
}

.description {
  max-width: 46rem;
  color: var(--river-page-muted);
  line-height: 1.7;
}

.desktop-guide {
  flex: 0 0 auto;
  padding: 10px 14px;
  color: var(--river-page-paper);
  background: color-mix(in srgb, var(--river-page-surface) 82%, transparent);
  border: 1px solid color-mix(in srgb, var(--river-page-gold) 58%, transparent);
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

@media (max-width: 760px) {
  .china-river-page {
    padding: 16px;
    border-radius: 18px;
  }

  .river-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }

  .desktop-guide {
    flex: 1;
    white-space: normal;
  }

  .canvas-container {
    height: max(560px, calc(100vh - 300px));
  }
}
</style>

<script lang="ts">
let riverEventDetailInstanceId = 0
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatHistoricalYear } from '@/domain/chinaRiverLayout'
import { useModalBehavior } from '@/composables/useModalBehavior'
import { useHistoryStore } from '@/stores/historyStore'
import type {
  HistoricalEventType,
  IHistoricalEvent,
} from '@/domain/chinaRiverTypes'
import type { StudyResult } from '@/domain/historyTypes'

const props = defineProps<{
  event: IHistoricalEvent
}>()

const emit = defineEmits<{
  close: []
}>()

const EVENT_TYPE_LABELS: Record<HistoricalEventType, string> = {
  war: '战争',
  culture: '文化',
  politics: '政治',
  science: '科技',
}

const store = useHistoryStore()
const isActive = ref(false)
const titleId = `river-event-detail-title-${++riverEventDetailInstanceId}`
const { containerRef } = useModalBehavior(isActive, () => emit('close'))

const description = computed(() => {
  const localDescription = props.event.description?.trim()
  return localDescription || '暂无更多本地资料'
})

const latestStudyResult = computed<StudyResult | undefined>(() => {
  let latestResult: StudyResult | undefined
  let latestCreatedAt = ''

  store.studyRecords.forEach((record) => {
    if (
      record.targetType === 'event' &&
      record.targetId === props.event.id &&
      record.createdAt >= latestCreatedAt
    ) {
      latestCreatedAt = record.createdAt
      latestResult = record.result
    }
  })

  return latestResult
})

const studyStatus = computed(() => {
  if (latestStudyResult.value === 'remembered') return '当前状态：记住了'
  if (latestStudyResult.value === 'forgotten') return '当前状态：没记住'
  return '当前状态：尚未记录'
})

function recordStudy(result: StudyResult): void {
  store.recordStudy('event', props.event.id, result)
}

onMounted(() => {
  isActive.value = true
})
</script>

<template>
  <div
    ref="containerRef"
    class="event-detail-overlay"
    data-test="event-detail-overlay"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    @click.self="emit('close')"
  >
    <article class="event-detail-sheet">
      <button
        class="close-button"
        data-test="close"
        type="button"
        aria-label="关闭事件详情"
        @click="emit('close')"
      >
        <span aria-hidden="true">×</span>
      </button>

      <header class="event-heading">
        <div class="event-marks">
          <time data-test="event-year" :datetime="String(event.year)">
            {{ formatHistoricalYear(event.year) }}
          </time>
          <span class="event-type" data-test="event-type">
            {{ EVENT_TYPE_LABELS[event.type] }}
          </span>
        </div>
        <h2 :id="titleId">{{ event.title }}</h2>
      </header>

      <div class="ink-divider" aria-hidden="true"></div>

      <p class="event-description" data-test="event-description">
        {{ description }}
      </p>

      <footer class="study-panel">
        <p class="study-question">这件事记住了吗？</p>
        <p class="study-status" data-test="study-status" aria-live="polite">
          {{ studyStatus }}
        </p>
        <div class="study-actions">
          <button
            class="study-button remembered-button"
            data-test="remembered"
            type="button"
            aria-label="将此事件标记为记住了"
            @click="recordStudy('remembered')"
          >
            记住了
          </button>
          <button
            class="study-button forgotten-button"
            data-test="forgotten"
            type="button"
            aria-label="将此事件标记为没记住"
            @click="recordStudy('forgotten')"
          >
            没记住
          </button>
        </div>
        <p v-if="store.lastError" class="save-error" role="alert">
          {{ store.lastError }}
        </p>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.event-detail-overlay {
  --detail-navy: color-mix(in srgb, var(--bronze) 38%, var(--ink));
  --detail-overlay-glow: color-mix(in srgb, var(--aged-gold) 14%, transparent);
  --detail-overlay-scrim: color-mix(
    in srgb,
    var(--detail-navy) 88%,
    transparent
  );
  --detail-paper-line: color-mix(in srgb, var(--muted-ink) 7%, transparent);
  --detail-cinnabar-wash: color-mix(in srgb, var(--cinnabar) 10%, transparent);
  --detail-shadow: color-mix(in srgb, var(--ink) 42%, transparent);
  --detail-gold-inset: color-mix(in srgb, var(--aged-gold) 13%, transparent);
  --detail-error-ink: color-mix(in srgb, var(--cinnabar) 58%, var(--ink));

  position: fixed;
  inset: 0;
  z-index: 220;
  display: grid;
  place-items: center;
  padding: 24px;
  overflow-y: auto;
  background:
    radial-gradient(
      circle at 50% 35%,
      var(--detail-overlay-glow),
      transparent 35%
    ),
    var(--detail-overlay-scrim);
  animation: veil-in 180ms ease-out;
}

.event-detail-sheet {
  position: relative;
  width: min(640px, 100%);
  padding: clamp(28px, 5vw, 52px);
  color: var(--ink);
  background:
    linear-gradient(90deg, var(--detail-paper-line) 1px, transparent 1px) 0 0 /
      32px 100%,
    radial-gradient(
      circle at 88% 8%,
      var(--detail-cinnabar-wash),
      transparent 11rem
    ),
    var(--paper);
  border: 1px solid color-mix(in srgb, var(--aged-gold) 72%, var(--paper-deep));
  border-radius: 18px;
  box-shadow:
    0 32px 90px var(--detail-shadow),
    inset 0 0 0 4px var(--detail-gold-inset);
  animation: sheet-in 220ms ease-out;
}

.close-button {
  position: absolute;
  top: 16px;
  right: 16px;
  display: grid;
  width: 38px;
  height: 38px;
  padding: 0;
  color: var(--muted-ink);
  cursor: pointer;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--muted-ink) 28%, transparent);
  border-radius: 50%;
  place-items: center;
  transition:
    color 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
}

.close-button:hover {
  color: var(--cinnabar);
  border-color: var(--cinnabar);
  transform: rotate(5deg);
}

.close-button span {
  font-family: var(--font-utility);
  font-size: 26px;
  line-height: 1;
}

.event-heading {
  padding-right: 34px;
}

.event-marks {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--muted-ink);
  font-family: var(--font-utility);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.event-type {
  padding: 4px 9px;
  color: var(--paper);
  background: var(--detail-navy);
  border: 1px solid color-mix(in srgb, var(--aged-gold) 62%, transparent);
  border-radius: 999px;
}

h2 {
  margin: 14px 0 0;
  font-family: var(--font-display);
  font-size: clamp(30px, 6vw, 48px);
  line-height: 1.12;
  letter-spacing: -0.04em;
}

.ink-divider {
  width: 100%;
  height: 9px;
  margin: 28px 0 24px;
  background:
    linear-gradient(90deg, var(--ink), var(--ink)) left center / 100% 1px
      no-repeat,
    radial-gradient(circle, var(--cinnabar) 0 3px, transparent 3.5px) center /
      9px 9px no-repeat;
  opacity: 0.72;
}

.event-description {
  min-height: 4.8em;
  margin: 0;
  color: var(--ink);
  font-size: 18px;
  line-height: 1.9;
  white-space: pre-wrap;
}

.study-panel {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px 18px;
  margin-top: 34px;
  padding-top: 22px;
  border-top: 1px solid color-mix(in srgb, var(--muted-ink) 22%, transparent);
}

.study-question,
.study-status,
.save-error {
  margin: 0;
}

.study-question {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
}

.study-status {
  align-self: center;
  color: var(--muted-ink);
  font-family: var(--font-utility);
  font-size: 13px;
}

.study-actions {
  display: flex;
  grid-column: 1 / -1;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}

.study-button {
  min-width: 112px;
  padding: 10px 18px;
  font-family: var(--font-utility);
  font-weight: 800;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 999px;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.study-button:hover {
  transform: translateY(-1px);
}

.remembered-button {
  color: var(--paper);
  background: var(--detail-navy);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--detail-navy) 22%, transparent);
}

.forgotten-button {
  color: var(--detail-navy);
  background: transparent;
  border-color: color-mix(in srgb, var(--detail-navy) 48%, transparent);
}

.close-button:focus-visible,
.study-button:focus-visible {
  outline: 3px solid var(--ink);
  outline-offset: 4px;
}

.save-error {
  grid-column: 1 / -1;
  margin-top: 4px;
  padding: 10px 12px;
  color: var(--detail-error-ink);
  font-size: 14px;
  background: color-mix(in srgb, var(--cinnabar) 9%, transparent);
  border-left: 3px solid var(--cinnabar);
}

@keyframes veil-in {
  from {
    opacity: 0;
  }
}

@keyframes sheet-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }
}

@media (max-width: 560px) {
  .event-detail-overlay {
    align-items: end;
    padding: 12px;
  }

  .event-detail-sheet {
    max-height: calc(100vh - 24px);
    padding: 32px 24px 26px;
    overflow-y: auto;
  }

  .study-panel {
    grid-template-columns: 1fr;
  }

  .study-actions {
    grid-column: 1;
  }

  .study-button {
    flex: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .event-detail-overlay,
  .event-detail-sheet {
    animation: none;
  }

  .close-button,
  .study-button {
    transition: none;
  }
}
</style>

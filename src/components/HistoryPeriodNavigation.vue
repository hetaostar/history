<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { IHistoryPeriod } from '@/domain/historyPeriods'

const props = defineProps<{
  periods: readonly IHistoryPeriod[]
  activePeriodId: string
}>()

const emit = defineEmits<{
  select: [periodId: string]
}>()

const navigationElement = ref<HTMLElement | null>(null)

watch(
  () => props.activePeriodId,
  async (periodId) => {
    await nextTick()
    const activeButton = navigationElement.value?.querySelector<HTMLElement>(
      `[data-period-id="${periodId}"]`,
    )
    activeButton?.scrollIntoView({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
  },
)
</script>

<template>
  <nav
    ref="navigationElement"
    class="period-navigation"
    aria-label="朝代导航"
  >
    <p class="navigation-title">朝代索引</p>
    <ol class="period-list">
      <li v-for="period in periods" :key="period.id">
        <button
          class="period-button"
          :class="{ 'is-active': period.id === activePeriodId }"
          type="button"
          :data-test="`period-navigation-${period.id}`"
          :data-period-id="period.id"
          :aria-current="
            period.id === activePeriodId ? 'location' : undefined
          "
          @click="emit('select', period.id)"
        >
          <span class="period-marker" aria-hidden="true"></span>
          <span>{{ period.name }}</span>
        </button>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.period-navigation {
  display: grid;
  gap: 12px;
  max-height: calc(100vh - 116px);
  padding: 16px 14px;
  overflow-y: auto;
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--muted-ink) 18%, transparent);
  border-radius: 18px;
  box-shadow: 0 14px 34px color-mix(in srgb, var(--ink) 8%, transparent);
  backdrop-filter: blur(12px);
}

.navigation-title {
  margin: 0;
  color: var(--bronze);
  font-family: var(--font-utility);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.period-list {
  display: grid;
  gap: 2px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.period-button {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 7px 6px;
  color: var(--muted-ink);
  font-family: var(--font-display);
  font-size: 14px;
  line-height: 1.25;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
}

.period-button:hover,
.period-button.is-active {
  color: var(--cinnabar);
  background: color-mix(in srgb, var(--cinnabar) 8%, transparent);
}

.period-button:focus-visible {
  outline: 2px solid var(--cinnabar);
  outline-offset: 2px;
}

.period-marker {
  width: 6px;
  height: 6px;
  background: currentcolor;
  border-radius: 50%;
  opacity: 0.35;
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.period-button.is-active .period-marker {
  opacity: 1;
  transform: scale(1.45);
}

@media (max-width: 760px) {
  .period-navigation {
    display: block;
    max-height: none;
    padding: 10px;
    overflow-x: auto;
    overflow-y: hidden;
    border-radius: 14px;
    scrollbar-width: thin;
  }

  .navigation-title {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  .period-list {
    display: flex;
    gap: 4px;
    width: max-content;
  }

  .period-button {
    display: flex;
    width: auto;
    padding: 8px 10px;
    white-space: nowrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .period-marker {
    transition: none;
  }
}
</style>

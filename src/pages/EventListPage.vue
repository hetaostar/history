<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  type ComponentPublicInstance,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EntityCard from '@/components/EntityCard.vue'
import HistoryPeriodNavigation from '@/components/HistoryPeriodNavigation.vue'
import RiverEventDetail from '@/components/RiverEventDetail.vue'
import { formatHistoricalYear } from '@/domain/chinaRiverLayout'
import {
  groupHistoricalEventsByPeriod,
  HISTORY_PERIODS,
} from '@/domain/historyPeriods'
import { getAllTextbookEvents } from '@/domain/textbookSelectors'

const route = useRoute()
const router = useRouter()
const periodSections = new Map<string, HTMLElement>()
const activePeriodId = ref<string>(HISTORY_PERIODS[0].id)
const appHeaderHeight = ref(0)
let appHeaderObserver: ResizeObserver | null = null

const textbookEvents = getAllTextbookEvents()
const periodGroups = computed(() =>
  groupHistoricalEventsByPeriod(textbookEvents),
)
const events = computed(() =>
  periodGroups.value.flatMap((group) => group.events),
)

const selectedEvent = computed(
  () =>
    events.value.find(
      (event) => event.id === String(route.query.event ?? ''),
    ) ?? null,
)

function closeEventDetail(): void {
  const query = { ...route.query }
  delete query.event
  void router.replace({ query, hash: route.hash })
}

function formatPeriodRange(startYear: number, endYear: number): string {
  return `${formatHistoricalYear(startYear)}—${formatHistoricalYear(endYear)}`
}

function setPeriodSectionRef(
  periodId: string,
  element: Element | ComponentPublicInstance | null,
): void {
  if (element instanceof HTMLElement) {
    periodSections.set(periodId, element)
    return
  }

  periodSections.delete(periodId)
}

function getPeriodIdFromHash(hash: string): string | null {
  const prefix = '#period-'
  if (!hash.startsWith(prefix)) {
    return null
  }

  const periodId = hash.slice(prefix.length)
  return HISTORY_PERIODS.some((period) => period.id === periodId)
    ? periodId
    : null
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

async function scrollToPeriod(
  periodId: string,
  behavior: ScrollBehavior,
  updateHash = true,
): Promise<void> {
  const section = periodSections.get(periodId)
  if (!section) {
    return
  }

  activePeriodId.value = periodId
  if (updateHash) {
    await router.replace({
      query: route.query,
      hash: `#period-${periodId}`,
    })
  }
  await nextTick()
  section.scrollIntoView({
    behavior:
      behavior === 'smooth' && prefersReducedMotion() ? 'auto' : behavior,
    block: 'start',
  })
}

function selectPeriod(periodId: string): void {
  void scrollToPeriod(periodId, 'smooth')
}

function getPeriodActivationOffset(): number {
  return window.matchMedia?.('(max-width: 760px)').matches
    ? appHeaderHeight.value + 68
    : 96
}

function updateActivePeriodFromScroll(): void {
  const activationOffset = getPeriodActivationOffset()
  let currentPeriodId: string = HISTORY_PERIODS[0].id

  for (const period of HISTORY_PERIODS) {
    const section = periodSections.get(period.id)
    if (!section) {
      continue
    }
    if (section.getBoundingClientRect().top > activationOffset) {
      break
    }
    currentPeriodId = period.id
  }

  activePeriodId.value = currentPeriodId
}

function updateAppHeaderHeight(): void {
  const appHeader = document.querySelector<HTMLElement>('.app-header')
  appHeaderHeight.value = Math.ceil(
    appHeader?.getBoundingClientRect().height ?? 0,
  )
}

function observeAppHeader(): void {
  updateAppHeaderHeight()
  window.addEventListener('resize', updateAppHeaderHeight)
  window.addEventListener('scroll', updateActivePeriodFromScroll, {
    passive: true,
  })

  if (typeof ResizeObserver !== 'undefined') {
    const appHeader = document.querySelector<HTMLElement>('.app-header')
    if (appHeader) {
      appHeaderObserver = new ResizeObserver(updateAppHeaderHeight)
      appHeaderObserver.observe(appHeader)
    }
  }
}

onMounted(async () => {
  await nextTick()
  observeAppHeader()
  const initialPeriodId = getPeriodIdFromHash(route.hash)
  if (initialPeriodId) {
    await scrollToPeriod(initialPeriodId, 'auto', false)
  }
})

onBeforeUnmount(() => {
  appHeaderObserver?.disconnect()
  window.removeEventListener('resize', updateAppHeaderHeight)
  window.removeEventListener('scroll', updateActivePeriodFromScroll)
})
</script>

<template>
  <section
    class="event-page"
    :style="{ '--app-header-height': `${appHeaderHeight}px` }"
  >
    <header class="page-header">
      <p class="eyebrow">China history archive</p>
      <h1>事件</h1>
      <p class="page-intro">
        依年代浏览中华历史长河中的关键事件，点击任一卡片查看详情并记录背诵结果。
      </p>
    </header>

    <section class="event-catalog" aria-labelledby="event-catalog-title">
      <div class="catalog-heading">
        <div>
          <p class="catalog-meta">
            教材 · 只读 · {{ events.length }} 个事件
          </p>
          <h2 id="event-catalog-title">中华历史事件卡片</h2>
        </div>
        <span v-if="events.length" class="year-range">
          {{ formatHistoricalYear(events[0].year) }}—{{
            formatHistoricalYear(events[events.length - 1].year)
          }}
        </span>
      </div>

      <div class="catalog-layout">
        <div class="period-groups">
          <section
            v-for="group in periodGroups"
            :id="`period-${group.period.id}`"
            :key="group.period.id"
            :ref="
              (element) => setPeriodSectionRef(group.period.id, element)
            "
            class="period-section"
            :data-period-id="group.period.id"
            :data-test="`period-section-${group.period.id}`"
            :aria-labelledby="`period-title-${group.period.id}`"
          >
            <header class="period-heading">
              <div>
                <p class="period-range">
                  {{
                    formatPeriodRange(
                      group.period.startYear,
                      group.period.endYear,
                    )
                  }}
                </p>
                <h3 :id="`period-title-${group.period.id}`">
                  {{ group.period.name }}
                </h3>
              </div>
              <span class="period-count">{{ group.events.length }} 件</span>
            </header>

            <div v-if="group.events.length" class="event-grid">
              <RouterLink
                v-for="event in group.events"
                :key="event.id"
                class="event-card-link"
                :data-test="`event-card-${event.id}`"
                :to="{
                  query: { ...route.query, event: event.id },
                  hash: route.hash,
                }"
                replace
                :aria-label="`查看${event.title}详情`"
              >
                <EntityCard
                  :title="event.title"
                  :subtitle="formatHistoricalYear(event.year)"
                  :summary="event.description"
                />
              </RouterLink>
            </div>
            <p v-else class="period-empty">暂无收录事件</p>
          </section>
        </div>

        <aside class="period-navigation-column">
          <HistoryPeriodNavigation
            data-test="period-navigation"
            :periods="HISTORY_PERIODS"
            :active-period-id="activePeriodId"
            @select="selectPeriod"
          />
        </aside>
      </div>
    </section>

    <RiverEventDetail
      v-if="selectedEvent"
      :key="selectedEvent.id"
      :event="selectedEvent"
      @close="closeEventDetail"
    />
  </section>
</template>

<style scoped>
.event-page {
  display: grid;
  gap: 28px;
}

.page-header {
  display: grid;
  gap: 10px;
  max-width: 780px;
}

.eyebrow,
.catalog-meta,
.year-range {
  color: var(--cinnabar);
  font-family: var(--font-utility);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.eyebrow,
.catalog-meta,
.page-intro {
  margin: 0;
}

.page-header h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(44px, 7vw, 74px);
  line-height: 1;
  letter-spacing: -0.06em;
}

.page-intro {
  color: var(--muted-ink);
  font-size: 17px;
  line-height: 1.8;
}

.event-catalog {
  display: grid;
  gap: 22px;
  padding: clamp(20px, 4vw, 34px);
  background: color-mix(in srgb, var(--paper) 84%, transparent);
  border: 1px solid color-mix(in srgb, var(--muted-ink) 18%, transparent);
  border-radius: 28px;
  box-shadow: 0 22px 54px color-mix(in srgb, var(--ink) 10%, transparent);
}

.catalog-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 18px;
  border-bottom: 1px solid
    color-mix(in srgb, var(--muted-ink) 18%, transparent);
}

.catalog-heading h2 {
  margin: 6px 0 0;
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.1;
}

.year-range {
  flex: 0 0 auto;
  color: var(--bronze);
  letter-spacing: 0.06em;
}

.catalog-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 164px;
  gap: clamp(20px, 3vw, 34px);
  align-items: start;
}

.period-groups {
  display: grid;
  gap: clamp(42px, 7vw, 68px);
  min-width: 0;
}

.period-section {
  display: grid;
  gap: 20px;
  min-width: 0;
  scroll-margin-top: 108px;
}

.period-heading {
  position: relative;
  display: flex;
  gap: 18px;
  align-items: end;
  justify-content: space-between;
  padding-top: 22px;
}

.period-heading::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 1px;
  content: '';
  background:
    linear-gradient(
      90deg,
      var(--cinnabar) 0 56px,
      color-mix(in srgb, var(--muted-ink) 20%, transparent) 56px 100%
    );
}

.period-heading::after {
  position: absolute;
  top: -3px;
  left: 0;
  width: 7px;
  height: 7px;
  content: '';
  background: var(--cinnabar);
  border-radius: 50%;
}

.period-heading h3 {
  margin: 4px 0 0;
  font-family: var(--font-display);
  font-size: clamp(26px, 4vw, 38px);
  line-height: 1.1;
}

.period-range,
.period-count {
  color: var(--bronze);
  font-family: var(--font-utility);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.period-range {
  margin: 0;
}

.period-count {
  flex: 0 0 auto;
  padding-bottom: 4px;
}

.period-empty {
  padding: 22px;
  margin: 0;
  color: var(--muted-ink);
  text-align: center;
  background: color-mix(in srgb, var(--paper) 72%, transparent);
  border: 1px dashed color-mix(in srgb, var(--muted-ink) 24%, transparent);
  border-radius: 14px;
}

.period-navigation-column {
  position: sticky;
  top: 92px;
  min-width: 0;
}

.event-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.event-card-link {
  display: block;
  min-width: 0;
  padding: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 16px;
  text-decoration: none;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.event-card-link :deep(.entity-card) {
  height: 100%;
}

.event-card-link:hover {
  box-shadow: 0 18px 36px color-mix(in srgb, var(--ink) 14%, transparent);
  transform: translateY(-3px);
}

.event-card-link:focus-visible {
  outline: 3px solid var(--cinnabar);
  outline-offset: 4px;
}

@media (max-width: 620px) {
  .event-page {
    gap: 22px;
  }

  .event-catalog {
    padding: 18px;
    border-radius: 22px;
  }

  .catalog-heading {
    align-items: start;
    flex-direction: column;
  }

  .event-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .catalog-layout {
    display: flex;
    flex-direction: column;
  }

  .period-navigation-column {
    top: var(--app-header-height);
    z-index: 9;
    order: -1;
    width: 100%;
  }

  .period-section {
    scroll-margin-top: calc(var(--app-header-height) + 68px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .event-card-link {
    transition: none;
  }
}
</style>

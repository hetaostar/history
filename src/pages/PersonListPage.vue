<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type ComponentPublicInstance,
} from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import HistoryPeriodNavigation from '@/components/HistoryPeriodNavigation.vue'
import TextbookPersonDetail from '@/components/TextbookPersonDetail.vue'
import {
  TEXTBOOK_LESSONS,
  TEXTBOOK_PEOPLE,
  TEXTBOOK_UNITS,
  TEXTBOOKS,
} from '@/data/textbooks'
import {
  groupTextbookPeopleByHistoryPeriod,
  PERSON_HISTORY_PERIODS,
} from '@/domain/personHistoryPeriods'
import { buildTextbookPeopleCatalog } from '@/domain/textbookPeopleCatalog'

const route = useRoute()
const router = useRouter()
const catalog = buildTextbookPeopleCatalog(
  TEXTBOOKS,
  TEXTBOOK_PEOPLE,
  TEXTBOOK_UNITS,
  TEXTBOOK_LESSONS,
)
const periodGroups = groupTextbookPeopleByHistoryPeriod(catalog)
const periodSections = new Map<string, HTMLElement>()
const activePeriodId = ref<string>(PERSON_HISTORY_PERIODS[0].id)
const appHeaderHeight = ref(0)
let appHeaderObserver: ResizeObserver | null = null

const selectedPerson = computed(() => {
  const personId = String(route.query.person ?? '')
  return (
    periodGroups
      .flatMap((group) => group.entries)
      .find((entry) => entry.person.id === personId)?.person ?? null
  )
})

function openPersonDetail(personId: string): void {
  void router.replace({
    query: { ...route.query, person: personId },
    hash: route.hash,
  })
}

function closePersonDetail(): void {
  const query = { ...route.query }
  delete query.person
  void router.replace({ query, hash: route.hash })
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
  return PERSON_HISTORY_PERIODS.some((period) => period.id === periodId)
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
  let currentPeriodId = PERSON_HISTORY_PERIODS[0].id

  for (const period of PERSON_HISTORY_PERIODS) {
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

function observePagePosition(): void {
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

watch(
  () => route.hash,
  async (hash) => {
    const periodId = getPeriodIdFromHash(hash)
    if (!periodId || periodId === activePeriodId.value) {
      return
    }

    await scrollToPeriod(periodId, 'auto', false)
  },
)

onMounted(async () => {
  await nextTick()
  observePagePosition()
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
    class="person-page"
    :style="{ '--app-header-height': `${appHeaderHeight}px` }"
  >
    <header class="page-header">
      <p class="eyebrow">Textbook people archive</p>
      <h1>教材人物</h1>
      <p class="page-intro">
        按朝代浏览历史人物，结合人物线索与所在课程建立知识联系。
      </p>
    </header>

    <section class="person-catalog" aria-labelledby="person-catalog-title">
      <div class="catalog-heading">
        <div>
          <p class="catalog-meta">
            内置 · 只读 · {{ catalog.uniquePersonCount }} 位人物
          </p>
          <h2 id="person-catalog-title">教材人物卡片</h2>
        </div>
        <span class="period-total">
          {{ PERSON_HISTORY_PERIODS.length }} 个历史时期
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
            :data-test="`period-section-${group.period.id}`"
            :aria-labelledby="`period-title-${group.period.id}`"
          >
            <header class="period-heading">
              <div>
                <p class="period-range">
                  {{ group.period.rangeLabel }}
                </p>
                <h3 :id="`period-title-${group.period.id}`">
                  {{ group.period.name }}
                </h3>
              </div>
              <span class="period-count">{{ group.entries.length }} 位</span>
            </header>

            <div v-if="group.entries.length" class="person-grid">
              <article
                v-for="entry in group.entries"
                :key="entry.person.id"
                class="person-card"
                :data-test="`person-card-${entry.person.id}`"
              >
                <button
                  class="person-detail-button"
                  :data-test="`open-person-${entry.person.id}`"
                  type="button"
                  :aria-label="`查看${entry.person.name}详情`"
                  @click="openPersonDetail(entry.person.id)"
                >
                  <span class="person-lifetime">{{ entry.person.lifeTime }}</span>
                  <strong>{{ entry.person.name }}</strong>
                  <span class="person-summary">{{ entry.person.summary }}</span>
                </button>
                <template
                  v-for="membership in entry.memberships"
                  :key="membership.textbook.id"
                >
                  <RouterLink
                    v-for="lesson in membership.lessons"
                    :key="lesson.id"
                    class="lesson-link"
                    :data-test="`person-lesson-${lesson.id}`"
                    :to="`/textbooks/${membership.textbook.id}/lessons/${lesson.id}`"
                  >
                    第{{ lesson.lessonNumber }}课 {{ lesson.title }}
                  </RouterLink>
                </template>
              </article>
            </div>
            <p v-else class="period-empty">暂无收录人物</p>
          </section>
        </div>

        <aside class="period-navigation-column">
          <HistoryPeriodNavigation
            :periods="PERSON_HISTORY_PERIODS"
            :active-period-id="activePeriodId"
            @select="selectPeriod"
          />
        </aside>
      </div>
    </section>

    <TextbookPersonDetail
      v-if="selectedPerson"
      :key="selectedPerson.id"
      :person="selectedPerson"
      :groups="catalog.groups"
      @close="closePersonDetail"
    />
  </section>
</template>

<style scoped>
.person-page {
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
.period-total {
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

.person-catalog {
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

.period-total {
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
  background: linear-gradient(
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

.period-navigation-column {
  position: sticky;
  top: 92px;
  min-width: 0;
}

.person-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
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

.person-card {
  display: grid;
  align-content: start;
  gap: 8px;
  min-width: 0;
  padding: 18px;
  background: color-mix(in srgb, var(--paper) 94%, transparent);
  border: 1px solid color-mix(in srgb, var(--muted-ink) 18%, transparent);
  border-radius: 16px;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--ink) 8%, transparent);
}

.person-detail-button {
  display: grid;
  gap: 9px;
  width: 100%;
  padding: 0 0 12px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-bottom: 1px solid
    color-mix(in srgb, var(--muted-ink) 16%, transparent);
}

.person-detail-button strong {
  font-family: var(--font-display);
  font-size: 24px;
}

.person-lifetime {
  color: var(--bronze);
  font-family: var(--font-utility);
  font-size: 12px;
  font-weight: 800;
}

.person-summary {
  color: var(--muted-ink);
  line-height: 1.65;
}

.lesson-link {
  display: block;
  padding: 7px 9px;
  color: var(--ink);
  font-size: 13px;
  text-decoration: none;
  background: color-mix(in srgb, var(--aged-gold) 9%, transparent);
  border-radius: 8px;
}

.person-detail-button:focus-visible,
.lesson-link:focus-visible {
  outline: 3px solid var(--cinnabar);
  outline-offset: 3px;
}

@media (max-width: 620px) {
  .person-page {
    gap: 22px;
  }

  .person-catalog {
    padding: 18px;
    border-radius: 22px;
  }

  .catalog-heading {
    align-items: start;
    flex-direction: column;
  }

  .person-grid {
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
  .person-card {
    scroll-behavior: auto;
  }
}
</style>

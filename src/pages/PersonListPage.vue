<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  type ComponentPublicInstance,
} from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import TextbookPersonDetail from '@/components/TextbookPersonDetail.vue'
import TextbookVolumeNavigation from '@/components/TextbookVolumeNavigation.vue'
import {
  TEXTBOOK_LESSONS,
  TEXTBOOK_PEOPLE,
  TEXTBOOK_UNITS,
  TEXTBOOKS,
} from '@/data/textbooks'
import { buildPublishedTextbookPeopleCatalog } from '@/domain/textbookPeopleCatalog'
import { getTextbookPersonById } from '@/domain/textbookSelectors'
import type { ITextbookPerson } from '@/domain/textbookTypes'

const route = useRoute()
const router = useRouter()
const textbookSections = new Map<string, HTMLElement>()
const publishedTextbooks = TEXTBOOKS.filter(
  (textbook) => textbook.status === 'published',
)
const peopleCatalog = buildPublishedTextbookPeopleCatalog(
  TEXTBOOKS,
  TEXTBOOK_PEOPLE,
  TEXTBOOK_UNITS,
  TEXTBOOK_LESSONS,
)
const activeTextbookId = ref<string>(publishedTextbooks[0]?.id ?? '')
const appHeaderHeight = ref(0)
let appHeaderObserver: ResizeObserver | null = null

const textbookGroups = peopleCatalog.groups
const uniquePersonCount = peopleCatalog.uniquePersonCount

const selectedPerson = computed(
  () => getTextbookPersonById(String(route.query.person ?? '')) ?? null,
)

function openPerson(person: ITextbookPerson): void {
  void router.replace({
    query: { ...route.query, person: person.id },
    hash: route.hash,
  })
}

function closePersonDetail(): void {
  const query = { ...route.query }
  delete query.person
  void router.replace({ query, hash: route.hash })
}

function setTextbookSectionRef(
  textbookId: string,
  element: Element | ComponentPublicInstance | null,
): void {
  if (element instanceof HTMLElement) {
    textbookSections.set(textbookId, element)
    return
  }
  textbookSections.delete(textbookId)
}

function getTextbookIdFromHash(hash: string): string | null {
  const prefix = '#textbook-'
  if (!hash.startsWith(prefix)) {
    return null
  }
  const textbookId = hash.slice(prefix.length)
  return publishedTextbooks.some(({ id }) => id === textbookId)
    ? textbookId
    : null
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

async function scrollToTextbook(
  textbookId: string,
  behavior: ScrollBehavior,
  updateHash = true,
): Promise<void> {
  const section = textbookSections.get(textbookId)
  if (!section) {
    return
  }

  activeTextbookId.value = textbookId
  if (updateHash) {
    await router.replace({
      query: route.query,
      hash: `#textbook-${textbookId}`,
    })
  }
  await nextTick()
  section.scrollIntoView({
    behavior:
      behavior === 'smooth' && prefersReducedMotion() ? 'auto' : behavior,
    block: 'start',
  })
}

function selectTextbook(textbookId: string): void {
  void scrollToTextbook(textbookId, 'smooth')
}

function getActivationOffset(): number {
  return window.matchMedia?.('(max-width: 760px)').matches
    ? appHeaderHeight.value + 68
    : 96
}

function updateActiveTextbookFromScroll(): void {
  const activationOffset = getActivationOffset()
  let currentTextbookId = publishedTextbooks[0]?.id ?? ''

  for (const textbook of publishedTextbooks) {
    const section = textbookSections.get(textbook.id)
    if (!section) {
      continue
    }
    if (section.getBoundingClientRect().top > activationOffset) {
      break
    }
    currentTextbookId = textbook.id
  }

  activeTextbookId.value = currentTextbookId
}

function updateAppHeaderHeight(): void {
  const appHeader = document.querySelector<HTMLElement>('.app-header')
  appHeaderHeight.value = Math.ceil(
    appHeader?.getBoundingClientRect().height ?? 0,
  )
}

function observePageLayout(): void {
  updateAppHeaderHeight()
  window.addEventListener('resize', updateAppHeaderHeight)
  window.addEventListener('scroll', updateActiveTextbookFromScroll, {
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
  observePageLayout()
  const initialTextbookId = getTextbookIdFromHash(route.hash)
  if (initialTextbookId) {
    await scrollToTextbook(initialTextbookId, 'auto', false)
  }
})

onBeforeUnmount(() => {
  appHeaderObserver?.disconnect()
  window.removeEventListener('resize', updateAppHeaderHeight)
  window.removeEventListener('scroll', updateActiveTextbookFromScroll)
})
</script>

<template>
  <section
    class="person-page"
    :style="{ '--app-header-height': `${appHeaderHeight}px` }"
  >
    <header class="page-header">
      <p class="eyebrow">Textbook people archive</p>
      <h1>人物</h1>
      <p class="page-intro">
        沿教材册次查阅重要人物，在具体课程中回到人物所处的历史脉络。
      </p>
    </header>

    <section class="person-catalog" aria-labelledby="person-catalog-title">
      <div class="catalog-heading">
        <div>
          <p class="catalog-meta">
            内置 · 只读 · {{ uniquePersonCount }} 个人物
          </p>
          <h2 id="person-catalog-title">统编历史教材人物目录</h2>
        </div>
        <span class="edition-mark">2024 · 人教版</span>
      </div>

      <div class="catalog-layout">
        <div class="textbook-groups">
          <section
            v-for="group in textbookGroups"
            :id="`textbook-${group.textbook.id}`"
            :key="group.textbook.id"
            :ref="
              (element) => setTextbookSectionRef(group.textbook.id, element)
            "
            class="textbook-section"
            :data-textbook-id="group.textbook.id"
            :data-test="`textbook-section-${group.textbook.id}`"
            :aria-labelledby="`textbook-title-${group.textbook.id}`"
          >
            <header class="textbook-heading">
              <div>
                <p class="textbook-edition">
                  {{ group.textbook.edition }} ·
                  {{ group.textbook.revisionYear }} 年
                </p>
                <h3 :id="`textbook-title-${group.textbook.id}`">
                  {{ group.textbook.title }}
                </h3>
                <p class="textbook-summary">{{ group.textbook.summary }}</p>
              </div>
              <span class="textbook-count">{{ group.people.length }} 人</span>
            </header>

            <div class="person-grid">
              <article
                v-for="entry in group.entries"
                :key="entry.person.id"
                class="person-card"
                :data-test="`textbook-person-${group.textbook.id}-${entry.person.id}`"
              >
                <button
                  class="person-detail-trigger"
                  type="button"
                  :data-test="`person-detail-trigger-${group.textbook.id}-${entry.person.id}`"
                  :aria-label="`查看${entry.person.name}详情`"
                  @click="openPerson(entry.person)"
                >
                  <span class="person-lifetime">
                    {{ entry.person.lifeTime }}
                  </span>
                  <strong>{{ entry.person.name }}</strong>
                  <span class="person-summary">{{ entry.person.summary }}</span>
                </button>
                <div class="lesson-links" aria-label="关联课程">
                  <RouterLink
                    v-for="lesson in entry.lessons"
                    :key="lesson.id"
                    :data-test="`person-card-lesson-${group.textbook.id}-${lesson.id}`"
                    :to="`/textbooks/${group.textbook.id}/lessons/${lesson.id}`"
                  >
                    第{{ lesson.lessonNumber }}课 · {{ lesson.title }}
                  </RouterLink>
                </div>
              </article>
            </div>
          </section>
        </div>

        <aside class="textbook-navigation-column">
          <TextbookVolumeNavigation
            data-test="textbook-navigation"
            :textbooks="publishedTextbooks"
            :active-textbook-id="activeTextbookId"
            @select="selectTextbook"
          />
        </aside>
      </div>
    </section>

    <TextbookPersonDetail
      v-if="selectedPerson"
      :key="selectedPerson.id"
      :person="selectedPerson"
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
.edition-mark {
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

.edition-mark {
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

.textbook-groups {
  display: grid;
  gap: clamp(42px, 7vw, 68px);
  min-width: 0;
}

.textbook-section {
  display: grid;
  gap: 20px;
  min-width: 0;
  scroll-margin-top: 108px;
}

.textbook-heading {
  position: relative;
  display: flex;
  gap: 18px;
  align-items: end;
  justify-content: space-between;
  padding-top: 22px;
}

.textbook-heading::before {
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

.textbook-heading::after {
  position: absolute;
  top: -3px;
  left: 0;
  width: 7px;
  height: 7px;
  content: '';
  background: var(--cinnabar);
  border-radius: 50%;
}

.textbook-heading h3 {
  margin: 5px 0 0;
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.1;
}

.textbook-edition,
.textbook-count {
  color: var(--bronze);
  font-family: var(--font-utility);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.textbook-edition,
.textbook-summary {
  margin: 0;
}

.textbook-summary {
  max-width: 680px;
  margin-top: 9px;
  color: var(--muted-ink);
  line-height: 1.65;
}

.textbook-count {
  flex: 0 0 auto;
  padding-bottom: 4px;
}

.textbook-navigation-column {
  position: sticky;
  top: 92px;
  min-width: 0;
}

.person-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.person-card {
  position: relative;
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 20px;
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--aged-gold) 18%, transparent) 1px,
      transparent 1px
    ),
    color-mix(in srgb, var(--paper) 90%, transparent);
  border: 1px solid color-mix(in srgb, var(--muted-ink) 18%, transparent);
  border-radius: 16px;
  box-shadow: 0 10px 26px color-mix(in srgb, var(--ink) 7%, transparent);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.person-card:hover {
  box-shadow: 0 18px 36px color-mix(in srgb, var(--ink) 14%, transparent);
  transform: translateY(-3px);
}

.person-detail-trigger {
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 10px;
  padding: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.person-detail-trigger:focus-visible {
  outline: 3px solid var(--cinnabar);
  outline-offset: 4px;
}

.person-lifetime,
.person-summary {
  margin: 0;
}

.person-lifetime {
  color: var(--bronze);
  font-family: var(--font-utility);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.05em;
}

.person-detail-trigger strong {
  font-family: var(--font-display);
  font-size: 26px;
  line-height: 1.15;
}

.person-summary {
  color: var(--muted-ink);
  line-height: 1.7;
}

.lesson-links {
  display: grid;
  gap: 7px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--muted-ink) 16%, transparent);
}

.lesson-links a {
  color: var(--cinnabar);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.45;
  text-decoration-color: color-mix(in srgb, var(--cinnabar) 38%, transparent);
  text-underline-offset: 3px;
}

.lesson-links a:focus-visible {
  outline: 2px solid var(--cinnabar);
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

  .textbook-navigation-column {
    top: var(--app-header-height);
    z-index: 9;
    order: -1;
    width: 100%;
  }

  .textbook-section {
    scroll-margin-top: calc(var(--app-header-height) + 68px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .person-card {
    transition: none;
  }
}
</style>

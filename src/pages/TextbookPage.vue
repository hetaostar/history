<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TextbookRiverTimeline from '@/components/TextbookRiverTimeline.vue'
import TextbookUnitList from '@/components/TextbookUnitList.vue'
import { TEXTBOOKS } from '@/data/textbooks'
import {
  getTextbookById,
  getTextbookEvents,
  getTextbookEventYearRange,
  getTextbookLessons,
  getTextbookPeople,
  getTextbookUnits,
} from '@/domain/textbookSelectors'
import type { ITextbookLesson } from '@/domain/textbookTypes'

const route = useRoute()
const textbookId = computed(() => String(route.params.textbookId ?? ''))
const textbook = computed(() => getTextbookById(textbookId.value))

function appendLesson(
  map: Map<string, ITextbookLesson[]>,
  entityId: string,
  lesson: ITextbookLesson,
) {
  const entityLessons = map.get(entityId)
  if (entityLessons) {
    entityLessons.push(lesson)
  } else {
    map.set(entityId, [lesson])
  }
}

const textbookContent = computed(() => {
  const id = textbookId.value
  const lessons = getTextbookLessons(id)
  const lessonsByPersonId = new Map<string, ITextbookLesson[]>()
  const lessonsByEventId = new Map<string, ITextbookLesson[]>()

  lessons.forEach((lesson) => {
    lesson.personIds.forEach((personId) => {
      appendLesson(lessonsByPersonId, personId, lesson)
    })
    lesson.eventIds.forEach((eventId) => {
      appendLesson(lessonsByEventId, eventId, lesson)
    })
  })

  return {
    units: getTextbookUnits(id),
    lessons,
    people: getTextbookPeople(id),
    events: getTextbookEvents(id),
    yearRange: getTextbookEventYearRange(id),
    lessonsByPersonId,
    lessonsByEventId,
  }
})

const units = computed(() => textbookContent.value.units)
const lessons = computed(() => textbookContent.value.lessons)
const people = computed(() => textbookContent.value.people)
const events = computed(() => textbookContent.value.events)
const yearRange = computed(() => textbookContent.value.yearRange)

function formatYear(year: number) {
  return year < 0 ? `公元前${Math.abs(year)}年` : `${year}年`
}

const yearRangeLabel = computed(() => {
  if (!yearRange.value) return '年代待补充'
  return `${formatYear(yearRange.value.startYear)}—${formatYear(yearRange.value.endYear)}`
})

function lessonsForPerson(personId: string) {
  return textbookContent.value.lessonsByPersonId.get(personId) ?? []
}

function lessonsForEvent(eventId: string) {
  return textbookContent.value.lessonsByEventId.get(eventId) ?? []
}
</script>

<template>
  <section class="textbook-page" aria-label="教材学习">
    <template v-if="!textbook">
      <section class="state-panel" role="alert">
        <p class="eyebrow">Textbook not found</p>
        <h1>教材不存在</h1>
        <p>这个教材编号不在当前六册目录中，请从主页重新选择。</p>
        <RouterLink class="primary-link" to="/">返回主页</RouterLink>
      </section>
    </template>

    <template v-else>
      <RouterLink class="back-link" to="/">← 返回主页</RouterLink>

      <nav
        class="textbook-switcher"
        data-test="textbook-switcher"
        aria-label="快速切换教材"
      >
        <template v-for="item in TEXTBOOKS" :key="item.id">
          <RouterLink
            v-if="item.status === 'published'"
            class="textbook-switcher-item"
            :to="`/textbooks/${item.id}`"
            :aria-current="item.id === textbook.id ? 'page' : undefined"
          >
            <strong>{{ item.shortTitle }}</strong>
            <span>已出版</span>
          </RouterLink>
          <div
            v-else
            class="textbook-switcher-item"
            aria-disabled="true"
            :aria-current="item.id === textbook.id ? 'page' : undefined"
          >
            <strong>{{ item.shortTitle }}</strong>
            <span>待出版</span>
          </div>
        </template>
      </nav>

      <section
        v-if="textbook.status === 'coming-soon'"
        class="state-panel"
        role="status"
      >
        <p class="eyebrow">Coming soon</p>
        <h1>{{ textbook.title }}待出版</h1>
        <p>
          本册教材内容正在整理。你可以先学习七年级教材，或返回主页选择其他内容。
        </p>
        <RouterLink class="primary-link" to="/">返回主页</RouterLink>
      </section>

      <template v-else>
        <header class="textbook-hero">
          <div>
            <p class="eyebrow">{{ textbook.edition }} · {{ textbook.revisionYear }}</p>
            <h1>{{ textbook.title }}</h1>
            <p class="hero-summary">{{ textbook.summary }}</p>
          </div>
          <dl class="textbook-facts">
            <div class="year-fact">
              <dt>覆盖年代</dt>
              <dd>{{ yearRangeLabel }}</dd>
            </div>
            <div>
              <dt>人物</dt>
              <dd>{{ people.length }} 人物</dd>
            </div>
            <div>
              <dt>事件</dt>
              <dd>{{ events.length }} 事件</dd>
            </div>
            <div>
              <dt>目录</dt>
              <dd>{{ units.length }} 单元</dd>
            </div>
            <div>
              <dt>课程</dt>
              <dd>{{ lessons.length }} 课程</dd>
            </div>
          </dl>
        </header>

        <div data-test="textbook-learning" class="learning-sections">
          <section
            class="learning-section"
            data-test="textbook-people"
            aria-labelledby="people-title"
          >
            <div class="section-heading">
              <div>
                <p class="eyebrow">People</p>
                <h2 id="people-title">本册人物</h2>
              </div>
              <span>{{ people.length }} 人</span>
            </div>
            <div class="entity-grid">
              <details v-for="person in people" :key="person.id">
                <summary>
                  <strong>{{ person.name }}</strong>
                  <span>{{ person.lifeTime }}</span>
                </summary>
                <p>{{ person.summary }}</p>
                <h3>关联课程</h3>
                <ul>
                  <li
                    v-for="lesson in lessonsForPerson(person.id)"
                    :key="lesson.id"
                  >
                    <RouterLink
                      :to="`/textbooks/${textbook.id}/lessons/${lesson.id}`"
                    >
                      第 {{ lesson.lessonNumber }} 课 {{ lesson.title }}
                    </RouterLink>
                  </li>
                </ul>
              </details>
            </div>
          </section>

          <section
            class="learning-section"
            data-test="textbook-events"
            aria-labelledby="events-title"
          >
            <div class="section-heading">
              <div>
                <p class="eyebrow">Events</p>
                <h2 id="events-title">本册事件</h2>
              </div>
              <span>{{ events.length }} 件</span>
            </div>
            <div class="entity-grid event-grid">
              <details v-for="event in events" :key="event.id">
                <summary>
                  <strong>{{ event.title }}</strong>
                  <span>{{ formatYear(event.year) }}</span>
                </summary>
                <p v-if="event.description">{{ event.description }}</p>
                <h3>关联课程</h3>
                <ul>
                  <li
                    v-for="lesson in lessonsForEvent(event.id)"
                    :key="lesson.id"
                  >
                    <RouterLink
                      :to="`/textbooks/${textbook.id}/lessons/${lesson.id}`"
                    >
                      第 {{ lesson.lessonNumber }} 课 {{ lesson.title }}
                    </RouterLink>
                  </li>
                </ul>
              </details>
            </div>
          </section>

          <section class="learning-section" aria-labelledby="units-title">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Contents</p>
                <h2 id="units-title">全部单元</h2>
              </div>
              <span>{{ units.length }} 单元 · {{ lessons.length }} 课</span>
            </div>
            <TextbookUnitList
              :textbook-id="textbook.id"
              :units="units"
              :lessons="lessons"
            />
          </section>

          <TextbookRiverTimeline
            v-if="textbook.status === 'published' && events.length > 0"
            :key="textbook.id"
            :textbook-id="textbook.id"
          />
        </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.textbook-page {
  display: grid;
  gap: 22px;
  max-width: 1240px;
  margin: 0 auto;
}

.back-link,
.primary-link,
.textbook-switcher a,
.entity-grid a {
  color: inherit;
  font-weight: 850;
  text-decoration: none;
}

.back-link {
  width: fit-content;
  color: var(--bronze);
}

.back-link:focus-visible,
.primary-link:focus-visible,
.textbook-switcher a:focus-visible,
.entity-grid a:focus-visible {
  outline: 3px solid var(--cinnabar);
  outline-offset: 3px;
}

.textbook-switcher {
  display: grid;
  grid-template-columns: repeat(6, minmax(90px, 1fr));
  gap: 8px;
  overflow-x: auto;
}

.textbook-switcher-item {
  display: grid;
  gap: 3px;
  min-width: 90px;
  padding: 12px;
  background: color-mix(in srgb, var(--paper) 86%, white);
  border: 1px solid rgb(74 50 35 / 16%);
  border-radius: 12px;
}

.textbook-switcher-item[aria-current='page'] {
  color: var(--paper);
  background: var(--bronze);
  border-color: var(--bronze);
}

.textbook-switcher span {
  font-size: 11px;
  opacity: 0.76;
}

.state-panel,
.textbook-hero,
.learning-section {
  padding: clamp(24px, 5vw, 46px);
  background: color-mix(in srgb, var(--paper) 90%, white);
  border: 1px solid rgb(74 50 35 / 16%);
  border-radius: 28px;
  box-shadow: 0 18px 45px rgb(36 27 20 / 9%);
}

.state-panel {
  display: grid;
  justify-items: start;
  min-height: 320px;
  align-content: center;
}

.state-panel h1,
.textbook-hero h1 {
  margin: 6px 0 14px;
  font-family: var(--font-display);
  font-size: clamp(38px, 8vw, 72px);
}

.state-panel > p:not(.eyebrow) {
  max-width: 600px;
  color: var(--muted-ink);
  line-height: 1.8;
}

.primary-link {
  margin-top: 12px;
  padding: 12px 18px;
  color: var(--paper);
  background: var(--cinnabar);
  border-radius: 999px;
}

.textbook-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(310px, 0.75fr);
  gap: 34px;
  color: var(--ink);
  background:
    radial-gradient(circle at 90% 10%, rgb(184 62 44 / 17%), transparent 30%),
    linear-gradient(135deg, var(--paper), var(--paper-deep));
}

.eyebrow {
  margin: 0;
  color: var(--cinnabar);
  font-family: var(--font-utility);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.hero-summary {
  max-width: 650px;
  margin: 0;
  color: var(--muted-ink);
  font-size: 17px;
  line-height: 1.85;
}

.textbook-facts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 0;
}

.textbook-facts div {
  padding: 16px;
  background: rgb(255 248 229 / 72%);
  border: 1px solid rgb(74 50 35 / 12%);
  border-radius: 16px;
}

.textbook-facts .year-fact {
  grid-column: 1 / -1;
}

.textbook-facts dt {
  color: var(--muted-ink);
  font-size: 12px;
  font-weight: 800;
}

.textbook-facts dd {
  margin: 6px 0 0;
  color: var(--bronze);
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 900;
}

.learning-sections {
  display: grid;
  gap: 22px;
}

.learning-section h2 {
  margin: 4px 0 0;
  font-family: var(--font-display);
  font-size: clamp(28px, 5vw, 42px);
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}

.section-heading > span {
  color: var(--bronze);
  font-weight: 900;
}

.entity-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.entity-grid details {
  background: var(--paper);
  border: 1px solid rgb(74 50 35 / 14%);
  border-radius: 16px;
}

.entity-grid summary {
  display: grid;
  gap: 5px;
  padding: 16px;
  cursor: pointer;
}

.entity-grid summary:focus-visible {
  outline: 3px solid var(--cinnabar);
  outline-offset: 2px;
}

.entity-grid summary strong {
  font-family: var(--font-display);
  font-size: 20px;
}

.entity-grid summary span,
.entity-grid details > p {
  color: var(--muted-ink);
}

.entity-grid details > p,
.entity-grid details > h3,
.entity-grid details > ul {
  margin-right: 16px;
  margin-left: 16px;
}

.entity-grid details > p {
  line-height: 1.65;
}

.entity-grid details > h3 {
  margin-bottom: 5px;
  color: var(--cinnabar);
  font-size: 13px;
}

.entity-grid ul {
  display: grid;
  gap: 7px;
  padding: 0 0 16px;
  list-style: none;
}

.entity-grid a {
  color: var(--bronze);
  line-height: 1.5;
}

@media (max-width: 900px) {
  .textbook-hero {
    grid-template-columns: 1fr;
  }

  .entity-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .textbook-switcher {
    grid-template-columns: repeat(6, 96px);
  }

  .section-heading {
    align-items: start;
    flex-direction: column;
  }

  .entity-grid {
    grid-template-columns: 1fr;
  }
}
</style>

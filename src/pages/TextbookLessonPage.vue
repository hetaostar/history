<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { TEXTBOOK_LESSONS, TEXTBOOK_UNITS } from '@/data/textbooks'
import {
  getTextbookById,
  getTextbookEvents,
  getTextbookLessons,
  getTextbookPeople,
  getTextbookUnits,
} from '@/domain/textbookSelectors'

const route = useRoute()
const textbookId = computed(() => String(route.params.textbookId ?? ''))
const lessonId = computed(() => String(route.params.lessonId ?? ''))
const textbook = computed(() => getTextbookById(textbookId.value))
const requestedLesson = computed(() =>
  TEXTBOOK_LESSONS.find((item) => item.id === lessonId.value),
)
const lessonTextbookId = computed(
  () =>
    TEXTBOOK_UNITS.find((item) => item.id === requestedLesson.value?.unitId)
      ?.textbookId,
)
const correctTextbook = computed(() =>
  lessonTextbookId.value
    ? getTextbookById(lessonTextbookId.value)
    : undefined,
)
const isCrossTextbookLesson = computed(
  () =>
    requestedLesson.value !== undefined &&
    lessonTextbookId.value !== textbookId.value,
)
const lesson = computed(() =>
  lessonTextbookId.value === textbookId.value
    ? getTextbookLessons(textbookId.value).find(
        (item) => item.id === lessonId.value,
      )
    : undefined,
)
const unit = computed(() =>
  getTextbookUnits(textbookId.value).find(
    (item) => item.id === lesson.value?.unitId,
  ),
)
const people = computed(() => {
  const personIds = new Set(lesson.value?.personIds ?? [])
  return getTextbookPeople(textbookId.value).filter((person) =>
    personIds.has(person.id),
  )
})
const events = computed(() => {
  const eventIds = new Set(lesson.value?.eventIds ?? [])
  return getTextbookEvents(textbookId.value).filter((event) =>
    eventIds.has(event.id),
  )
})

function formatYear(year: number) {
  return year < 0 ? `公元前${Math.abs(year)}年` : `${year}年`
}
</script>

<template>
  <section class="lesson-page" aria-label="教材课程详情">
    <section v-if="!requestedLesson" class="state-panel" role="alert">
      <p class="eyebrow">Lesson not found</p>
      <h1>课程不存在</h1>
      <p>没有找到这节课，请返回本册目录重新选择。</p>
      <div class="state-actions">
        <RouterLink v-if="textbook" :to="`/textbooks/${textbook.id}`">
          返回本册
        </RouterLink>
        <RouterLink to="/">返回主页</RouterLink>
      </div>
    </section>

    <section
      v-else-if="isCrossTextbookLesson"
      class="state-panel"
      role="alert"
    >
      <p class="eyebrow">Wrong textbook</p>
      <h1>该课程不属于当前教材</h1>
      <p>
        “{{ requestedLesson.title }}”属于{{ correctTextbook?.title }}，请前往正确教材继续学习。
      </p>
      <div class="state-actions">
        <RouterLink
          v-if="correctTextbook"
          :to="`/textbooks/${correctTextbook.id}`"
        >
          前往正确教材
        </RouterLink>
        <RouterLink
          v-if="textbook"
          :to="`/textbooks/${textbook.id}`"
        >
          返回当前教材
        </RouterLink>
        <RouterLink to="/">返回主页</RouterLink>
      </div>
    </section>

    <template v-else-if="textbook && lesson && unit">
      <nav class="breadcrumb" aria-label="面包屑">
        <RouterLink to="/">主页</RouterLink>
        <span aria-hidden="true">›</span>
        <RouterLink :to="`/textbooks/${textbook.id}`">
          {{ textbook.title }}
        </RouterLink>
        <span aria-hidden="true">›</span>
        <span>{{ unit.title }}</span>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{{ lesson.title }}</span>
      </nav>

      <article data-test="lesson-content" class="lesson-content">
        <header class="lesson-hero">
          <div>
            <p class="eyebrow">第 {{ lesson.lessonNumber }} 课</p>
            <h1>{{ lesson.title }}</h1>
            <p>{{ lesson.summary }}</p>
          </div>
          <aside aria-label="所属单元">
            <span>所属单元</span>
            <strong>第 {{ unit.order }} 单元</strong>
            <p>{{ unit.title }}</p>
          </aside>
        </header>

        <div class="lesson-relations">
          <section data-test="lesson-people" aria-labelledby="lesson-people-title">
            <div class="section-heading">
              <h2 id="lesson-people-title">对应人物</h2>
              <span>{{ people.length }} 人</span>
            </div>
            <p v-if="people.length === 0" class="empty-note">
              本课没有单独标注人物。
            </p>
            <ul v-else>
              <li v-for="person in people" :key="person.id">
                <strong>{{ person.name }}</strong>
                <span>{{ person.lifeTime }}</span>
                <p>{{ person.summary }}</p>
              </li>
            </ul>
          </section>

          <section data-test="lesson-events" aria-labelledby="lesson-events-title">
            <div class="section-heading">
              <h2 id="lesson-events-title">对应事件</h2>
              <span>{{ events.length }} 件</span>
            </div>
            <p v-if="events.length === 0" class="empty-note">
              本课没有单独标注事件。
            </p>
            <ul v-else>
              <li v-for="event in events" :key="event.id">
                <strong>{{ event.title }}</strong>
                <span>{{ formatYear(event.year) }}</span>
                <p v-if="event.description">{{ event.description }}</p>
              </li>
            </ul>
          </section>
        </div>
      </article>
    </template>
  </section>
</template>

<style scoped>
.lesson-page {
  display: grid;
  gap: 22px;
  max-width: 1120px;
  margin: 0 auto;
}

.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  color: var(--muted-ink);
  font-size: 13px;
}

.breadcrumb a,
.state-actions a {
  color: var(--bronze);
  font-weight: 900;
  text-decoration: none;
}

.breadcrumb a:focus-visible,
.state-actions a:focus-visible {
  outline: 3px solid var(--cinnabar);
  outline-offset: 3px;
}

.breadcrumb [aria-current='page'] {
  color: var(--ink);
  font-weight: 900;
}

.lesson-content {
  display: grid;
  gap: 22px;
}

.lesson-hero,
.lesson-relations > section,
.state-panel {
  padding: clamp(24px, 5vw, 46px);
  background: color-mix(in srgb, var(--paper) 90%, white);
  border: 1px solid rgb(74 50 35 / 16%);
  border-radius: 28px;
  box-shadow: 0 18px 45px rgb(36 27 20 / 9%);
}

.lesson-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 0.42fr);
  gap: 28px;
  color: var(--ink);
  background:
    radial-gradient(circle at 88% 16%, rgb(54 91 76 / 18%), transparent 30%),
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

.lesson-hero h1,
.state-panel h1 {
  margin: 6px 0 14px;
  font-family: var(--font-display);
  font-size: clamp(38px, 8vw, 68px);
  line-height: 1.05;
}

.lesson-hero > div > p:last-child,
.state-panel > p:not(.eyebrow) {
  max-width: 680px;
  color: var(--muted-ink);
  font-size: 17px;
  line-height: 1.8;
}

.lesson-hero aside {
  align-self: end;
  padding: 20px;
  color: var(--paper);
  background: var(--bronze);
  border-radius: 18px;
}

.lesson-hero aside > span {
  font-size: 12px;
  opacity: 0.75;
}

.lesson-hero aside strong {
  display: block;
  margin-top: 8px;
  font-family: var(--font-display);
  font-size: 22px;
}

.lesson-hero aside p {
  margin: 8px 0 0;
  line-height: 1.6;
}

.lesson-relations {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-heading h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 30px;
}

.section-heading span {
  color: var(--bronze);
  font-weight: 900;
}

.lesson-relations ul {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 20px 0 0;
  list-style: none;
}

.lesson-relations li {
  display: grid;
  gap: 5px;
  padding: 16px;
  background: var(--paper);
  border: 1px solid rgb(74 50 35 / 13%);
  border-radius: 16px;
}

.lesson-relations li strong {
  font-family: var(--font-display);
  font-size: 20px;
}

.lesson-relations li span,
.lesson-relations li p,
.empty-note {
  color: var(--muted-ink);
}

.lesson-relations li p {
  margin: 3px 0 0;
  line-height: 1.6;
}

.state-panel {
  display: grid;
  justify-items: start;
  min-height: 360px;
  align-content: center;
}

.state-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.state-actions a {
  padding: 11px 16px;
  background: var(--paper-deep);
  border-radius: 999px;
}

.state-actions a:first-child {
  color: var(--paper);
  background: var(--cinnabar);
}

@media (max-width: 760px) {
  .lesson-hero,
  .lesson-relations {
    grid-template-columns: 1fr;
  }
}
</style>

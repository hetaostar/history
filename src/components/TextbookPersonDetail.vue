<script lang="ts">
let textbookPersonDetailInstanceId = 0
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useModalBehavior } from '@/composables/useModalBehavior'
import {
  TEXTBOOK_LESSONS,
  TEXTBOOK_UNITS,
  TEXTBOOKS,
} from '@/data/textbooks'
import { formatHistoricalYear } from '@/domain/chinaRiverLayout'
import { buildTextbookPersonLessonGroups } from '@/domain/textbookPeopleCatalog'
import { getTextbookEventById } from '@/domain/textbookSelectors'
import type {
  ITextbook,
  ITextbookLesson,
  ITextbookPerson,
  ITextbookUnit,
} from '@/domain/textbookTypes'

const props = withDefaults(
  defineProps<{
    person: ITextbookPerson
    textbooks?: readonly ITextbook[]
    units?: readonly ITextbookUnit[]
    lessons?: readonly ITextbookLesson[]
  }>(),
  {
    textbooks: () => TEXTBOOKS,
    units: () => TEXTBOOK_UNITS,
    lessons: () => TEXTBOOK_LESSONS,
  },
)

const emit = defineEmits<{
  close: []
}>()

const isActive = ref(false)
const titleId = `textbook-person-detail-title-${++textbookPersonDetailInstanceId}`
const { containerRef } = useModalBehavior(isActive, () => emit('close'))

const textbookGroups = computed(() =>
  buildTextbookPersonLessonGroups(
    props.person,
    props.textbooks,
    props.units,
    props.lessons,
  ),
)
const relatedEvents = computed(() => {
  const eventIds = new Set(
    props.lessons
      .filter((lesson) => lesson.personIds.includes(props.person.id))
      .flatMap((lesson) => lesson.eventIds),
  )

  return [...eventIds]
    .map((eventId) => getTextbookEventById(eventId))
    .filter((event) => event !== undefined)
    .sort(
      (left, right) =>
        left.year - right.year || left.id.localeCompare(right.id),
    )
})

onMounted(() => {
  isActive.value = true
})
</script>

<template>
  <div
    ref="containerRef"
    class="person-detail-overlay"
    data-test="person-detail-overlay"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    @click.self="emit('close')"
  >
    <article class="person-detail-sheet">
      <button
        class="close-button"
        data-test="close"
        type="button"
        aria-label="关闭人物详情"
        @click="emit('close')"
      >
        <span aria-hidden="true">×</span>
      </button>

      <header class="person-heading">
        <p class="life-time">{{ person.lifeTime }}</p>
        <h2 :id="titleId">{{ person.name }}</h2>
        <p class="summary">{{ person.summary }}</p>
      </header>

      <div class="ink-divider" aria-hidden="true"></div>

      <section class="textbook-records" aria-label="所属教材与课程">
        <article
          v-for="group in textbookGroups"
          :key="group.textbook.id"
          class="textbook-record"
          :data-test="`person-textbook-${group.textbook.id}`"
        >
          <header>
            <p>{{ group.textbook.edition }} · {{ group.textbook.revisionYear }}</p>
            <h3>{{ group.textbook.title }}</h3>
          </header>
          <ul v-if="group.lessons.length">
            <li v-for="lesson in group.lessons" :key="lesson.id">
              <RouterLink
                :data-test="`person-lesson-${group.textbook.id}-${lesson.id}`"
                :to="`/textbooks/${group.textbook.id}/lessons/${lesson.id}`"
              >
                第{{ lesson.lessonNumber }}课 · {{ lesson.title }}
              </RouterLink>
            </li>
          </ul>
          <p v-else class="empty-lessons">该册暂无关联课程</p>
        </article>
      </section>

      <section
        v-if="relatedEvents.length"
        class="related-events"
        aria-labelledby="person-related-events-title"
      >
        <h3 id="person-related-events-title">关联事件</h3>
        <ul>
          <li v-for="event in relatedEvents" :key="event.id">
            <RouterLink
              :data-test="`person-event-${event.id}`"
              :to="{ path: '/events', query: { event: event.id } }"
            >
              {{ formatHistoricalYear(event.year) }} · {{ event.title }}
            </RouterLink>
          </li>
        </ul>
      </section>
    </article>
  </div>
</template>

<style scoped>
.person-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 220;
  display: grid;
  padding: 24px;
  overflow-y: auto;
  background: color-mix(in srgb, var(--ink) 88%, transparent);
  place-items: center;
  animation: veil-in 180ms ease-out;
}

.person-detail-sheet {
  position: relative;
  width: min(680px, 100%);
  padding: clamp(28px, 5vw, 52px);
  color: var(--ink);
  background:
    linear-gradient(
        90deg,
        color-mix(in srgb, var(--muted-ink) 7%, transparent) 1px,
        transparent 1px
      )
      0 0 / 32px 100%,
    radial-gradient(
      circle at 88% 8%,
      color-mix(in srgb, var(--cinnabar) 10%, transparent),
      transparent 11rem
    ),
    var(--paper);
  border: 1px solid color-mix(in srgb, var(--aged-gold) 72%, var(--paper-deep));
  border-radius: 18px;
  box-shadow:
    0 32px 90px color-mix(in srgb, var(--ink) 42%, transparent),
    inset 0 0 0 4px color-mix(in srgb, var(--aged-gold) 13%, transparent);
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

.close-button:focus-visible,
.textbook-record a:focus-visible {
  outline: 3px solid var(--cinnabar);
  outline-offset: 4px;
}

.close-button span {
  font-family: var(--font-utility);
  font-size: 26px;
  line-height: 1;
}

.person-heading {
  padding-right: 34px;
}

.life-time,
.summary,
.textbook-record header p,
.empty-lessons {
  margin: 0;
}

.life-time,
.textbook-record header p {
  color: var(--bronze);
  font-family: var(--font-utility);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

h2 {
  margin: 12px 0;
  font-family: var(--font-display);
  font-size: clamp(34px, 7vw, 52px);
  line-height: 1.08;
}

.summary {
  color: var(--muted-ink);
  font-size: 17px;
  line-height: 1.8;
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

.textbook-records {
  display: grid;
  gap: 24px;
}

.related-events {
  display: grid;
  gap: 12px;
  margin-top: 24px;
}

.related-events h3,
.related-events ul {
  margin: 0;
}

.related-events ul {
  display: grid;
  gap: 8px;
  padding-left: 20px;
}

.related-events a {
  color: var(--cinnabar);
  font-weight: 800;
}

.textbook-record {
  display: grid;
  gap: 12px;
  padding: 18px;
  background: color-mix(in srgb, var(--paper-deep) 54%, transparent);
  border-left: 3px solid var(--cinnabar);
}

.textbook-record h3 {
  margin: 5px 0 0;
  font-family: var(--font-display);
  font-size: 22px;
}

.textbook-record ul {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.textbook-record a {
  color: var(--ink);
  font-weight: 800;
  text-decoration-color: color-mix(in srgb, var(--cinnabar) 45%, transparent);
  text-underline-offset: 4px;
}

.empty-lessons {
  color: var(--muted-ink);
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
  .person-detail-overlay {
    align-items: end;
    padding: 12px;
  }

  .person-detail-sheet {
    max-height: calc(100vh - 24px);
    padding: 32px 24px 26px;
    overflow-y: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .person-detail-overlay,
  .person-detail-sheet {
    animation: none;
  }

  .close-button {
    transition: none;
  }
}
</style>

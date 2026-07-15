<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ITextbookLesson, ITextbookUnit } from '@/domain/textbookTypes'

const props = defineProps<{
  textbookId: string
  units: readonly ITextbookUnit[]
  lessons: readonly ITextbookLesson[]
}>()

const openUnitIds = ref<ReadonlySet<string>>(new Set())

const lessonsByUnitId = computed(() => {
  const result = new Map<string, ITextbookLesson[]>()
  props.lessons.forEach((lesson) => {
    const unitLessons = result.get(lesson.unitId)
    if (unitLessons) {
      unitLessons.push(lesson)
    } else {
      result.set(lesson.unitId, [lesson])
    }
  })
  return result
})

function lessonsInUnit(unitId: string) {
  return lessonsByUnitId.value.get(unitId) ?? []
}

function updateOpenState(unitId: string, event: Event) {
  const nextOpenUnitIds = new Set(openUnitIds.value)
  if ((event.currentTarget as HTMLDetailsElement).open) {
    nextOpenUnitIds.add(unitId)
  } else {
    nextOpenUnitIds.delete(unitId)
  }
  openUnitIds.value = nextOpenUnitIds
}
</script>

<template>
  <div class="textbook-unit-list">
    <article v-for="unit in units" :key="unit.id" class="textbook-unit">
      <details @toggle="updateOpenState(unit.id, $event)">
        <summary
          :aria-label="`${openUnitIds.has(unit.id) ? '收起' : '展开'}第 ${unit.order} 单元课程：${unit.title}`"
        >
          <span class="unit-number">第 {{ unit.order }} 单元</span>
          <span class="unit-copy">
            <strong>{{ unit.title }}</strong>
            <span>{{ unit.summary }}</span>
          </span>
          <span class="lesson-count">
            {{ lessonsInUnit(unit.id).length }} 课
          </span>
        </summary>
        <ol class="unit-lessons">
          <li v-for="lesson in lessonsInUnit(unit.id)" :key="lesson.id">
            <RouterLink
              class="textbook-lesson-link"
              :to="`/textbooks/${textbookId}/lessons/${lesson.id}`"
            >
              <span>第 {{ lesson.lessonNumber }} 课</span>
              <strong>{{ lesson.title }}</strong>
              <small>{{ lesson.summary }}</small>
            </RouterLink>
          </li>
        </ol>
      </details>
    </article>
  </div>
</template>

<style scoped>
.textbook-unit-list {
  display: grid;
  gap: 14px;
}

.textbook-unit {
  overflow: hidden;
  background: color-mix(in srgb, var(--paper) 90%, white);
  border: 1px solid rgb(74 50 35 / 16%);
  border-radius: 20px;
}

summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 20px;
  cursor: pointer;
  list-style: none;
}

summary::-webkit-details-marker {
  display: none;
}

summary:focus-visible {
  outline: 3px solid var(--cinnabar);
  outline-offset: -4px;
}

summary::after {
  grid-column: 3;
  color: var(--cinnabar);
  font-size: 22px;
  content: '+';
}

details[open] summary::after {
  content: '−';
}

.unit-number,
.lesson-count {
  color: var(--bronze);
  font-family: var(--font-utility);
  font-size: 12px;
  font-weight: 900;
}

.unit-copy {
  display: grid;
  gap: 5px;
}

.unit-copy strong {
  font-family: var(--font-display);
  font-size: 20px;
}

.unit-copy > span {
  color: var(--muted-ink);
  line-height: 1.6;
}

.lesson-count {
  grid-row: 1;
  grid-column: 3;
  padding-right: 28px;
  white-space: nowrap;
}

.unit-lessons {
  display: grid;
  gap: 1px;
  padding: 0;
  margin: 0;
  list-style: none;
  background: rgb(74 50 35 / 10%);
  border-top: 1px solid rgb(74 50 35 / 12%);
}

.textbook-lesson-link {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 5px 14px;
  padding: 16px 20px;
  color: inherit;
  text-decoration: none;
  background: var(--paper);
}

.textbook-lesson-link:hover,
.textbook-lesson-link:focus-visible {
  background: color-mix(in srgb, var(--paper) 88%, var(--paper-deep));
  outline: 3px solid var(--cinnabar);
  outline-offset: -4px;
}

.textbook-lesson-link > span {
  grid-row: 1 / 3;
  color: var(--cinnabar);
  font-family: var(--font-utility);
  font-size: 12px;
  font-weight: 900;
}

.textbook-lesson-link small {
  color: var(--muted-ink);
  line-height: 1.55;
}

@media (max-width: 620px) {
  summary {
    grid-template-columns: 1fr auto;
    gap: 10px 12px;
    padding: 16px;
  }

  .unit-number,
  .unit-copy {
    grid-column: 1;
  }

  .unit-number {
    grid-row: 1;
  }

  .unit-copy {
    grid-row: 2;
  }

  .lesson-count {
    grid-row: 1;
    grid-column: 2;
  }

  summary::after {
    grid-row: 2;
    grid-column: 2;
  }

  .textbook-lesson-link {
    grid-template-columns: 1fr;
    padding: 14px 16px;
  }

  .textbook-lesson-link > span {
    grid-row: auto;
  }
}
</style>

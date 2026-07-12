<script lang="ts">
let textbookPersonDetailInstanceId = 0
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useModalBehavior } from '@/composables/useModalBehavior'
import type { ITextbookPeopleGroup } from '@/domain/textbookPeopleCatalog'
import type { ITextbookPerson } from '@/domain/textbookTypes'

const props = defineProps<{
  person: ITextbookPerson
  groups: readonly ITextbookPeopleGroup[]
}>()

const emit = defineEmits<{
  close: []
}>()

const isActive = ref(false)
const titleId = `textbook-person-detail-title-${++textbookPersonDetailInstanceId}`
const { containerRef } = useModalBehavior(isActive, () => emit('close'))
const personGroups = computed(() =>
  props.groups
    .map((group) => ({
      textbook: group.textbook,
      entry: group.entries.find(
        (entry) => entry.person.id === props.person.id,
      ),
    }))
    .filter(
      (
        group,
      ): group is {
        textbook: ITextbookPeopleGroup['textbook']
        entry: ITextbookPeopleGroup['entries'][number]
      } => group.entry !== undefined,
    ),
)

onMounted(() => {
  isActive.value = true
})
</script>

<template>
  <div
    ref="containerRef"
    class="person-detail-overlay"
    data-test="textbook-person-detail"
    data-layout="drawer"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    @click.self="emit('close')"
  >
    <article
      class="person-detail-sheet"
      data-test="textbook-person-detail-drawer"
    >
      <button
        class="close-button"
        data-test="close-person-detail"
        type="button"
        aria-label="关闭人物详情"
        @click="emit('close')"
      >
        <span aria-hidden="true">×</span>
      </button>

      <header class="person-heading">
        <p class="person-lifetime">{{ person.lifeTime }}</p>
        <h2 :id="titleId">{{ person.name }}</h2>
        <p class="person-summary">{{ person.summary }}</p>
      </header>

      <div class="ink-divider" aria-hidden="true"></div>

      <section class="textbook-memberships" aria-label="所属教材与课程">
        <article
          v-for="group in personGroups"
          :key="group.textbook.id"
          class="textbook-membership"
          :data-test="`person-textbook-${group.textbook.id}`"
        >
          <h3>{{ group.textbook.title }}</h3>
          <ul class="lesson-list">
            <li v-for="lesson in group.entry.lessons" :key="lesson.id">
              <RouterLink
                class="lesson-link"
                :data-test="`person-lesson-${lesson.id}`"
                :to="`/textbooks/${group.textbook.id}/lessons/${lesson.id}`"
              >
                第{{ lesson.lessonNumber }}课 {{ lesson.title }}
              </RouterLink>
            </li>
          </ul>
        </article>
      </section>
    </article>
  </div>
</template>

<style scoped>
.person-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 220;
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  padding: 0;
  overflow: hidden;
  background: color-mix(in srgb, var(--ink) 84%, transparent);
  animation: veil-in 180ms ease-out;
}

.person-detail-sheet {
  position: relative;
  width: min(620px, 100%);
  height: 100%;
  min-height: 100%;
  padding: clamp(28px, 5vw, 52px);
  overflow-y: auto;
  color: var(--ink);
  background:
    radial-gradient(
      circle at 88% 8%,
      color-mix(in srgb, var(--cinnabar) 10%, transparent),
      transparent 11rem
    ),
    var(--paper);
  border: 1px solid color-mix(in srgb, var(--aged-gold) 72%, var(--paper-deep));
  border-radius: 18px 0 0 18px;
  box-shadow: 0 32px 90px color-mix(in srgb, var(--ink) 42%, transparent);
  animation: drawer-in 220ms ease-out;
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
}

.close-button:focus-visible,
.lesson-link:focus-visible {
  outline: 3px solid var(--cinnabar);
  outline-offset: 3px;
}

.close-button span {
  font-size: 26px;
  line-height: 1;
}

.person-heading {
  display: grid;
  gap: 12px;
  padding-right: 34px;
}

.person-lifetime,
.person-summary {
  margin: 0;
}

.person-lifetime {
  color: var(--bronze);
  font-family: var(--font-utility);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.person-heading h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(32px, 6vw, 50px);
  line-height: 1.12;
}

.person-summary {
  color: var(--muted-ink);
  font-size: 17px;
  line-height: 1.8;
}

.ink-divider {
  height: 9px;
  margin: 28px 0 24px;
  background:
    linear-gradient(90deg, var(--ink), var(--ink)) left center / 100% 1px
      no-repeat,
    radial-gradient(circle, var(--cinnabar) 0 3px, transparent 3.5px) center /
      9px 9px no-repeat;
  opacity: 0.72;
}

.textbook-memberships {
  display: grid;
  gap: 24px;
}

.textbook-membership {
  display: grid;
  gap: 12px;
}

.textbook-membership h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 22px;
}

.lesson-list {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.lesson-link {
  display: block;
  padding: 10px 12px;
  color: var(--ink);
  text-decoration: none;
  background: color-mix(in srgb, var(--aged-gold) 9%, transparent);
  border-left: 3px solid var(--cinnabar);
}

@keyframes veil-in {
  from {
    opacity: 0;
  }
}

@keyframes drawer-in {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
}

@keyframes bottom-drawer-in {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
}

@media (max-width: 560px) {
  .person-detail-overlay {
    align-items: end;
    justify-content: stretch;
    padding: 12px;
  }

  .person-detail-sheet {
    width: 100%;
    height: auto;
    min-height: 0;
    max-height: calc(100vh - 24px);
    padding: 32px 24px 26px;
    overflow-y: auto;
    border-radius: 18px;
    animation-name: bottom-drawer-in;
  }
}

@media (prefers-reduced-motion: reduce) {
  .person-detail-overlay,
  .person-detail-sheet {
    animation: none;
  }
}
</style>

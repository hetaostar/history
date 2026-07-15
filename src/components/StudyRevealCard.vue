<script setup lang="ts">
import { ref } from 'vue'
import type { StudyResult } from '@/domain/historyTypes'

defineProps<{
  prompt: string
  answer: string
  hint?: string
  relatedPeople?: string[]
  relatedEvents?: string[]
}>()

const emit = defineEmits<{
  mark: [result: StudyResult]
}>()

const revealed = ref(false)
</script>

<template>
  <article class="study-card">
    <div
      v-if="relatedPeople?.length || relatedEvents?.length"
      class="relation-summary"
    >
      <p v-if="relatedPeople?.length">
        关联人物：{{ relatedPeople.join('、') }}
      </p>
      <p v-if="relatedEvents?.length">
        关联事件：{{ relatedEvents.join('、') }}
      </p>
    </div>

    <div
      class="flip-stage"
      :class="{ 'is-revealed': revealed }"
      role="button"
      tabindex="0"
      :aria-label="revealed ? '点击回到正面' : '点击查看反面'"
      @click="revealed = !revealed"
      @keydown.enter.prevent="revealed = !revealed"
      @keydown.space.prevent="revealed = !revealed"
    >
      <div class="flip-card">
        <section class="flip-face flip-face-front">
          <div class="face-heading">
            <p class="face-label">正面</p>
            <p v-if="hint" class="face-hint">{{ hint }}</p>
          </div>
          <h3>{{ prompt }}</h3>
          <p class="flip-hint">点击卡片查看反面</p>
        </section>

        <section class="flip-face flip-face-back">
          <p class="face-label">反面</p>
          <template v-if="revealed">
            <div class="answer">{{ answer }}</div>
            <p class="flip-hint">点击卡片回到正面</p>
          </template>
        </section>
      </div>
    </div>

    <div class="actions" @click.stop>
      <button
        v-if="!revealed"
        data-test="reveal"
        type="button"
        @click="revealed = true"
      >
        查看反面
      </button>
      <button v-else data-test="hide" type="button" @click="revealed = false">
        回到正面
      </button>
      <button
        v-if="revealed"
        data-test="remembered"
        type="button"
        @click="emit('mark', 'remembered')"
      >
        已背过
      </button>
      <button v-if="revealed" type="button" @click="emit('mark', 'forgotten')">
        未背过
      </button>
    </div>
  </article>
</template>

<style scoped>
.study-card {
  display: grid;
  gap: 16px;
  padding: 24px;
  background: #fff;
  border: 1px solid #e2e6f2;
  border-radius: 18px;
}

.relation-summary {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  color: #405173;
  font-weight: 700;
  background: #f3f5ff;
  border: 1px solid #dfe4ff;
  border-radius: 14px;
}

.relation-summary p {
  margin: 0;
}

.flip-stage {
  min-height: 260px;
  cursor: pointer;
  outline: none;
  perspective: 1200px;
}

.flip-stage:focus-visible {
  outline: 3px solid #9aa8ff;
  outline-offset: 4px;
  border-radius: 18px;
}

.flip-card {
  position: relative;
  width: 100%;
  min-height: 260px;
  transition: transform 520ms ease;
  transform-style: preserve-3d;
}

.flip-stage.is-revealed .flip-card {
  transform: rotateY(180deg);
}

.flip-face {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  gap: 14px;
  padding: 28px;
  overflow: hidden;
  backface-visibility: hidden;
  border: 1px solid rgb(74 50 35 / 12%);
  border-radius: 18px;
  box-shadow: 0 16px 38px rgb(36 27 20 / 10%);
}

.flip-face-front {
  background:
    radial-gradient(circle at 88% 12%, rgb(184 62 44 / 16%), transparent 24%),
    var(--paper);
}

.flip-face-back {
  background:
    radial-gradient(circle at 10% 18%, rgb(54 91 76 / 14%), transparent 26%),
    #fff;
  transform: rotateY(180deg);
}

.face-label {
  margin: 0;
  color: var(--cinnabar);
  font-family: var(--font-utility);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.face-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.face-hint {
  margin: 0;
  color: var(--muted-ink);
  font-size: 13px;
  font-weight: 700;
}

.flip-face h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(24px, 4vw, 38px);
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.flip-hint {
  margin: 0;
  color: var(--muted-ink);
  font-size: 14px;
  font-weight: 700;
}

.answer {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.9;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 520px) {
  .flip-stage,
  .flip-card {
    min-height: 230px;
  }

  .flip-face {
    padding: 20px;
  }

  .actions {
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flip-card {
    transition: none;
  }
}
</style>

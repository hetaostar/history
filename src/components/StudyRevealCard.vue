<script setup lang="ts">
import { ref } from 'vue'
import type { StudyResult } from '@/domain/historyTypes'

defineProps<{
  prompt: string
  answer: string
}>()

const emit = defineEmits<{
  mark: [result: StudyResult]
}>()

const revealed = ref(false)
</script>

<template>
  <article class="study-card">
    <h3>{{ prompt }}</h3>
    <div v-if="revealed" class="answer">{{ answer }}</div>
    <div v-else class="covered">答案已遮挡，请先回忆。</div>

    <div class="actions">
      <button
        v-if="!revealed"
        data-test="reveal"
        type="button"
        @click="revealed = true"
      >
        展开答案
      </button>
      <button
        v-else
        data-test="hide"
        type="button"
        @click="revealed = false"
      >
        收回答案
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

.covered {
  padding: 24px;
  color: #6d7892;
  text-align: center;
  background: repeating-linear-gradient(
    -45deg,
    #f0f2fa,
    #f0f2fa 12px,
    #e6e9f5 12px,
    #e6e9f5 24px
  );
  border-radius: 14px;
}

.answer {
  white-space: pre-wrap;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>

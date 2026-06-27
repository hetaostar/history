<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import EntityCard from '@/components/EntityCard.vue'
import type { IHistoryEvent } from '@/domain/historyTypes'
import { useHistoryStore } from '@/stores/historyStore'

const route = useRoute()
const store = useHistoryStore()
const personId = computed(() => String(route.params.personId ?? ''))
const selectedEventId = ref('')
const errorMessage = ref('')

const eventForm = reactive({
  timelineId: '',
  timeLabel: '',
  title: '',
  hint: '',
  summary: '',
  detail: '',
  keywordsText: '',
})

const person = computed(() =>
  store.people.find((item) => item.id === personId.value),
)

const relatedEvents = computed(() => store.eventsByPerson(personId.value))
const pageError = computed(() => errorMessage.value || store.lastError)

const selectedEvent = computed(() => {
  return (
    relatedEvents.value.find((event) => event.id === selectedEventId.value) ??
    null
  )
})

function selectEvent(event: IHistoryEvent) {
  selectedEventId.value = event.id
}

function createRelatedEvent() {
  const timelineId = eventForm.timelineId

  if (!timelineId) {
    errorMessage.value = '请选择时间线。'
    return
  }

  if (!eventForm.timeLabel.trim() || !eventForm.title.trim()) {
    errorMessage.value = '请填写时间和事件标题。'
    return
  }

  const event = store.createEvent({
    timelineId,
    timeLabel: eventForm.timeLabel.trim(),
    sortValue: 0,
    title: eventForm.title.trim(),
    hint: eventForm.hint.trim(),
    summary: eventForm.summary.trim(),
    detail: eventForm.detail.trim(),
    keywords: parseCommaSeparatedText(eventForm.keywordsText),
    personIds: [personId.value],
  })

  selectedEventId.value = event.id
  resetEventForm()
  errorMessage.value = ''
}

function resetEventForm() {
  eventForm.timelineId = ''
  eventForm.timeLabel = ''
  eventForm.title = ''
  eventForm.hint = ''
  eventForm.summary = ''
  eventForm.detail = ''
  eventForm.keywordsText = ''
}

function parseCommaSeparatedText(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
</script>

<template>
  <section v-if="person" class="page">
    <header class="page-header">
      <RouterLink class="back-link" to="/people">返回人物列表</RouterLink>
      <p v-if="person.lifeTime" class="subtitle">{{ person.lifeTime }}</p>
      <h1>{{ person.name }}</h1>
      <p v-if="person.summary">{{ person.summary }}</p>
      <div v-if="person.keywords.length" class="tag-list">
        <span v-for="keyword in person.keywords" :key="keyword" class="tag">
          {{ keyword }}
        </span>
      </div>
    </header>

    <section class="detail-layout">
      <article class="panel person-detail">
        <h2>人物资料</h2>

        <section v-if="person.biography" class="detail-block">
          <h3>生平</h3>
          <div class="detail-text">{{ person.biography }}</div>
        </section>

        <section v-if="person.achievements" class="detail-block">
          <h3>主要成就</h3>
          <div class="detail-text">{{ person.achievements }}</div>
        </section>

      </article>

    </section>

    <form class="panel event-form" @submit.prevent="createRelatedEvent">
      <h2>新增相关事件</h2>
      <p class="form-help">新事件会自动关联当前人物。</p>

      <label>
        所属时间线
        <select v-model="eventForm.timelineId">
          <option value="" disabled>请选择时间线</option>
          <option
            v-for="timeline in store.timelines"
            :key="timeline.id"
            :value="timeline.id"
          >
            {{ timeline.name }}
          </option>
        </select>
      </label>

      <label>
        时间
        <input
          v-model="eventForm.timeLabel"
          type="text"
          placeholder="例如：1911年"
        />
      </label>

      <label>
        标题
        <input v-model="eventForm.title" type="text" placeholder="事件标题" />
      </label>

      <label>
        提示
        <input
          v-model="eventForm.hint"
          type="text"
          placeholder="用于背诵时提示自己"
        />
      </label>

      <label>
        摘要
        <textarea
          v-model="eventForm.summary"
          rows="2"
          placeholder="事件的一句话概括"
        />
      </label>

      <label>
        详情
        <textarea
          v-model="eventForm.detail"
          rows="5"
          placeholder="需要记忆的完整内容"
        />
      </label>

      <label>
        关键词
        <input
          v-model="eventForm.keywordsText"
          type="text"
          placeholder="用英文逗号分隔"
        />
      </label>

      <p v-if="pageError" class="error-message">{{ pageError }}</p>
      <button type="submit">保存相关事件</button>
    </form>

    <section class="panel related-events">
      <h2>关联事件</h2>
      <p v-if="relatedEvents.length === 0" class="empty-message">
        暂时没有关联事件。可以在时间线事件中填写这个人物 ID 建立关联。
      </p>

      <button
        v-for="event in relatedEvents"
        :key="event.id"
        class="event-card-button"
        type="button"
        @click="selectEvent(event)"
      >
        <EntityCard
          :title="event.title"
          :subtitle="event.timeLabel"
          :summary="event.summary"
        />
      </button>
    </section>

    <article v-if="selectedEvent" class="panel event-detail">
      <p class="subtitle">{{ selectedEvent.timeLabel }}</p>
      <h2>{{ selectedEvent.title }}</h2>
      <p v-if="selectedEvent.summary">{{ selectedEvent.summary }}</p>
      <p v-if="selectedEvent.hint" class="hint">
        背诵提示：{{ selectedEvent.hint }}
      </p>
      <div v-if="selectedEvent.detail" class="detail-text">
        {{ selectedEvent.detail }}
      </div>
      <div v-if="selectedEvent.keywords.length" class="tag-list">
        <span
          v-for="keyword in selectedEvent.keywords"
          :key="keyword"
          class="tag"
        >
          {{ keyword }}
        </span>
      </div>
      <RouterLink
        class="back-link"
        :to="`/timelines/${selectedEvent.timelineId}`"
      >
        前往时间线详情编辑
      </RouterLink>
    </article>
  </section>

  <section v-else class="page not-found">
    <h1>没有找到这位人物</h1>
    <p>人物可能已经被删除，或链接地址不正确。</p>
    <RouterLink class="back-link" to="/people">返回人物列表</RouterLink>
  </section>
</template>

<style scoped>
.page {
  display: grid;
  gap: 24px;
}

.page-header,
.panel,
.person-detail,
.event-form,
.related-events,
.detail-block {
  display: grid;
  gap: 16px;
}

.page-header p,
.empty-message,
.not-found p {
  margin: 0;
  color: #64708a;
}

.back-link {
  width: fit-content;
  color: #445ce3;
  font-weight: 700;
  text-decoration: none;
}

.form-help {
  margin: 0;
  color: #64708a;
}

.panel {
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e6f2;
  border-radius: 18px;
}

.subtitle {
  margin: 0;
  color: #5867e8;
  font-weight: 700;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
}

.event-form label {
  display: grid;
  gap: 8px;
  color: #405173;
  font-weight: 700;
}

.event-form input,
.event-form textarea,
.event-form select {
  width: 100%;
  padding: 10px 12px;
  color: #172033;
  border: 1px solid #cfd6e6;
  border-radius: 12px;
}

.event-form button {
  width: fit-content;
  padding: 10px 16px;
  color: #fff;
  cursor: pointer;
  background: #445ce3;
  border: 0;
  border-radius: 999px;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.action-row button {
  width: fit-content;
  padding: 10px 16px;
  color: #fff;
  cursor: pointer;
  background: #445ce3;
  border: 0;
  border-radius: 999px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.error-message {
  margin: 0;
  color: #c03535;
}

.detail-text {
  white-space: pre-wrap;
}

.hint {
  padding: 12px;
  margin: 0;
  color: #405173;
  background: #f3f5ff;
  border-radius: 12px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 4px 10px;
  color: #445ce3;
  background: #eef1ff;
  border-radius: 999px;
}

.related-events {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.related-events h2,
.related-events .empty-message {
  grid-column: 1 / -1;
}

.event-card-button {
  padding: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.event-card-button:focus-visible {
  outline: 3px solid #9aa8ff;
  outline-offset: 3px;
  border-radius: 18px;
}

.event-detail {
  align-content: start;
}

.not-found {
  padding: 32px;
  background: #fff;
  border: 1px solid #e2e6f2;
  border-radius: 18px;
}

@media (max-width: 860px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }
}
</style>

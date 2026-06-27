<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ConfirmActionModal from '@/components/ConfirmActionModal.vue'
import StudyRevealCard from '@/components/StudyRevealCard.vue'
import TimelineSnake from '@/components/TimelineSnake.vue'
import type { IHistoryEvent, StudyResult } from '@/domain/historyTypes'
import { useHistoryStore } from '@/stores/historyStore'

const BULK_DELETE_CONFIRM_MESSAGE = '是否执行该操作？该操作执行后无法恢复。'

const route = useRoute()
const store = useHistoryStore()
const timelineId = computed(() => String(route.params.timelineId ?? ''))
const selectedEventId = ref('')
const editingEventId = ref('')
const studyingEventId = ref('')
const isCreateFormVisible = ref(false)
const isStudyVisible = ref(false)
const isStudyModeEnabled = ref(false)
const isBatchDeleteVisible = ref(false)
const isBulkDeleteConfirmVisible = ref(false)
const errorMessage = ref('')
const selectedEventIds = ref<string[]>([])
const eventEditForms = reactive<Record<string, IEventForm>>({})

interface IEventForm {
  timeLabel: string
  title: string
  hint: string
  summary: string
  detail: string
  keywordsText: string
  personIds: string[]
  personIdsText: string
}

const form = reactive({
  timeLabel: '',
  title: '',
  hint: '',
  summary: '',
  detail: '',
  keywordsText: '',
  personIds: [] as string[],
  personIdsText: '',
})
let pendingBulkDeleteAction: (() => void) | null = null

const timeline = computed(() =>
  store.timelines.find((item) => item.id === timelineId.value),
)

const events = computed(() => store.eventsByTimeline(timelineId.value))
const pageError = computed(() => errorMessage.value || store.lastError)

const selectedEvent = computed(() => {
  return events.value.find((event) => event.id === selectedEventId.value) ?? null
})

const editingEvent = computed(() => {
  return events.value.find((event) => event.id === editingEventId.value) ?? null
})

const studyingEvent = computed(() => {
  return events.value.find((event) => event.id === studyingEventId.value) ?? null
})

const eventStudyResults = computed(() => {
  const results: Record<string, StudyResult> = {}

  store.studyRecords.forEach((record) => {
    if (record.targetType === 'event') {
      results[record.targetId] = record.result
    }
  })

  return results
})

const selectedStudyPrompt = computed(() => {
  if (!studyingEvent.value) {
    return ''
  }

  return studyingEvent.value.timeLabel
})

const selectedStudyAnswer = computed(() => {
  if (!studyingEvent.value) {
    return ''
  }

  return `${studyingEvent.value.title}\n\n${studyingEvent.value.detail}`
})

function createEvent() {
  if (!form.timeLabel.trim() || !form.title.trim()) {
    errorMessage.value = '请填写时间和事件标题。'
    return
  }

  const event = store.createEvent({
    timelineId: timelineId.value,
    timeLabel: form.timeLabel.trim(),
    sortValue: 0,
    title: form.title.trim(),
    hint: form.hint.trim(),
    summary: form.summary.trim(),
    detail: form.detail.trim(),
    keywords: parseCommaSeparatedText(form.keywordsText),
    personIds: mergeSelectedIds(form.personIds, form.personIdsText),
  })

  selectedEventId.value = event.id
  resetForm()
  isCreateFormVisible.value = false
  errorMessage.value = ''
}

function getEventEditForm(event: IHistoryEvent): IEventForm {
  eventEditForms[event.id] ??= {
    timeLabel: event.timeLabel,
    title: event.title,
    hint: event.hint,
    summary: event.summary,
    detail: event.detail,
    keywordsText: event.keywords.join(','),
    personIds: event.personIds.filter(isKnownPersonId),
    personIdsText: event.personIds.filter((id) => !isKnownPersonId(id)).join(','),
  }

  return eventEditForms[event.id]
}

function updateEvent(event: IHistoryEvent) {
  const editForm = getEventEditForm(event)

  if (!editForm.timeLabel.trim() || !editForm.title.trim()) {
    errorMessage.value = '请填写时间和事件标题。'
    return
  }

  store.updateEvent(event.id, {
    timelineId: event.timelineId,
    timeLabel: editForm.timeLabel.trim(),
    sortValue: event.sortValue,
    title: editForm.title.trim(),
    hint: editForm.hint.trim(),
    summary: editForm.summary.trim(),
    detail: editForm.detail.trim(),
    keywords: parseCommaSeparatedText(editForm.keywordsText),
    personIds: mergeSelectedIds(editForm.personIds, editForm.personIdsText),
  })
  errorMessage.value = ''
}

function deleteEvent(event: IHistoryEvent) {
  const confirmed = window.confirm(`确认删除事件“${event.title}”吗？`)

  if (!confirmed) {
    return
  }

  store.deleteEvent(event.id)
  delete eventEditForms[event.id]
  selectedEventId.value = ''
  editingEventId.value = ''
  studyingEventId.value = ''
  selectedEventIds.value = selectedEventIds.value.filter((eventId) => eventId !== event.id)
  isStudyVisible.value = false
  errorMessage.value = ''
}

function selectEvent(event: IHistoryEvent) {
  if (isStudyModeEnabled.value) {
    studyingEventId.value = event.id
    selectedEventId.value = ''
    isStudyVisible.value = true
    return
  }

  selectedEventId.value = event.id
  isStudyVisible.value = false
}

function editEvent(event: IHistoryEvent) {
  editingEventId.value = event.id
}

function showBatchDelete() {
  isBatchDeleteVisible.value = true
  selectedEventIds.value = []
  selectedEventId.value = ''
  editingEventId.value = ''
  closeStudy()
  errorMessage.value = ''
}

function closeBatchDelete() {
  isBatchDeleteVisible.value = false
  selectedEventIds.value = []
  errorMessage.value = ''
}

function toggleSelectedEvent(eventId: string) {
  selectedEventIds.value = selectedEventIds.value.includes(eventId)
    ? selectedEventIds.value.filter((selectedId) => selectedId !== eventId)
    : [...selectedEventIds.value, eventId]
}

function deleteSelectedEvents() {
  if (selectedEventIds.value.length === 0) {
    errorMessage.value = '请先选择要删除的事件。'
    return
  }

  const selectedIdSet = new Set(selectedEventIds.value)
  const shouldCloseStudy = selectedIdSet.has(studyingEventId.value)

  requestBulkDeleteConfirmation(() => {
    selectedIdSet.forEach((eventId) => {
      store.deleteEvent(eventId)
      delete eventEditForms[eventId]
    })
    selectedEventIds.value = []
    isBatchDeleteVisible.value = false
    selectedEventId.value = selectedIdSet.has(selectedEventId.value) ? '' : selectedEventId.value
    editingEventId.value = selectedIdSet.has(editingEventId.value) ? '' : editingEventId.value
    studyingEventId.value = selectedIdSet.has(studyingEventId.value) ? '' : studyingEventId.value
    isStudyVisible.value = shouldCloseStudy ? false : isStudyVisible.value
    errorMessage.value = ''
  })
}

function deleteEventsByStudyResult(result: StudyResult) {
  const eventsToDelete = events.value.filter((event) => {
    const latestResult = eventStudyResults.value[event.id]

    return result === 'remembered'
      ? latestResult === 'remembered'
      : latestResult !== 'remembered'
  })

  if (eventsToDelete.length === 0) {
    errorMessage.value =
      result === 'remembered' ? '没有已背过的事件。' : '没有未背过的事件。'
    return
  }

  const deletedIdSet = new Set(eventsToDelete.map((event) => event.id))
  const shouldCloseStudy = deletedIdSet.has(studyingEventId.value)

  requestBulkDeleteConfirmation(() => {
    deletedIdSet.forEach((eventId) => {
      store.deleteEvent(eventId)
      delete eventEditForms[eventId]
    })
    selectedEventIds.value = selectedEventIds.value.filter(
      (eventId) => !deletedIdSet.has(eventId),
    )
    isBatchDeleteVisible.value = false
    selectedEventId.value = deletedIdSet.has(selectedEventId.value) ? '' : selectedEventId.value
    editingEventId.value = deletedIdSet.has(editingEventId.value) ? '' : editingEventId.value
    studyingEventId.value = deletedIdSet.has(studyingEventId.value) ? '' : studyingEventId.value
    isStudyVisible.value = shouldCloseStudy ? false : isStudyVisible.value
    errorMessage.value = ''
  })
}

function requestBulkDeleteConfirmation(action: () => void) {
  pendingBulkDeleteAction = action
  isBulkDeleteConfirmVisible.value = true
}

function confirmBulkDelete() {
  const action = pendingBulkDeleteAction

  pendingBulkDeleteAction = null
  isBulkDeleteConfirmVisible.value = false
  action?.()
}

function cancelBulkDelete() {
  pendingBulkDeleteAction = null
  isBulkDeleteConfirmVisible.value = false
}

function closeEventDetail() {
  selectedEventId.value = ''
  isStudyVisible.value = false
}

function closeEventEditor() {
  editingEventId.value = ''
}

function closeStudy() {
  studyingEventId.value = ''
  isStudyVisible.value = false
}

function toggleStudyMode() {
  isStudyModeEnabled.value = !isStudyModeEnabled.value
  selectedEventId.value = ''
  closeBatchDelete()
  closeStudy()
}

function recordStudy(result: StudyResult) {
  if (!studyingEvent.value) {
    return
  }

  store.recordStudy('event', studyingEvent.value.id, result)
  closeStudy()
}

function resetForm() {
  form.timeLabel = ''
  form.title = ''
  form.hint = ''
  form.summary = ''
  form.detail = ''
  form.keywordsText = ''
  form.personIds = []
  form.personIdsText = ''
}

function parseCommaSeparatedText(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function mergeSelectedIds(selectedIds: string[], extraText: string): string[] {
  return Array.from(
    new Set([...selectedIds, ...parseCommaSeparatedText(extraText)]),
  )
}

function isKnownPersonId(personId: string): boolean {
  return store.people.some((person) => person.id === personId)
}
</script>

<template>
  <section v-if="timeline" class="page">
    <header class="page-header">
      <RouterLink class="back-link" to="/timelines">返回时间线列表</RouterLink>
      <h1>{{ timeline.name }}</h1>
      <p v-if="timeline.description">{{ timeline.description }}</p>
      <div v-if="timeline.tags.length" class="tag-list">
        <span v-for="tag in timeline.tags" :key="tag" class="tag">
          {{ tag }}
        </span>
      </div>
      <button
        class="primary-button"
        type="button"
        @click="isCreateFormVisible = !isCreateFormVisible"
      >
        {{ isCreateFormVisible ? '收起添加' : '添加历史事件' }}
      </button>
    </header>

    <div
      v-if="isCreateFormVisible"
      class="event-modal"
      role="dialog"
      aria-modal="true"
      aria-label="添加历史事件"
      @click.self="isCreateFormVisible = false"
    >
      <section class="event-modal-content">
        <button
          class="close-button"
          type="button"
          @click="isCreateFormVisible = false"
        >
          关闭
        </button>

        <form class="panel event-form" @submit.prevent="createEvent">
          <h2>添加历史事件</h2>

          <div class="form-grid">
            <label>
              时间
              <input v-model="form.timeLabel" type="text" placeholder="例如：1840年" />
            </label>
          </div>

          <label>
            标题
            <input v-model="form.title" type="text" placeholder="例如：鸦片战争" />
          </label>

          <label>
            提示
            <input v-model="form.hint" type="text" placeholder="用于背诵时提示自己" />
          </label>

          <label>
            摘要
            <textarea
              v-model="form.summary"
              rows="2"
              placeholder="事件的一句话概括"
            />
          </label>

          <label>
            详情
            <textarea
              v-model="form.detail"
              rows="5"
              placeholder="需要记忆的完整内容"
            />
          </label>

          <div class="form-grid">
            <label>
              关键词
              <input
                v-model="form.keywordsText"
                type="text"
                placeholder="用英文逗号分隔"
              />
            </label>

            <label>
              选择关联人物（可选）
              <select v-model="form.personIds" multiple>
                <option
                  v-for="person in store.people"
                  :key="person.id"
                  :value="person.id"
                >
                  {{ person.name }}
                </option>
              </select>
            </label>

            <label>
              其他人物 ID（可选）
              <input
                v-model="form.personIdsText"
                type="text"
                placeholder="用英文逗号分隔"
              />
            </label>
          </div>

          <p v-if="pageError" class="error-message">{{ pageError }}</p>
          <button type="submit">保存事件</button>
        </form>
      </section>
    </div>

    <section class="panel">
      <div class="section-heading">
        <h2>事件时间线</h2>
        <button
          class="primary-button study-mode-button"
          :class="{ 'study-mode-button--active': isStudyModeEnabled }"
          data-test="toggle-event-study-mode"
          type="button"
          @click="toggleStudyMode"
        >
          {{ isStudyModeEnabled ? '退出背诵模式' : '进入背诵模式' }}
        </button>
      </div>
      <div v-if="events.length" class="batch-actions">
        <span v-if="isBatchDeleteVisible">
          已选择 {{ selectedEventIds.length }} 个事件
        </span>
        <button
          v-if="!isBatchDeleteVisible"
          type="button"
          @click="showBatchDelete"
        >
          批量删除
        </button>
        <button
          v-else
          type="button"
          :disabled="selectedEventIds.length === 0"
          @click="deleteSelectedEvents"
        >
          删除选中
        </button>
        <button
          v-if="isBatchDeleteVisible"
          type="button"
          @click="deleteEventsByStudyResult('remembered')"
        >
          删除已背过
        </button>
        <button
          v-if="isBatchDeleteVisible"
          type="button"
          @click="deleteEventsByStudyResult('forgotten')"
        >
          删除未背过
        </button>
        <button
          v-if="isBatchDeleteVisible"
          class="secondary-action"
          type="button"
          @click="closeBatchDelete"
        >
          取消
        </button>
      </div>
      <p v-if="events.length === 0" class="empty-message">
        还没有事件，先添加一个历史事件吧。
      </p>
      <TimelineSnake
        v-else
        :events="events"
        :study-results="eventStudyResults"
        :is-batch-delete-visible="isBatchDeleteVisible"
        :selected-event-ids="selectedEventIds"
        @select="selectEvent"
        @edit="editEvent"
        @toggle-select="toggleSelectedEvent"
      />
    </section>

    <div
      v-if="selectedEvent"
      class="event-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="selectedEvent.title"
      @click.self="closeEventDetail"
    >
      <section class="event-modal-content">
        <button class="close-button" type="button" @click="closeEventDetail">
          关闭
        </button>

        <article class="panel event-detail">
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
            <p v-if="selectedEvent.personIds.length" class="person-ids">
              关联人物 ID：{{ selectedEvent.personIds.join('，') }}
            </p>

            <div class="action-row">
              <button type="button" @click="closeEventDetail">返回时间线</button>
            </div>
          </article>

      </section>
    </div>

    <div
      v-if="isStudyVisible && studyingEvent"
      class="event-modal"
      role="dialog"
      aria-modal="true"
      aria-label="背诵练习"
      @click.self="closeStudy"
    >
      <section class="event-modal-content study-modal-content">
        <button class="close-button" type="button" @click="closeStudy">
          关闭
        </button>

        <section class="panel study-section">
          <h2>背诵练习</h2>
          <StudyRevealCard
            :key="studyingEvent.id"
            :prompt="selectedStudyPrompt"
            :answer="selectedStudyAnswer"
            :hint="studyingEvent.hint"
            @mark="recordStudy"
          />
        </section>
      </section>
    </div>

    <div
      v-if="editingEvent"
      class="event-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="`编辑${editingEvent.title}`"
      @click.self="closeEventEditor"
    >
      <section class="event-modal-content">
        <button class="close-button" type="button" @click="closeEventEditor">
          关闭
        </button>

        <form class="panel event-form" @submit.prevent="updateEvent(editingEvent)">
          <h2>编辑事件</h2>
          <label>
            时间
            <input v-model="getEventEditForm(editingEvent).timeLabel" type="text" />
          </label>

          <label>
            标题
            <input v-model="getEventEditForm(editingEvent).title" type="text" />
          </label>

          <label>
            提示
            <input v-model="getEventEditForm(editingEvent).hint" type="text" />
          </label>

          <label>
            摘要
            <textarea v-model="getEventEditForm(editingEvent).summary" rows="2" />
          </label>

          <label>
            详情
            <textarea v-model="getEventEditForm(editingEvent).detail" rows="5" />
          </label>

          <div class="form-grid">
            <label>
              关键词
              <input
                v-model="getEventEditForm(editingEvent).keywordsText"
                type="text"
              />
            </label>

            <label>
              选择关联人物
              <select v-model="getEventEditForm(editingEvent).personIds" multiple>
                <option
                  v-for="person in store.people"
                  :key="person.id"
                  :value="person.id"
                >
                  {{ person.name }}
                </option>
              </select>
            </label>

            <label>
              其他人物 ID
              <input
                v-model="getEventEditForm(editingEvent).personIdsText"
                type="text"
                placeholder="用英文逗号分隔"
              />
            </label>
          </div>

          <div class="action-row">
            <button type="submit">保存修改</button>
            <button
              class="danger-button"
              type="button"
              @click="deleteEvent(editingEvent)"
            >
              删除事件
            </button>
          </div>
        </form>
      </section>
    </div>

    <ConfirmActionModal
      v-if="isBulkDeleteConfirmVisible"
      :message="BULK_DELETE_CONFIRM_MESSAGE"
      @confirm="confirmBulkDelete"
      @cancel="cancelBulkDelete"
    />
  </section>

  <section v-else class="page not-found">
    <h1>没有找到这条时间线</h1>
    <p>它可能已经被删除，或链接地址不正确。</p>
    <RouterLink class="back-link" to="/timelines">返回时间线列表</RouterLink>
  </section>
</template>

<style scoped>
.page {
  display: grid;
  gap: 24px;
}

.page-header,
.panel,
.event-form,
.study-section {
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

.primary-button {
  width: fit-content;
  padding: 10px 16px;
  color: #fff;
  cursor: pointer;
  background: #445ce3;
  border: 0;
  border-radius: 999px;
}

.study-mode-button {
  background: #9a4b2d;
}

.study-mode-button--active {
  background: #c03535;
}

.section-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.section-heading h2 {
  margin: 0;
}

.batch-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  color: #64708a;
}

.batch-actions button {
  width: fit-content;
  padding: 10px 16px;
  color: #fff;
  cursor: pointer;
  background: #c03535;
  border: 0;
  border-radius: 999px;
}

.batch-actions .secondary-action {
  background: #445ce3;
}

.batch-actions button:disabled {
  cursor: not-allowed;
  background: #aeb6c8;
}

.panel {
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e6f2;
  border-radius: 18px;
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

.event-form select {
  min-height: 92px;
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.error-message {
  margin: 0;
  color: #c03535;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
  gap: 24px;
}

.event-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  padding: 32px;
  overflow: auto;
  background: rgb(15 23 42 / 60%);
}

.event-modal-content {
  width: min(1180px, 100%);
  min-height: calc(100vh - 64px);
  padding: 24px;
  margin: 0 auto;
  background: #f6f7fb;
  border-radius: 24px;
}

.study-modal-content {
  width: min(820px, 100%);
}

.close-button {
  display: block;
  margin: 0 0 16px auto;
  padding: 10px 16px;
  color: #fff;
  cursor: pointer;
  background: #172033;
  border: 0;
  border-radius: 999px;
}

.event-detail {
  align-content: start;
}

.subtitle {
  margin: 0;
  color: #5867e8;
  font-weight: 700;
}

.hint {
  padding: 12px;
  margin: 0;
  color: #405173;
  background: #f3f5ff;
  border-radius: 12px;
}

.detail-text {
  white-space: pre-wrap;
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

.person-ids {
  margin: 0;
  color: #64708a;
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

.action-row .danger-button {
  background: #c03535;
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

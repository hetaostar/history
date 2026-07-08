<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ConfirmActionModal from '@/components/ConfirmActionModal.vue'
import { useConfirmModal } from '@/composables/useConfirmModal'
import { useModalBehavior } from '@/composables/useModalBehavior'
import type { ITimeline, StudyResult } from '@/domain/historyTypes'
import { useHistoryStore } from '@/stores/historyStore'

type TimelineStudyStatus = 'empty' | 'remembered' | 'forgotten'

const timelineStatusLabels: Record<TimelineStudyStatus, string> = {
  empty: '未开始',
  remembered: '已背过',
  forgotten: '未背过',
}

const SINGLE_DELETE_CONFIRM_MESSAGE = '是否执行该操作？该操作执行后无法恢复。'

const store = useHistoryStore()
const errorMessage = ref('')
const isCreateFormVisible = ref(false)
const editingTimelineId = ref('')
const isBatchDeleteVisible = ref(false)
const selectedTimelineIds = ref<string[]>([])
const timelineEditForms = reactive<
  Record<string, { name: string; description: string; tagsText: string }>
>({})

const form = reactive({
  name: '',
  description: '',
  tagsText: '',
})

const modal = useConfirmModal()

const { containerRef: createModalRef } = useModalBehavior(
  isCreateFormVisible,
  () => {
    isCreateFormVisible.value = false
  },
)

const pageError = computed(() => errorMessage.value || store.lastError)
const eventStudyResults = computed(() => {
  const results: Record<string, StudyResult> = {}

  store.studyRecords.forEach((record) => {
    if (record.targetType === 'event') {
      results[record.targetId] = record.result
    }
  })

  return results
})

function createTimeline() {
  const name = form.name.trim()

  if (!name) {
    errorMessage.value = '请先填写时间线名称。'
    return
  }

  store.createTimeline({
    name,
    description: form.description.trim(),
    tags: parseCommaSeparatedText(form.tagsText),
  })

  form.name = ''
  form.description = ''
  form.tagsText = ''
  isCreateFormVisible.value = false
  errorMessage.value = ''
}

function getTimelineEditForm(timeline: ITimeline) {
  timelineEditForms[timeline.id] ??= {
    name: timeline.name,
    description: timeline.description,
    tagsText: timeline.tags.join(','),
  }

  return timelineEditForms[timeline.id]
}

function updateTimeline(timeline: ITimeline) {
  const editForm = getTimelineEditForm(timeline)
  const name = editForm.name.trim()

  if (!name) {
    errorMessage.value = '请填写时间线名称。'
    return
  }

  store.updateTimeline(timeline.id, {
    name,
    description: editForm.description.trim(),
    tags: parseCommaSeparatedText(editForm.tagsText),
  })
  editingTimelineId.value = ''
  errorMessage.value = ''
}

function deleteTimeline(timeline: ITimeline) {
  modal.request(`确认删除时间线“${timeline.name}”吗？`, () => {
    store.deleteTimeline(timeline.id)
    delete timelineEditForms[timeline.id]
    selectedTimelineIds.value = selectedTimelineIds.value.filter(
      (timelineId) => timelineId !== timeline.id,
    )
    editingTimelineId.value =
      editingTimelineId.value === timeline.id ? '' : editingTimelineId.value
    errorMessage.value = ''
  })
}

function showBatchDelete() {
  isBatchDeleteVisible.value = true
  selectedTimelineIds.value = []
  errorMessage.value = ''
}

function closeBatchDelete() {
  isBatchDeleteVisible.value = false
  selectedTimelineIds.value = []
  errorMessage.value = ''
}

function toggleCreateForm() {
  closeBatchDelete()
  isCreateFormVisible.value = !isCreateFormVisible.value
}

function toggleSelectedTimeline(timelineId: string) {
  selectedTimelineIds.value = selectedTimelineIds.value.includes(timelineId)
    ? selectedTimelineIds.value.filter(
        (selectedId) => selectedId !== timelineId,
      )
    : [...selectedTimelineIds.value, timelineId]
}

function deleteSelectedTimelines() {
  if (selectedTimelineIds.value.length === 0) {
    errorMessage.value = '请先选择要删除的时间线。'
    return
  }

  const selectedIdSet = new Set(selectedTimelineIds.value)

  modal.request(SINGLE_DELETE_CONFIRM_MESSAGE, () => {
    selectedIdSet.forEach((timelineId) => {
      store.deleteTimeline(timelineId)
      delete timelineEditForms[timelineId]
    })
    selectedTimelineIds.value = []
    isBatchDeleteVisible.value = false
    editingTimelineId.value = selectedIdSet.has(editingTimelineId.value)
      ? ''
      : editingTimelineId.value
    errorMessage.value = ''
  })
}

function deleteTimelinesByStudyStatus(result: StudyResult) {
  const timelinesToDelete = store.timelines.filter((timeline) => {
    const status = getTimelineStudyStatus(timeline)
    return status === result
  })

  if (timelinesToDelete.length === 0) {
    errorMessage.value =
      result === 'remembered' ? '没有已背过的时间线。' : '没有未背过的时间线。'
    return
  }

  const deletedIdSet = new Set(timelinesToDelete.map((timeline) => timeline.id))

  modal.request(SINGLE_DELETE_CONFIRM_MESSAGE, () => {
    deletedIdSet.forEach((timelineId) => {
      store.deleteTimeline(timelineId)
      delete timelineEditForms[timelineId]
    })
    selectedTimelineIds.value = selectedTimelineIds.value.filter(
      (timelineId) => !deletedIdSet.has(timelineId),
    )
    isBatchDeleteVisible.value = false
    editingTimelineId.value = deletedIdSet.has(editingTimelineId.value)
      ? ''
      : editingTimelineId.value
    errorMessage.value = ''
  })
}

function showTimelineEditor(timeline: ITimeline) {
  closeBatchDelete()
  getTimelineEditForm(timeline)
  editingTimelineId.value = timeline.id
}

function closeTimelineEditor() {
  editingTimelineId.value = ''
}

function openTimeline(event: MouseEvent, timeline: ITimeline) {
  if (!isBatchDeleteVisible.value) {
    return
  }

  event.preventDefault()
  toggleSelectedTimeline(timeline.id)
}

function selectTimelineForBatch(timeline: ITimeline) {
  if (!isBatchDeleteVisible.value) {
    return
  }

  toggleSelectedTimeline(timeline.id)
}

function getTimelineStudyStatus(timeline: ITimeline): TimelineStudyStatus {
  const timelineEvents = store.eventsByTimeline(timeline.id)

  if (timelineEvents.length === 0) {
    return 'empty'
  }

  const allRemembered = timelineEvents.every(
    (event) => eventStudyResults.value[event.id] === 'remembered',
  )

  return allRemembered ? 'remembered' : 'forgotten'
}

function parseCommaSeparatedText(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>时间线</h1>
      <p>按朝代、专题或考试范围整理历史事件，用于连续背诵。</p>
      <button class="primary-button" type="button" @click="toggleCreateForm">
        {{ isCreateFormVisible ? '收起创建' : '创建时间线' }}
      </button>
    </header>

    <div
      v-if="isCreateFormVisible"
      ref="createModalRef"
      class="timeline-modal"
      role="dialog"
      aria-modal="true"
      aria-label="新建时间线"
      @click.self="isCreateFormVisible = false"
    >
      <section class="timeline-modal-content">
        <button
          class="close-button"
          type="button"
          @click="isCreateFormVisible = false"
        >
          关闭
        </button>

        <form class="panel timeline-form" @submit.prevent="createTimeline">
          <h2>新建时间线</h2>

          <label>
            名称
            <input
              v-model="form.name"
              type="text"
              placeholder="例如：中国近代史"
            />
          </label>

          <label>
            描述
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="简单说明这条时间线覆盖的内容"
            />
          </label>

          <label>
            标签
            <input
              v-model="form.tagsText"
              type="text"
              placeholder="用英文逗号分隔，例如：高考,近代史"
            />
          </label>

          <p v-if="pageError" class="error-message">{{ pageError }}</p>
          <button type="submit">保存时间线</button>
        </form>
      </section>
    </div>

    <section class="timeline-list" aria-label="全部时间线">
      <h2>全部时间线</h2>
      <div v-if="store.timelines.length" class="batch-actions">
        <span v-if="isBatchDeleteVisible">
          已选择 {{ selectedTimelineIds.length }} 条时间线
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
          :disabled="selectedTimelineIds.length === 0"
          @click="deleteSelectedTimelines"
        >
          删除选中
        </button>
        <button
          v-if="isBatchDeleteVisible"
          type="button"
          @click="deleteTimelinesByStudyStatus('remembered')"
        >
          删除已背过
        </button>
        <button
          v-if="isBatchDeleteVisible"
          type="button"
          @click="deleteTimelinesByStudyStatus('forgotten')"
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

      <p v-if="store.timelines.length === 0" class="empty-message">
        还没有时间线，先创建一条吧。
      </p>

      <article
        v-for="timeline in store.timelines"
        :key="timeline.id"
        class="timeline-card"
      >
        <input
          v-if="isBatchDeleteVisible"
          v-model="selectedTimelineIds"
          class="select-timeline-checkbox"
          type="checkbox"
          :value="timeline.id"
          aria-label="选择时间线"
          @click.stop
          @keydown.stop
        />
        <button
          class="icon-button"
          type="button"
          aria-label="编辑时间线"
          @click="showTimelineEditor(timeline)"
        >
          ✎
        </button>
        <button
          v-if="isBatchDeleteVisible"
          class="timeline-card-link timeline-card-select"
          type="button"
          @click="selectTimelineForBatch(timeline)"
        >
          <strong>{{ timeline.name }}</strong>
          <p v-if="timeline.description">{{ timeline.description }}</p>
          <span v-if="timeline.tags.length" class="tag-list">
            <span v-for="tag in timeline.tags" :key="tag" class="tag">
              {{ tag }}
            </span>
          </span>
          <span
            class="study-status"
            :class="`study-status--${getTimelineStudyStatus(timeline)}`"
          >
            {{ timelineStatusLabels[getTimelineStudyStatus(timeline)] }}
          </span>
        </button>
        <RouterLink
          v-else
          class="timeline-card-link"
          :to="`/timelines/${timeline.id}`"
          @click="openTimeline($event, timeline)"
        >
          <strong>{{ timeline.name }}</strong>
          <p v-if="timeline.description">{{ timeline.description }}</p>
          <span v-if="timeline.tags.length" class="tag-list">
            <span v-for="tag in timeline.tags" :key="tag" class="tag">
              {{ tag }}
            </span>
          </span>
          <span
            class="study-status"
            :class="`study-status--${getTimelineStudyStatus(timeline)}`"
          >
            {{ timelineStatusLabels[getTimelineStudyStatus(timeline)] }}
          </span>
        </RouterLink>

        <form
          v-if="editingTimelineId === timeline.id"
          class="inline-form"
          @submit.prevent="updateTimeline(timeline)"
        >
          <label>
            名称
            <input v-model="getTimelineEditForm(timeline).name" type="text" />
          </label>

          <label>
            描述
            <textarea
              v-model="getTimelineEditForm(timeline).description"
              rows="3"
            />
          </label>

          <label>
            标签
            <input
              v-model="getTimelineEditForm(timeline).tagsText"
              type="text"
              placeholder="用英文逗号分隔"
            />
          </label>

          <div class="action-row">
            <button type="submit">保存修改</button>
            <button type="button" @click="closeTimelineEditor">取消</button>
            <button
              class="danger-button"
              type="button"
              @click="deleteTimeline(timeline)"
            >
              删除
            </button>
          </div>
        </form>
      </article>
    </section>

    <ConfirmActionModal
      v-if="modal.isVisible.value"
      :message="modal.message.value"
      @confirm="modal.confirm"
      @cancel="modal.cancel"
    />
  </section>
</template>

<style scoped>
.page {
  display: grid;
  gap: 24px;
}

.page-header,
.panel,
.timeline-list {
  display: grid;
  gap: 16px;
}

.page-header p,
.empty-message {
  margin: 0;
  color: #64708a;
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

.timeline-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  padding: 32px;
  overflow: auto;
  background: rgb(15 23 42 / 60%);
}

.timeline-modal-content {
  width: min(920px, 100%);
  padding: 24px;
  margin: 24px auto;
  background: #f6f7fb;
  border-radius: 24px;
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

.panel,
.timeline-card {
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e6f2;
  border-radius: 18px;
}

.timeline-form label {
  display: grid;
  gap: 8px;
  color: #405173;
  font-weight: 700;
}

.timeline-form input,
.timeline-form textarea {
  width: 100%;
  padding: 10px 12px;
  color: #172033;
  border: 1px solid #cfd6e6;
  border-radius: 12px;
}

.timeline-form button {
  width: fit-content;
  padding: 10px 16px;
  color: #fff;
  cursor: pointer;
  background: #445ce3;
  border: 0;
  border-radius: 999px;
}

.error-message {
  margin: 0;
  color: #c03535;
}

.timeline-list {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.timeline-list h2,
.timeline-list .batch-actions,
.timeline-list .empty-message {
  grid-column: 1 / -1;
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

.timeline-card {
  position: relative;
  display: grid;
  gap: 10px;
  color: inherit;
  box-shadow: 0 8px 24px rgb(35 45 90 / 8%);
}

.select-timeline-checkbox {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 1;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.icon-button {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: #445ce3;
  cursor: pointer;
  background: #eef1ff;
  border: 0;
  border-radius: 999px;
}

.timeline-card-link {
  position: relative;
  display: grid;
  gap: 10px;
  padding-left: 48px;
  padding-right: 52px;
  padding-bottom: 44px;
  color: inherit;
  text-decoration: none;
}

.timeline-card-select {
  width: 100%;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.study-status {
  position: absolute;
  left: 0;
  bottom: 0;
  width: fit-content;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
}

.study-status--remembered {
  color: #237a48;
  background: #e8f7ee;
}

.study-status--forgotten {
  color: #a9471b;
  background: #fff1e8;
}

.study-status--empty {
  color: #64708a;
  background: #eef1f7;
}

.timeline-card strong {
  color: #172033;
  font-size: 18px;
}

.timeline-card p {
  margin: 0;
  color: #64708a;
}

.inline-form {
  display: grid;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #edf0f7;
}

.inline-form label {
  display: grid;
  gap: 8px;
  color: #405173;
  font-weight: 700;
}

.inline-form input,
.inline-form textarea {
  width: 100%;
  padding: 10px 12px;
  color: #172033;
  border: 1px solid #cfd6e6;
  border-radius: 12px;
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
</style>

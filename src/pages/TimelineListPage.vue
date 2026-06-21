<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { ITimeline } from '@/domain/historyTypes'
import { useHistoryStore } from '@/stores/historyStore'

const store = useHistoryStore()
const errorMessage = ref('')
const isCreateFormVisible = ref(false)
const editingTimelineId = ref('')
const timelineEditForms = reactive<
  Record<string, { name: string; description: string; tagsText: string }>
>({})

const form = reactive({
  name: '',
  description: '',
  tagsText: '',
})

const pageError = computed(() => errorMessage.value || store.lastError)

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
  const confirmed = window.confirm(`确认删除时间线“${timeline.name}”吗？`)

  if (!confirmed) {
    return
  }

  store.deleteTimeline(timeline.id)
  delete timelineEditForms[timeline.id]
  errorMessage.value = ''
}

function showTimelineEditor(timeline: ITimeline) {
  getTimelineEditForm(timeline)
  editingTimelineId.value = timeline.id
}

function closeTimelineEditor() {
  editingTimelineId.value = ''
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
      <button
        class="primary-button"
        type="button"
        @click="isCreateFormVisible = !isCreateFormVisible"
      >
        {{ isCreateFormVisible ? '收起创建' : '创建时间线' }}
      </button>
    </header>

    <form
      v-if="isCreateFormVisible"
      class="panel timeline-form"
      @submit.prevent="createTimeline"
    >
      <h2>新建时间线</h2>

      <label>
        名称
        <input v-model="form.name" type="text" placeholder="例如：中国近代史" />
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

    <section class="timeline-list" aria-label="全部时间线">
      <h2>全部时间线</h2>

      <p v-if="store.timelines.length === 0" class="empty-message">
        还没有时间线，先创建一条吧。
      </p>

      <article
        v-for="timeline in store.timelines"
        :key="timeline.id"
        class="timeline-card"
      >
        <div class="timeline-card-header">
          <strong>{{ timeline.name }}</strong>
          <div class="card-actions">
            <button
              class="icon-button"
              type="button"
              aria-label="编辑时间线"
              @click="showTimelineEditor(timeline)"
            >
              ✎
            </button>
            <RouterLink class="detail-link" :to="`/timelines/${timeline.id}`">
              查看详情
            </RouterLink>
          </div>
        </div>
        <p v-if="timeline.description">{{ timeline.description }}</p>
        <span v-if="timeline.tags.length" class="tag-list">
          <span v-for="tag in timeline.tags" :key="tag" class="tag">
            {{ tag }}
          </span>
        </span>

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
.timeline-list .empty-message {
  grid-column: 1 / -1;
}

.timeline-card {
  display: grid;
  gap: 10px;
  color: inherit;
  box-shadow: 0 8px 24px rgb(35 45 90 / 8%);
}

.timeline-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-button {
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

.timeline-card strong {
  color: #172033;
  font-size: 18px;
}

.timeline-card p {
  margin: 0;
  color: #64708a;
}

.detail-link {
  color: #445ce3;
  font-weight: 700;
  text-decoration: none;
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

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ConfirmActionModal from '@/components/ConfirmActionModal.vue'
import EntityCard from '@/components/EntityCard.vue'
import StudyRevealCard from '@/components/StudyRevealCard.vue'
import type { IPerson, StudyResult } from '@/domain/historyTypes'
import { useHistoryStore } from '@/stores/historyStore'

const BULK_DELETE_CONFIRM_MESSAGE = '是否执行该操作？该操作执行后无法恢复。'

const store = useHistoryStore()
const errorMessage = ref('')
const isCreateFormVisible = ref(false)
const editingPersonId = ref('')
const isBatchDeleteVisible = ref(false)
const isStudyModeEnabled = ref(false)
const isBulkDeleteConfirmVisible = ref(false)
const studyingPersonId = ref('')
const selectedPersonIds = ref<string[]>([])
const personEditForms = reactive<
  Record<
    string,
    {
      name: string
      lifeTime: string
      summary: string
      biography: string
      achievements: string
      keywordsText: string
    }
  >
>({})

const form = reactive({
  name: '',
  lifeTime: '',
  summary: '',
  biography: '',
  achievements: '',
  keywordsText: '',
})
let pendingBulkDeleteAction: (() => void) | null = null

const pageError = computed(() => errorMessage.value || store.lastError)
const studyingPerson = computed(() => {
  return store.people.find((person) => person.id === studyingPersonId.value) ?? null
})
const studyingPersonAnswer = computed(() => {
  if (!studyingPerson.value) {
    return ''
  }

  const relatedEvents = store.eventsByPerson(studyingPerson.value.id)
  const parts = [
    studyingPerson.value.biography && `生平：\n${studyingPerson.value.biography}`,
    studyingPerson.value.achievements &&
      `主要成就：\n${studyingPerson.value.achievements}`,
    relatedEvents.length > 0 &&
      `关联事件：\n${relatedEvents.map((event) => `- ${event.title}`).join('\n')}`,
  ].filter(Boolean)

  return parts.join('\n\n')
})
const personStudyResults = computed(() => {
  const results: Record<string, StudyResult> = {}

  store.studyRecords.forEach((record) => {
    if (record.targetType === 'person') {
      results[record.targetId] = record.result
    }
  })

  return results
})

function createPerson() {
  const name = form.name.trim()

  if (!name) {
    errorMessage.value = '请先填写人物姓名。'
    return
  }

  store.createPerson({
    name,
    lifeTime: form.lifeTime.trim(),
    summary: form.summary.trim(),
    biography: form.biography.trim(),
    achievements: form.achievements.trim(),
    keywords: parseCommaSeparatedText(form.keywordsText),
  })

  resetForm()
  isCreateFormVisible.value = false
  errorMessage.value = ''
}

function getPersonEditForm(person: IPerson) {
  personEditForms[person.id] ??= {
    name: person.name,
    lifeTime: person.lifeTime,
    summary: person.summary,
    biography: person.biography,
    achievements: person.achievements,
    keywordsText: person.keywords.join(','),
  }

  return personEditForms[person.id]
}

function updatePerson(person: IPerson) {
  const editForm = getPersonEditForm(person)
  const name = editForm.name.trim()

  if (!name) {
    errorMessage.value = '请填写人物姓名。'
    return
  }

  store.updatePerson(person.id, {
    name,
    lifeTime: editForm.lifeTime.trim(),
    summary: editForm.summary.trim(),
    biography: editForm.biography.trim(),
    achievements: editForm.achievements.trim(),
    keywords: parseCommaSeparatedText(editForm.keywordsText),
  })
  editingPersonId.value = ''
  errorMessage.value = ''
}

function deletePerson(person: IPerson) {
  const confirmed = window.confirm(`确认删除人物“${person.name}”吗？`)

  if (!confirmed) {
    return
  }

  store.deletePerson(person.id)
  delete personEditForms[person.id]
  studyingPersonId.value =
    studyingPersonId.value === person.id ? '' : studyingPersonId.value
  selectedPersonIds.value = selectedPersonIds.value.filter(
    (personId) => personId !== person.id,
  )
  errorMessage.value = ''
}

function showBatchDelete() {
  isBatchDeleteVisible.value = true
  selectedPersonIds.value = []
  errorMessage.value = ''
}

function closeBatchDelete() {
  isBatchDeleteVisible.value = false
  selectedPersonIds.value = []
  errorMessage.value = ''
}

function toggleSelectedPerson(personId: string) {
  selectedPersonIds.value = selectedPersonIds.value.includes(personId)
    ? selectedPersonIds.value.filter((selectedId) => selectedId !== personId)
    : [...selectedPersonIds.value, personId]
}

function deleteSelectedPeople() {
  if (selectedPersonIds.value.length === 0) {
    errorMessage.value = '请先选择要删除的人物。'
    return
  }

  const selectedIdSet = new Set(selectedPersonIds.value)

  requestBulkDeleteConfirmation(() => {
    selectedIdSet.forEach((personId) => {
      store.deletePerson(personId)
      delete personEditForms[personId]
    })
    selectedPersonIds.value = []
    isBatchDeleteVisible.value = false
    editingPersonId.value = selectedIdSet.has(editingPersonId.value)
      ? ''
      : editingPersonId.value
    studyingPersonId.value = selectedIdSet.has(studyingPersonId.value)
      ? ''
      : studyingPersonId.value
    errorMessage.value = ''
  })
}

function deletePeopleByStudyResult(result: StudyResult) {
  const peopleToDelete = store.people.filter((person) => {
    const latestResult = personStudyResults.value[person.id]

    return result === 'remembered'
      ? latestResult === 'remembered'
      : latestResult !== 'remembered'
  })

  if (peopleToDelete.length === 0) {
    errorMessage.value =
      result === 'remembered' ? '没有已背过的人物。' : '没有未背过的人物。'
    return
  }

  const deletedIdSet = new Set(peopleToDelete.map((person) => person.id))

  requestBulkDeleteConfirmation(() => {
    deletedIdSet.forEach((personId) => {
      store.deletePerson(personId)
      delete personEditForms[personId]
    })
    selectedPersonIds.value = selectedPersonIds.value.filter(
      (personId) => !deletedIdSet.has(personId),
    )
    isBatchDeleteVisible.value = false
    editingPersonId.value = deletedIdSet.has(editingPersonId.value)
      ? ''
      : editingPersonId.value
    studyingPersonId.value = deletedIdSet.has(studyingPersonId.value)
      ? ''
      : studyingPersonId.value
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

function showPersonEditor(person: IPerson) {
  getPersonEditForm(person)
  editingPersonId.value = person.id
}

function closePersonEditor() {
  editingPersonId.value = ''
}

function toggleStudyMode() {
  isStudyModeEnabled.value = !isStudyModeEnabled.value
  studyingPersonId.value = ''
}

function openPerson(event: MouseEvent, person: IPerson) {
  if (isBatchDeleteVisible.value) {
    event.preventDefault()
    toggleSelectedPerson(person.id)
    return
  }

  if (!isStudyModeEnabled.value) {
    return
  }

  event.preventDefault()
  studyingPersonId.value = person.id
}

function closePersonStudy() {
  studyingPersonId.value = ''
}

function recordPersonStudy(result: StudyResult) {
  if (!studyingPerson.value) {
    return
  }

  store.recordStudy('person', studyingPerson.value.id, result)
  closePersonStudy()
}

function getStudyStatusLabel(result: StudyResult | undefined): string {
  return result === 'remembered' ? '已背过' : '未背过'
}

function resetForm() {
  form.name = ''
  form.lifeTime = ''
  form.summary = ''
  form.biography = ''
  form.achievements = ''
  form.keywordsText = ''
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
      <h1>历史人物</h1>
      <p>整理人物生平、成就和关键词，方便按人物线索背诵。</p>
      <button
        class="primary-button"
        type="button"
        @click="isCreateFormVisible = !isCreateFormVisible"
      >
        {{ isCreateFormVisible ? '收起新建' : '新建人物' }}
      </button>
    </header>

    <div
      v-if="isCreateFormVisible"
      class="study-modal"
      role="dialog"
      aria-modal="true"
      aria-label="新建人物"
      @click.self="isCreateFormVisible = false"
    >
      <section class="study-modal-content">
        <button
          class="close-button"
          type="button"
          @click="isCreateFormVisible = false"
        >
          关闭
        </button>

        <form class="panel person-form" @submit.prevent="createPerson">
          <h2>新建人物</h2>

          <div class="form-grid">
            <label>
              姓名
              <input v-model="form.name" type="text" placeholder="例如：孙中山" />
            </label>

            <label>
              生卒/活动时间
              <input
                v-model="form.lifeTime"
                type="text"
                placeholder="例如：1866-1925"
              />
            </label>
          </div>

          <label>
            摘要
            <textarea
              v-model="form.summary"
              rows="2"
              placeholder="一句话概括人物历史地位"
            />
          </label>

          <label>
            生平
            <textarea
              v-model="form.biography"
              rows="4"
              placeholder="记录需要背诵的生平脉络"
            />
          </label>

          <label>
            主要成就
            <textarea
              v-model="form.achievements"
              rows="4"
              placeholder="记录主要贡献、影响或评价"
            />
          </label>

          <label>
            关键词
            <input
              v-model="form.keywordsText"
              type="text"
              placeholder="用英文逗号分隔，例如：辛亥革命,三民主义"
            />
          </label>

          <p v-if="pageError" class="error-message">{{ pageError }}</p>
          <button type="submit">保存人物</button>
        </form>
      </section>
    </div>

    <section class="person-list" aria-label="全部人物">
      <div class="section-heading">
        <h2>全部人物</h2>
        <button
          class="primary-button study-mode-button"
          :class="{ 'study-mode-button--active': isStudyModeEnabled }"
          data-test="toggle-person-study-mode"
          type="button"
          @click="toggleStudyMode"
        >
          {{ isStudyModeEnabled ? '退出背诵模式' : '进入背诵模式' }}
        </button>
      </div>
      <div v-if="store.people.length" class="batch-actions">
        <span v-if="isBatchDeleteVisible">
          已选择 {{ selectedPersonIds.length }} 个人物
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
          :disabled="selectedPersonIds.length === 0"
          @click="deleteSelectedPeople"
        >
          删除选中
        </button>
        <button
          v-if="isBatchDeleteVisible"
          type="button"
          @click="deletePeopleByStudyResult('remembered')"
        >
          删除已背过
        </button>
        <button
          v-if="isBatchDeleteVisible"
          type="button"
          @click="deletePeopleByStudyResult('forgotten')"
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

      <p v-if="store.people.length === 0" class="empty-message">
        还没有人物，先创建一个吧。
      </p>

      <article
        v-for="person in store.people"
        :key="person.id"
        class="person-card"
      >
        <input
          v-if="isBatchDeleteVisible"
          v-model="selectedPersonIds"
          class="select-person-checkbox"
          type="checkbox"
          :value="person.id"
          aria-label="选择人物"
        />
        <button
          class="icon-button"
          type="button"
          aria-label="编辑人物"
          @click="showPersonEditor(person)"
        >
          ✎
        </button>
        <RouterLink
          class="person-card-link"
          :to="`/people/${person.id}`"
          @click="openPerson($event, person)"
        >
          <EntityCard
            :title="person.name"
            :subtitle="person.lifeTime"
            :summary="person.summary"
          />
          <span
            class="study-status"
            :class="`study-status--${personStudyResults[person.id] ?? 'forgotten'}`"
          >
            {{ getStudyStatusLabel(personStudyResults[person.id]) }}
          </span>
        </RouterLink>
        <span v-if="person.keywords.length" class="tag-list">
          <span v-for="keyword in person.keywords" :key="keyword" class="tag">
            {{ keyword }}
          </span>
        </span>

        <form
          v-if="editingPersonId === person.id"
          class="inline-form"
          @submit.prevent="updatePerson(person)"
        >
          <div class="form-grid">
            <label>
              姓名
              <input v-model="getPersonEditForm(person).name" type="text" />
            </label>

            <label>
              生卒/活动时间
              <input v-model="getPersonEditForm(person).lifeTime" type="text" />
            </label>
          </div>

          <label>
            摘要
            <textarea v-model="getPersonEditForm(person).summary" rows="2" />
          </label>

          <label>
            生平
            <textarea v-model="getPersonEditForm(person).biography" rows="4" />
          </label>

          <label>
            主要成就
            <textarea v-model="getPersonEditForm(person).achievements" rows="4" />
          </label>

          <label>
            关键词
            <input
              v-model="getPersonEditForm(person).keywordsText"
              type="text"
              placeholder="用英文逗号分隔"
            />
          </label>

          <div class="action-row">
            <button type="submit">保存修改</button>
            <button type="button" @click="closePersonEditor">取消</button>
            <button
              class="danger-button"
              type="button"
              @click="deletePerson(person)"
            >
              删除
            </button>
          </div>
        </form>
      </article>
    </section>

    <div
      v-if="studyingPerson"
      class="study-modal"
      role="dialog"
      aria-modal="true"
      aria-label="人物背诵"
      @click.self="closePersonStudy"
    >
      <section class="study-modal-content">
        <button class="close-button" type="button" @click="closePersonStudy">
          关闭
        </button>

        <section class="panel study-section">
          <h2>人物背诵</h2>
          <StudyRevealCard
            :key="studyingPerson.id"
            :prompt="studyingPerson.name"
            :answer="studyingPersonAnswer"
            @mark="recordPersonStudy"
          />
        </section>
      </section>
    </div>

    <ConfirmActionModal
      v-if="isBulkDeleteConfirmVisible"
      :message="BULK_DELETE_CONFIRM_MESSAGE"
      @confirm="confirmBulkDelete"
      @cancel="cancelBulkDelete"
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
.person-list,
.person-form {
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

.study-mode-button {
  background: #9a4b2d;
}

.study-mode-button--active {
  background: #c03535;
}

.panel {
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e6f2;
  border-radius: 18px;
}

.person-card {
  position: relative;
  display: grid;
  gap: 12px;
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e6f2;
  border-radius: 18px;
  box-shadow: 0 8px 24px rgb(35 45 90 / 8%);
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

.person-form label {
  display: grid;
  gap: 8px;
  color: #405173;
  font-weight: 700;
}

.person-form input,
.person-form textarea {
  width: 100%;
  padding: 10px 12px;
  color: #172033;
  border: 1px solid #cfd6e6;
  border-radius: 12px;
}

.person-form button {
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

.person-list {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.person-list h2,
.person-list .section-heading,
.person-list .batch-actions,
.person-list .empty-message {
  grid-column: 1 / -1;
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

.select-person-checkbox {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 1;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.person-card-link {
  display: grid;
  position: relative;
  color: inherit;
  text-decoration: none;
}

.person-card-link :deep(.entity-card) {
  padding-left: 48px;
  padding-right: 52px;
  padding-bottom: 52px;
}

.study-status {
  position: absolute;
  left: 18px;
  bottom: 18px;
  z-index: 1;
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

.study-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  padding: 32px;
  overflow: auto;
  background: rgb(15 23 42 / 60%);
}

.study-modal-content {
  width: min(920px, 100%);
  padding: 24px;
  margin: 24px auto;
  background: #f6f7fb;
  border-radius: 24px;
}

.study-section {
  display: grid;
  gap: 16px;
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
</style>

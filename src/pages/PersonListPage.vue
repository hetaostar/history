<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import EntityCard from '@/components/EntityCard.vue'
import type { IPerson } from '@/domain/historyTypes'
import { useHistoryStore } from '@/stores/historyStore'

const store = useHistoryStore()
const errorMessage = ref('')
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

const pageError = computed(() => errorMessage.value || store.lastError)

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
  errorMessage.value = ''
}

function deletePerson(person: IPerson) {
  const confirmed = window.confirm(`确认删除人物“${person.name}”吗？`)

  if (!confirmed) {
    return
  }

  store.deletePerson(person.id)
  delete personEditForms[person.id]
  errorMessage.value = ''
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
    </header>

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

    <section class="person-list" aria-label="全部人物">
      <h2>全部人物</h2>

      <p v-if="store.people.length === 0" class="empty-message">
        还没有人物，先创建一个吧。
      </p>

      <article
        v-for="person in store.people"
        :key="person.id"
        class="person-card"
      >
        <RouterLink class="person-card-link" :to="`/people/${person.id}`">
        <EntityCard
          :title="person.name"
          :subtitle="person.lifeTime"
          :summary="person.summary"
        />
        </RouterLink>
        <span v-if="person.keywords.length" class="tag-list">
          <span v-for="keyword in person.keywords" :key="keyword" class="tag">
            {{ keyword }}
          </span>
        </span>

        <form class="inline-form" @submit.prevent="updatePerson(person)">
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

.panel {
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e6f2;
  border-radius: 18px;
}

.person-card {
  display: grid;
  gap: 12px;
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e6f2;
  border-radius: 18px;
  box-shadow: 0 8px 24px rgb(35 45 90 / 8%);
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
.person-list .empty-message {
  grid-column: 1 / -1;
}

.person-card-link {
  display: grid;
  color: inherit;
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

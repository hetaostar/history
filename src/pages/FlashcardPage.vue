<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import EntityCard from '@/components/EntityCard.vue'
import StudyRevealCard from '@/components/StudyRevealCard.vue'
import type { IStudyCard, StudyResult } from '@/domain/historyTypes'
import { useHistoryStore } from '@/stores/historyStore'

const store = useHistoryStore()
const selectedCardId = ref('')
const errorMessage = ref('')
const cardEditForms = reactive<Record<string, ICardForm>>({})

interface ICardForm {
  front: string
  back: string
  keywordsText: string
  personIdsText: string
  eventIdsText: string
}

const form = reactive({
  front: '',
  back: '',
  keywordsText: '',
  personIdsText: '',
  eventIdsText: '',
})

const cards = computed(() => store.cards)
const pageError = computed(() => errorMessage.value || store.lastError)

const selectedCard = computed(() => {
  return cards.value.find((card) => card.id === selectedCardId.value) ?? null
})

function createCard() {
  const front = form.front.trim()
  const back = form.back.trim()

  if (!front || !back) {
    errorMessage.value = '请填写卡片正面和背面。'
    return
  }

  const card = store.createCard({
    front,
    back,
    keywords: parseCommaSeparatedText(form.keywordsText),
    personIds: parseCommaSeparatedText(form.personIdsText),
    eventIds: parseCommaSeparatedText(form.eventIdsText),
  })

  selectedCardId.value = card.id
  resetForm()
  errorMessage.value = ''
}

function selectCard(card: IStudyCard) {
  selectedCardId.value = card.id
}

function getCardEditForm(card: IStudyCard): ICardForm {
  cardEditForms[card.id] ??= {
    front: card.front,
    back: card.back,
    keywordsText: card.keywords.join(','),
    personIdsText: card.personIds.join(','),
    eventIdsText: card.eventIds.join(','),
  }

  return cardEditForms[card.id]
}

function updateCard(card: IStudyCard) {
  const editForm = getCardEditForm(card)
  const front = editForm.front.trim()
  const back = editForm.back.trim()

  if (!front || !back) {
    errorMessage.value = '请填写卡片正面和背面。'
    return
  }

  store.updateCard(card.id, {
    front,
    back,
    keywords: parseCommaSeparatedText(editForm.keywordsText),
    personIds: parseCommaSeparatedText(editForm.personIdsText),
    eventIds: parseCommaSeparatedText(editForm.eventIdsText),
  })
  errorMessage.value = ''
}

function deleteCard(card: IStudyCard) {
  const confirmed = window.confirm('确认删除这张背诵卡片吗？')

  if (!confirmed) {
    return
  }

  store.deleteCard(card.id)
  delete cardEditForms[card.id]
  selectedCardId.value = cards.value[0]?.id ?? ''
  errorMessage.value = ''
}

function recordStudy(result: StudyResult) {
  if (!selectedCard.value) {
    return
  }

  store.recordStudy('card', selectedCard.value.id, result)
  selectedCardId.value = ''
}

function resetForm() {
  form.front = ''
  form.back = ''
  form.keywordsText = ''
  form.personIdsText = ''
  form.eventIdsText = ''
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
      <h1>卡片背诵</h1>
      <p>创建独立背诵卡片，也可以选择关联人物或事件。</p>
    </header>

    <form class="panel card-form" @submit.prevent="createCard">
      <h2>新建卡片</h2>

      <label>
        正面
        <textarea
          v-model="form.front"
          rows="3"
          placeholder="例如：商鞅变法的主要内容是什么？"
        />
      </label>

      <label>
        背面
        <textarea
          v-model="form.back"
          rows="5"
          placeholder="填写需要背诵的答案"
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
          关联人物 ID（可选）
          <input
            v-model="form.personIdsText"
            type="text"
            placeholder="可留空，用英文逗号分隔"
          />
        </label>

        <label>
          关联事件 ID（可选）
          <input
            v-model="form.eventIdsText"
            type="text"
            placeholder="可留空，用英文逗号分隔"
          />
        </label>
      </div>

      <p v-if="pageError" class="error-message">{{ pageError }}</p>
      <button type="submit">保存卡片</button>
    </form>

    <section class="panel card-list">
      <h2>全部卡片</h2>
      <p v-if="cards.length === 0" class="empty-message">
        还没有卡片，先新建一张吧。
      </p>

      <button
        v-for="card in cards"
        :key="card.id"
        class="card-preview-button"
        type="button"
        @click="selectCard(card)"
      >
        <EntityCard
          :title="card.front"
          :subtitle="card.keywords.join('，') || '未设置关键词'"
          summary="点击查看详情并开始背诵"
        />
      </button>
    </section>

    <section v-if="selectedCard" class="detail-layout">
      <article class="panel card-detail">
        <h2>卡片详情</h2>

        <section class="detail-block">
          <h3>正面</h3>
          <div class="detail-text">{{ selectedCard.front }}</div>
        </section>

        <div v-if="selectedCard.keywords.length" class="tag-list">
          <span
            v-for="keyword in selectedCard.keywords"
            :key="keyword"
            class="tag"
          >
            {{ keyword }}
          </span>
        </div>

        <p v-if="selectedCard.personIds.length" class="relation-ids">
          关联人物 ID：{{ selectedCard.personIds.join('，') }}
        </p>
        <p v-if="selectedCard.eventIds.length" class="relation-ids">
          关联事件 ID：{{ selectedCard.eventIds.join('，') }}
        </p>

        <form class="card-form" @submit.prevent="updateCard(selectedCard)">
          <h3>编辑卡片</h3>

          <label>
            正面
            <textarea v-model="getCardEditForm(selectedCard).front" rows="3" />
          </label>

          <label>
            背面
            <textarea v-model="getCardEditForm(selectedCard).back" rows="5" />
          </label>

          <div class="form-grid">
            <label>
              关键词
              <input
                v-model="getCardEditForm(selectedCard).keywordsText"
                type="text"
                placeholder="用英文逗号分隔"
              />
            </label>

            <label>
              关联人物 ID
              <input
                v-model="getCardEditForm(selectedCard).personIdsText"
                type="text"
                placeholder="用英文逗号分隔"
              />
            </label>

            <label>
              关联事件 ID
              <input
                v-model="getCardEditForm(selectedCard).eventIdsText"
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
              @click="deleteCard(selectedCard)"
            >
              删除卡片
            </button>
          </div>
        </form>
      </article>

      <section class="study-section">
        <h2>背诵练习</h2>
        <StudyRevealCard
          :key="selectedCard.id"
          :prompt="selectedCard.front"
          :answer="selectedCard.back"
          @mark="recordStudy"
        />
      </section>
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
.card-form,
.card-detail,
.study-section,
.detail-block {
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

.card-form label {
  display: grid;
  gap: 8px;
  color: #405173;
  font-weight: 700;
}

.card-form input,
.card-form textarea {
  width: 100%;
  padding: 10px 12px;
  color: #172033;
  border: 1px solid #cfd6e6;
  border-radius: 12px;
}

.card-form button {
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

.card-list {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.card-list h2,
.card-list .empty-message {
  grid-column: 1 / -1;
}

.card-preview-button {
  padding: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.card-preview-button:focus-visible {
  outline: 3px solid #9aa8ff;
  outline-offset: 3px;
  border-radius: 18px;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
  gap: 24px;
}

.card-detail {
  align-content: start;
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

.relation-ids {
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

@media (max-width: 860px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import ConfirmActionModal from '@/components/ConfirmActionModal.vue'
import { useConfirmModal } from '@/composables/useConfirmModal'
import { useModalBehavior } from '@/composables/useModalBehavior'
import EntityCard from '@/components/EntityCard.vue'
import StudyRevealCard from '@/components/StudyRevealCard.vue'
import type { IStudyCard, StudyResult } from '@/domain/historyTypes'
import { useHistoryStore } from '@/stores/historyStore'

type DrawRange = 'all' | 'remembered' | 'forgotten' | 'custom'
type CustomRangeDirection = 'person' | 'event' | 'keyword'

const DRAW_RANGE_LABELS: Record<DrawRange, string> = {
  all: '全部',
  remembered: '已背过',
  forgotten: '未背过',
  custom: '自定义',
}

const CUSTOM_DIRECTION_LABELS: Record<CustomRangeDirection, string> = {
  person: '关联人物',
  event: '关联事件',
  keyword: '关键词',
}

const SINGLE_DELETE_CONFIRM_MESSAGE = '是否执行该操作？该操作执行后无法恢复。'

const store = useHistoryStore()
const selectedCardId = ref('')
const editingCardId = ref('')
const studyingCardId = ref('')
const errorMessage = ref('')
const isCreateFormVisible = ref(false)
const isDrawFormVisible = ref(false)
const isBatchDeleteVisible = ref(false)
const isStudyModeEnabled = ref(false)
const drawCount = ref(1)
const drawnCardIds = ref<string[]>([])
const selectedCardIds = ref<string[]>([])
const cardEditForms = reactive<Record<string, ICardForm>>({})
const drawRange = ref<DrawRange>('all')
const isDrawRangeOpen = ref(false)
const customRangeDirection = ref<CustomRangeDirection | ''>('')
const isCustomDirectionOpen = ref(false)
const customRangeInput = ref('')
const confirmedCustomRange = reactive<{
  direction: CustomRangeDirection | ''
  value: string
}>({
  direction: '',
  value: '',
})

const modal = useConfirmModal()

interface ICardForm {
  front: string
  back: string
  hint: string
  keywordsText: string
  personIdsText: string
  eventIdsText: string
}

const form = reactive({
  front: '',
  back: '',
  hint: '',
  keywordsText: '',
  personIdsText: '',
  eventIdsText: '',
})

const cards = computed(() => store.cards)
const pageError = computed(() => errorMessage.value || store.lastError)

const selectedCard = computed(() => {
  return cards.value.find((card) => card.id === selectedCardId.value) ?? null
})

const editingCard = computed(() => {
  return cards.value.find((card) => card.id === editingCardId.value) ?? null
})

const studyingCard = computed(() => {
  return cards.value.find((card) => card.id === studyingCardId.value) ?? null
})

const { containerRef: createModalRef } = useModalBehavior(
  isCreateFormVisible,
  () => {
    isCreateFormVisible.value = false
  },
)

const { containerRef: drawModalRef } = useModalBehavior(
  isDrawFormVisible,
  () => {
    isDrawFormVisible.value = false
  },
)

const isCardDetailVisible = computed(() => selectedCard.value !== null)
const { containerRef: cardDetailModalRef } = useModalBehavior(
  isCardDetailVisible,
  () => {
    selectedCardId.value = ''
  },
)

const isCardStudyVisible = computed(() => studyingCard.value !== null)
const { containerRef: cardStudyModalRef } = useModalBehavior(
  isCardStudyVisible,
  () => {
    studyingCardId.value = ''
  },
)

const isCardEditorVisible = computed(() => editingCard.value !== null)
const { containerRef: cardEditorModalRef } = useModalBehavior(
  isCardEditorVisible,
  () => {
    if (editingCardId.value) {
      delete cardEditForms[editingCardId.value]
    }
    editingCardId.value = ''
  },
)

const studyingCardRelatedPeople = computed(() => {
  if (!studyingCard.value) {
    return []
  }

  return studyingCard.value.personIds.map((personId) => {
    return (
      store.people.find((person) => person.id === personId)?.name ?? personId
    )
  })
})

const studyingCardRelatedEvents = computed(() => {
  if (!studyingCard.value) {
    return []
  }

  return studyingCard.value.eventIds.map((eventId) => {
    return store.events.find((event) => event.id === eventId)?.title ?? eventId
  })
})

const latestResultByTarget = computed(() => {
  const map = new Map<string, StudyResult>()
  const sorted = [...store.studyRecords].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )
  for (const record of sorted) {
    if (record.targetType === 'card') {
      map.set(record.targetId, record.result)
    }
  }
  return map
})

const drawnCards = computed(() => {
  const cardMap = new Map(cards.value.map((card) => [card.id, card]))

  return drawnCardIds.value
    .map((cardId) => cardMap.get(cardId))
    .filter((card): card is IStudyCard => Boolean(card))
})

const drawCandidateCards = computed(() => getDrawCandidateCards())

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
    hint: form.hint.trim(),
    keywords: parseCommaSeparatedText(form.keywordsText),
    personIds: parseCommaSeparatedText(form.personIdsText),
    eventIds: parseCommaSeparatedText(form.eventIdsText),
  })

  selectedCardId.value = card.id
  resetForm()
  isCreateFormVisible.value = false
  errorMessage.value = ''
}

function openCard(card: IStudyCard) {
  if (isBatchDeleteVisible.value) {
    toggleSelectedCard(card.id)
    return
  }

  if (isStudyModeEnabled.value) {
    studyingCardId.value = card.id
    selectedCardId.value = ''
    return
  }

  selectedCardId.value = card.id
}

function toggleStudyMode() {
  closeBatchDelete()
  isStudyModeEnabled.value = !isStudyModeEnabled.value
  selectedCardId.value = ''
  studyingCardId.value = ''
}

function closeCardDetail() {
  selectedCardId.value = ''
}

function closeCardStudy() {
  studyingCardId.value = ''
}

function showCardEditor(card: IStudyCard) {
  closeBatchDelete()
  cardEditForms[card.id] = createCardEditForm(card)
  editingCardId.value = card.id
}

function closeCardEditor() {
  if (editingCardId.value) {
    delete cardEditForms[editingCardId.value]
  }

  editingCardId.value = ''
}

function showBatchDelete() {
  isBatchDeleteVisible.value = true
  selectedCardIds.value = []
  errorMessage.value = ''
}

function closeBatchDelete() {
  isBatchDeleteVisible.value = false
  selectedCardIds.value = []
  errorMessage.value = ''
}

function toggleCreateForm() {
  closeBatchDelete()
  isCreateFormVisible.value = !isCreateFormVisible.value
}

function toggleDrawForm() {
  closeBatchDelete()
  isDrawFormVisible.value = !isDrawFormVisible.value
}

function toggleSelectedCard(cardId: string) {
  selectedCardIds.value = selectedCardIds.value.includes(cardId)
    ? selectedCardIds.value.filter((selectedId) => selectedId !== cardId)
    : [...selectedCardIds.value, cardId]
}

function drawCards() {
  const normalizedCount = Math.floor(Number(drawCount.value))

  if (cards.value.length === 0) {
    errorMessage.value = '还没有可抽取的卡片。'
    return
  }

  if (!Number.isFinite(normalizedCount) || normalizedCount < 1) {
    errorMessage.value = '抽取数量至少为 1。'
    return
  }

  const candidateCards = drawCandidateCards.value

  if (candidateCards.length === 0) {
    errorMessage.value = '当前范围内没有可抽取的卡片，请调整抽卡范围。'
    return
  }

  if (normalizedCount > candidateCards.length) {
    errorMessage.value = `当前范围内只有 ${candidateCards.length} 张卡片，请减少抽取数量。`
    return
  }

  drawnCardIds.value = shuffleCards(candidateCards)
    .slice(0, normalizedCount)
    .map((card) => card.id)
  errorMessage.value = ''
}

function selectDrawRange(nextRange: DrawRange) {
  drawRange.value = nextRange
  isDrawRangeOpen.value = false
  errorMessage.value = ''

  if (nextRange !== 'custom') {
    isCustomDirectionOpen.value = false
  }
}

function selectCustomDirection(nextDirection: CustomRangeDirection) {
  customRangeDirection.value = nextDirection
  isCustomDirectionOpen.value = false
  errorMessage.value = ''
}

function confirmCustomRange() {
  if (!customRangeDirection.value || !customRangeInput.value.trim()) {
    errorMessage.value = '请先选择自定义方向并填写筛选内容。'
    return
  }

  confirmedCustomRange.direction = customRangeDirection.value
  confirmedCustomRange.value = customRangeInput.value.trim()
  errorMessage.value = ''
}

function getCardEditForm(card: IStudyCard): ICardForm {
  cardEditForms[card.id] ??= createCardEditForm(card)

  return cardEditForms[card.id]
}

function createCardEditForm(card: IStudyCard): ICardForm {
  return {
    front: card.front,
    back: card.back,
    hint: card.hint,
    keywordsText: card.keywords.join(','),
    personIdsText: card.personIds.join(','),
    eventIdsText: card.eventIds.join(','),
  }
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
    hint: editForm.hint.trim(),
    keywords: parseCommaSeparatedText(editForm.keywordsText),
    personIds: parseCommaSeparatedText(editForm.personIdsText),
    eventIds: parseCommaSeparatedText(editForm.eventIdsText),
  })
  delete cardEditForms[card.id]
  editingCardId.value = ''
  errorMessage.value = ''
}

function deleteCard(card: IStudyCard) {
  modal.request('确认删除这张背诵卡片吗？', () => {
    store.deleteCard(card.id)
    delete cardEditForms[card.id]
    selectedCardId.value = ''
    editingCardId.value = ''
    studyingCardId.value = ''
    selectedCardIds.value = selectedCardIds.value.filter(
      (cardId) => cardId !== card.id,
    )
    drawnCardIds.value = drawnCardIds.value.filter(
      (cardId) => cardId !== card.id,
    )
    errorMessage.value = ''
  })
}

function recordStudy(result: StudyResult) {
  if (!studyingCard.value) {
    return
  }

  store.recordStudy('card', studyingCard.value.id, result)
  closeCardStudy()
}

function deleteSelectedCards() {
  if (selectedCardIds.value.length === 0) {
    errorMessage.value = '请先选择要删除的卡片。'
    return
  }

  const selectedIdSet = new Set(selectedCardIds.value)

  modal.request(SINGLE_DELETE_CONFIRM_MESSAGE, () => {
    selectedIdSet.forEach((cardId) => {
      store.deleteCard(cardId)
      delete cardEditForms[cardId]
    })
    selectedCardIds.value = []
    isBatchDeleteVisible.value = false
    drawnCardIds.value = drawnCardIds.value.filter(
      (cardId) => !selectedIdSet.has(cardId),
    )
    selectedCardId.value = selectedIdSet.has(selectedCardId.value)
      ? ''
      : selectedCardId.value
    editingCardId.value = selectedIdSet.has(editingCardId.value)
      ? ''
      : editingCardId.value
    studyingCardId.value = selectedIdSet.has(studyingCardId.value)
      ? ''
      : studyingCardId.value
    errorMessage.value = ''
  })
}

function deleteCardsByStudyResult(result: StudyResult) {
  const cardsToDelete = cards.value.filter((card) => {
    const latestResult = latestResultByTarget.value.get(card.id)

    return result === 'remembered'
      ? latestResult === 'remembered'
      : latestResult !== 'remembered'
  })

  if (cardsToDelete.length === 0) {
    errorMessage.value =
      result === 'remembered' ? '没有已背过的卡片。' : '没有未背过的卡片。'
    return
  }

  const deletedIdSet = new Set(cardsToDelete.map((card) => card.id))

  modal.request(SINGLE_DELETE_CONFIRM_MESSAGE, () => {
    deletedIdSet.forEach((cardId) => {
      store.deleteCard(cardId)
      delete cardEditForms[cardId]
    })
    selectedCardIds.value = selectedCardIds.value.filter(
      (cardId) => !deletedIdSet.has(cardId),
    )
    isBatchDeleteVisible.value = false
    drawnCardIds.value = drawnCardIds.value.filter(
      (cardId) => !deletedIdSet.has(cardId),
    )
    selectedCardId.value = deletedIdSet.has(selectedCardId.value)
      ? ''
      : selectedCardId.value
    editingCardId.value = deletedIdSet.has(editingCardId.value)
      ? ''
      : editingCardId.value
    studyingCardId.value = deletedIdSet.has(studyingCardId.value)
      ? ''
      : studyingCardId.value
    errorMessage.value = ''
  })
}

function getStudyStatusLabel(result: StudyResult | undefined): string {
  return result === 'remembered' ? '已背过' : '未背过'
}

function getDrawRangeLabel(range: DrawRange): string {
  return DRAW_RANGE_LABELS[range]
}

function getCustomDirectionLabel(direction: CustomRangeDirection | ''): string {
  return direction ? CUSTOM_DIRECTION_LABELS[direction] : '选择自定义方向'
}

function getDrawCandidateCards(): IStudyCard[] {
  if (drawRange.value === 'remembered') {
    return cards.value.filter(
      (card) => latestResultByTarget.value.get(card.id) === 'remembered',
    )
  }

  if (drawRange.value === 'forgotten') {
    return cards.value.filter(
      (card) => latestResultByTarget.value.get(card.id) !== 'remembered',
    )
  }

  if (drawRange.value === 'custom') {
    return getCustomRangeCandidateCards()
  }

  return cards.value
}

function getCustomRangeCandidateCards(): IStudyCard[] {
  const direction = confirmedCustomRange.direction
  const value = confirmedCustomRange.value.trim().toLowerCase()

  if (!direction || !value) {
    return []
  }

  if (direction === 'person') {
    return cards.value.filter((card) =>
      card.personIds.some((personId) => personId.toLowerCase() === value),
    )
  }

  if (direction === 'event') {
    return cards.value.filter((card) =>
      card.eventIds.some((eventId) => eventId.toLowerCase() === value),
    )
  }

  return cards.value.filter((card) =>
    card.keywords.some((keyword) => keyword.toLowerCase().includes(value)),
  )
}

function resetForm() {
  form.front = ''
  form.back = ''
  form.hint = ''
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

function shuffleCards(sourceCards: IStudyCard[]): IStudyCard[] {
  const shuffledCards = [...sourceCards]

  for (let index = shuffledCards.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffledCards[index], shuffledCards[randomIndex]] = [
      shuffledCards[randomIndex],
      shuffledCards[index],
    ]
  }

  return shuffledCards
}
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>卡片背诵</h1>
      <p>创建独立背诵卡片，也可以选择关联人物或事件。</p>
      <button class="primary-button" type="button" @click="toggleCreateForm">
        {{ isCreateFormVisible ? '收起新建' : '新建卡片' }}
      </button>
      <button
        class="primary-button secondary-button"
        data-test="toggle-draw-form"
        type="button"
        @click="toggleDrawForm"
      >
        {{ isDrawFormVisible ? '收起抽卡' : '抽卡' }}
      </button>
    </header>

    <div
      v-if="isCreateFormVisible"
      ref="createModalRef"
      class="card-modal"
      role="dialog"
      aria-modal="true"
      aria-label="新建卡片"
      @click.self="isCreateFormVisible = false"
    >
      <section class="card-modal-content">
        <button
          class="close-button"
          type="button"
          @click="isCreateFormVisible = false"
        >
          关闭
        </button>

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

          <label>
            提示
            <input
              v-model="form.hint"
              type="text"
              placeholder="用于背诵时提示自己"
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
      </section>
    </div>

    <div
      v-if="isDrawFormVisible"
      ref="drawModalRef"
      class="card-modal"
      role="dialog"
      aria-modal="true"
      aria-label="随机抽卡"
      @click.self="isDrawFormVisible = false"
    >
      <section class="card-modal-content">
        <button
          class="close-button"
          type="button"
          @click="isDrawFormVisible = false"
        >
          关闭
        </button>

        <form
          class="panel draw-form"
          data-test="draw-form"
          @submit.prevent="drawCards"
        >
          <h2>随机抽卡</h2>
          <p class="helper-text">
            从全部 {{ cards.length }} 张卡片中随机抽取指定数量。
          </p>

          <label>
            抽取数量
            <input
              v-model.number="drawCount"
              type="number"
              min="1"
              :max="Math.max(cards.length, 1)"
              placeholder="例如：5"
            />
          </label>

          <div class="range-field">
            <span>抽卡范围</span>
            <button
              class="select-trigger"
              data-test="draw-range-toggle"
              type="button"
              @click="isDrawRangeOpen = !isDrawRangeOpen"
            >
              <span>{{ getDrawRangeLabel(drawRange) }}</span>
              <span aria-hidden="true">⌄</span>
            </button>
            <div v-if="isDrawRangeOpen" class="select-options">
              <button
                type="button"
                data-test="draw-range-all"
                @click="selectDrawRange('all')"
              >
                全部
              </button>
              <button
                type="button"
                data-test="draw-range-remembered"
                @click="selectDrawRange('remembered')"
              >
                已背过
              </button>
              <button
                type="button"
                data-test="draw-range-forgotten"
                @click="selectDrawRange('forgotten')"
              >
                未背过
              </button>
              <button
                type="button"
                data-test="draw-range-custom"
                @click="selectDrawRange('custom')"
              >
                自定义
              </button>
            </div>
          </div>

          <div v-if="drawRange === 'custom'" class="custom-range-panel">
            <div class="range-field">
              <span>自定义方向</span>
              <button
                class="select-trigger"
                data-test="custom-direction-toggle"
                type="button"
                @click="isCustomDirectionOpen = !isCustomDirectionOpen"
              >
                <span>{{ getCustomDirectionLabel(customRangeDirection) }}</span>
                <span aria-hidden="true">⌄</span>
              </button>
              <div v-if="isCustomDirectionOpen" class="select-options">
                <button
                  type="button"
                  data-test="custom-direction-person"
                  @click="selectCustomDirection('person')"
                >
                  关联人物
                </button>
                <button
                  type="button"
                  data-test="custom-direction-event"
                  @click="selectCustomDirection('event')"
                >
                  关联事件
                </button>
                <button
                  type="button"
                  data-test="custom-direction-keyword"
                  @click="selectCustomDirection('keyword')"
                >
                  关键词
                </button>
              </div>
            </div>

            <label>
              筛选内容
              <input
                v-model="customRangeInput"
                data-test="custom-range-input"
                type="text"
                placeholder="输入关联 ID 或关键词"
              />
            </label>

            <button
              class="secondary-action"
              data-test="confirm-custom-range"
              type="button"
              @click="confirmCustomRange"
            >
              确认自定义范围
            </button>
          </div>

          <p v-if="pageError" class="error-message">{{ pageError }}</p>
          <button data-test="draw-cards-submit" type="submit">开始抽卡</button>
        </form>

        <section
          v-if="drawnCards.length"
          class="panel card-list draw-result-list"
          data-test="drawn-card-list"
        >
          <h2>抽卡结果</h2>
          <p class="helper-text">
            本次抽到 {{ drawnCards.length }} 张卡片，点击会{{
              isStudyModeEnabled ? '直接开始背诵' : '查看详情'
            }}。
          </p>

          <article
            v-for="card in drawnCards"
            :key="card.id"
            class="card-preview-button"
            role="button"
            tabindex="0"
            @click="openCard(card)"
            @keydown.enter.prevent="openCard(card)"
            @keydown.space.prevent="openCard(card)"
          >
            <input
              v-if="isBatchDeleteVisible"
              v-model="selectedCardIds"
              class="select-card-checkbox"
              type="checkbox"
              :value="card.id"
              aria-label="选择卡片"
              @click.stop
              @keydown.stop
            />
            <button
              class="edit-card-button"
              type="button"
              aria-label="编辑卡片"
              @click.stop="showCardEditor(card)"
            >
              ✎
            </button>
            <EntityCard
              :title="card.front"
              :subtitle="card.keywords.join('，') || '未设置关键词'"
              :summary="isStudyModeEnabled ? '点击开始背诵' : '点击查看详情'"
            />
            <span
              class="study-status"
              :class="`study-status--${latestResultByTarget.get(card.id) ?? 'forgotten'}`"
            >
              {{ getStudyStatusLabel(latestResultByTarget.get(card.id)) }}
            </span>
          </article>
        </section>
      </section>
    </div>

    <section class="panel card-list">
      <div class="section-heading">
        <h2>全部卡片</h2>
        <button
          class="primary-button study-mode-button"
          :class="{ 'study-mode-button--active': isStudyModeEnabled }"
          data-test="toggle-study-mode"
          type="button"
          @click="toggleStudyMode"
        >
          {{ isStudyModeEnabled ? '退出背诵模式' : '进入背诵模式' }}
        </button>
      </div>
      <p class="mode-helper" data-test="study-mode-helper">
        {{
          isStudyModeEnabled
            ? '背诵模式已开启：点击任意卡片会直接开始背诵。'
            : '当前为详情模式：点击卡片会先查看详情。'
        }}
      </p>
      <div v-if="cards.length" class="batch-actions">
        <span v-if="isBatchDeleteVisible">
          已选择 {{ selectedCardIds.length }} 张卡片
        </span>
        <button
          v-if="!isBatchDeleteVisible"
          class="danger-button"
          type="button"
          @click="showBatchDelete"
        >
          批量删除
        </button>
        <button
          v-else
          class="danger-button"
          type="button"
          :disabled="selectedCardIds.length === 0"
          @click="deleteSelectedCards"
        >
          删除选中
        </button>
        <button
          v-if="isBatchDeleteVisible"
          class="danger-button"
          type="button"
          @click="deleteCardsByStudyResult('remembered')"
        >
          删除已背过
        </button>
        <button
          v-if="isBatchDeleteVisible"
          class="danger-button"
          type="button"
          @click="deleteCardsByStudyResult('forgotten')"
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
      <p v-if="cards.length === 0" class="empty-message">
        还没有卡片，先新建一张吧。
      </p>

      <article
        v-for="card in cards"
        :key="card.id"
        class="card-preview-button"
        role="button"
        tabindex="0"
        @click="openCard(card)"
        @keydown.enter.prevent="openCard(card)"
        @keydown.space.prevent="openCard(card)"
      >
        <input
          v-if="isBatchDeleteVisible"
          v-model="selectedCardIds"
          class="select-card-checkbox"
          type="checkbox"
          :value="card.id"
          aria-label="选择卡片"
          @click.stop
          @keydown.stop
        />
        <button
          class="edit-card-button"
          type="button"
          aria-label="编辑卡片"
          @click.stop="showCardEditor(card)"
        >
          ✎
        </button>
        <EntityCard
          :title="card.front"
          :subtitle="card.keywords.join('，') || '未设置关键词'"
          :summary="isStudyModeEnabled ? '点击开始背诵' : '点击查看详情'"
        />
        <span
          class="study-status"
          :class="`study-status--${latestResultByTarget.get(card.id) ?? 'forgotten'}`"
        >
          {{ getStudyStatusLabel(latestResultByTarget.get(card.id)) }}
        </span>
      </article>
    </section>

    <div
      v-if="selectedCard"
      ref="cardDetailModalRef"
      class="card-modal"
      role="dialog"
      aria-modal="true"
      aria-label="卡片详情"
      @click.self="closeCardDetail"
    >
      <section class="card-modal-content">
        <button class="close-button" type="button" @click="closeCardDetail">
          关闭
        </button>

        <section class="card-detail-layout">
          <article class="panel card-detail">
            <h2>卡片详情</h2>

            <section class="detail-block">
              <h3>正面</h3>
              <div class="detail-text">{{ selectedCard.front }}</div>
            </section>

            <section class="detail-block">
              <h3>背面</h3>
              <div class="detail-text">{{ selectedCard.back }}</div>
            </section>

            <p v-if="selectedCard.hint" class="hint">
              背诵提示：{{ selectedCard.hint }}
            </p>

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
          </article>
        </section>
      </section>
    </div>

    <div
      v-if="studyingCard"
      ref="cardStudyModalRef"
      class="card-modal"
      role="dialog"
      aria-modal="true"
      aria-label="背诵练习"
      @click.self="closeCardStudy"
    >
      <section class="card-modal-content">
        <button class="close-button" type="button" @click="closeCardStudy">
          关闭
        </button>

        <section class="panel study-section">
          <h2>背诵练习</h2>
          <StudyRevealCard
            :key="studyingCard.id"
            :prompt="studyingCard.front"
            :answer="studyingCard.back"
            :hint="studyingCard.hint"
            :related-people="studyingCardRelatedPeople"
            :related-events="studyingCardRelatedEvents"
            @mark="recordStudy"
          />
        </section>
      </section>
    </div>

    <div
      v-if="editingCard"
      ref="cardEditorModalRef"
      class="card-modal"
      role="dialog"
      aria-modal="true"
      aria-label="编辑卡片"
      @click.self="closeCardEditor"
    >
      <section class="card-modal-content">
        <form class="panel card-form" @submit.prevent="updateCard(editingCard)">
          <h2>编辑卡片</h2>

          <label>
            正面
            <textarea v-model="getCardEditForm(editingCard).front" rows="3" />
          </label>

          <label>
            背面
            <textarea v-model="getCardEditForm(editingCard).back" rows="5" />
          </label>

          <label>
            提示
            <input
              v-model="getCardEditForm(editingCard).hint"
              type="text"
              placeholder="用于背诵时提示自己"
            />
          </label>

          <div class="form-grid">
            <label>
              关键词
              <input
                v-model="getCardEditForm(editingCard).keywordsText"
                type="text"
                placeholder="用英文逗号分隔"
              />
            </label>

            <label>
              关联人物 ID
              <input
                v-model="getCardEditForm(editingCard).personIdsText"
                type="text"
                placeholder="用英文逗号分隔"
              />
            </label>

            <label>
              关联事件 ID
              <input
                v-model="getCardEditForm(editingCard).eventIdsText"
                type="text"
                placeholder="用英文逗号分隔"
              />
            </label>
          </div>

          <p v-if="pageError" class="error-message">{{ pageError }}</p>
          <div class="action-row">
            <button type="submit">保存修改</button>
            <button
              class="danger-button"
              type="button"
              @click="deleteCard(editingCard)"
            >
              删除卡片
            </button>
            <button type="button" @click="closeCardEditor">取消</button>
          </div>
        </form>
      </section>
    </div>

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

.primary-button {
  width: fit-content;
  padding: 10px 16px;
  color: #fff;
  cursor: pointer;
  background: #445ce3;
  border: 0;
  border-radius: 999px;
}

.secondary-button {
  background: #365b4c;
}

.study-mode-button {
  background: #9a4b2d;
}

.study-mode-button--active {
  background: #c03535;
}

.mode-helper {
  margin: 0;
  color: #405173;
  font-weight: 700;
}

.panel {
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e6f2;
  border-radius: 18px;
}

.card-form label,
.draw-form label {
  display: grid;
  gap: 8px;
  color: #405173;
  font-weight: 700;
}

.card-form input,
.card-form textarea,
.draw-form input {
  width: 100%;
  padding: 10px 12px;
  color: #172033;
  border: 1px solid #cfd6e6;
  border-radius: 12px;
}

.card-form button,
.draw-form button {
  width: fit-content;
  padding: 10px 16px;
  color: #fff;
  cursor: pointer;
  background: #445ce3;
  border: 0;
  border-radius: 999px;
}

.range-field {
  position: relative;
  display: grid;
  gap: 8px;
  color: #405173;
  font-weight: 700;
}

.draw-form .select-trigger {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  color: #172033;
  background: #fff;
  border: 1px solid #cfd6e6;
  border-radius: 12px;
}

.select-options {
  display: grid;
  overflow: hidden;
  background: #fff;
  border: 1px solid #cfd6e6;
  border-radius: 12px;
}

.draw-form .select-options button {
  width: 100%;
  padding: 12px;
  color: #172033;
  text-align: left;
  background: #fff;
  border: 0;
  border-bottom: 1px solid #eef1f6;
  border-radius: 0;
}

.draw-form .select-options button:last-child {
  border-bottom: 0;
}

.custom-range-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  background: #f8f9fd;
  border: 1px dashed #aeb8cf;
  border-radius: 16px;
}

.draw-form .secondary-action {
  background: #365b4c;
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

.helper-text {
  margin: 0;
  color: #64708a;
}

.card-list {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.draw-result-list {
  margin-top: 16px;
}

.card-list h2,
.card-list .section-heading,
.card-list .mode-helper,
.card-list .batch-actions,
.card-list .empty-message {
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

.card-preview-button {
  position: relative;
  padding: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
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

.select-card-checkbox {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 1;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.edit-card-button {
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

.card-preview-button:hover {
  transform: translateY(-2px);
}

.card-preview-button:focus-visible {
  outline: 3px solid #9aa8ff;
  outline-offset: 3px;
  border-radius: 18px;
}

.card-preview-button :deep(.entity-card) {
  padding-left: 48px;
  padding-right: 52px;
  padding-bottom: 52px;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
  gap: 24px;
}

.card-detail-layout {
  display: grid;
  max-width: 760px;
  margin: 0 auto;
}

.card-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  padding: 32px;
  overflow: auto;
  background: rgb(15 23 42 / 60%);
}

.card-modal-content {
  width: min(920px, 100%);
  min-height: auto;
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

.card-detail {
  align-content: start;
  gap: 18px;
  padding: 28px;
}

.card-detail h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 34px;
}

.detail-block {
  padding: 16px;
  background: #fffaf0;
  border: 1px solid rgb(74 50 35 / 10%);
  border-radius: 16px;
}

.detail-block h3 {
  margin: 0;
  color: #445ce3;
  font-size: 16px;
}

.detail-text {
  white-space: pre-wrap;
  line-height: 1.8;
}

.hint {
  padding: 12px;
  margin: 0;
  color: #405173;
  background: #eef1ff;
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

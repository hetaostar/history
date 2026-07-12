import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistoryStore } from '@/stores/historyStore'
import FlashcardPage from './FlashcardPage.vue'

describe('FlashcardPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('draws only forgotten cards when range is forgotten', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const rememberedCard = store.createCard({
      front: '法国大革命爆发于哪一年？',
      back: '1789年',
      hint: '',
      keywords: ['法国'],
      personIds: [],
      eventIds: [],
    })
    const forgottenCard = store.createCard({
      front: '商鞅变法的主要内容是什么？',
      back: '废井田、重农抑商、奖励军功。',
      hint: '',
      keywords: ['商鞅'],
      personIds: [],
      eventIds: [],
    })
    store.recordStudy('card', rememberedCard.id, 'remembered')

    const wrapper = mount(FlashcardPage, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.get('[data-test="toggle-draw-form"]').trigger('click')
    await wrapper.get('[data-test="draw-range-toggle"]').trigger('click')
    await wrapper.get('[data-test="draw-range-forgotten"]').trigger('click')
    await wrapper.get('[data-test="draw-form"]').trigger('submit')

    const drawnCardList = wrapper.get('[data-test="drawn-card-list"]')

    expect(drawnCardList.text()).toContain(forgottenCard.front)
    expect(drawnCardList.text()).not.toContain(rememberedCard.front)
  })

  it('draws only cards matching a custom keyword range', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const matchingCard = store.createCard({
      front: '洋务运动的口号是什么？',
      back: '自强、求富。',
      hint: '',
      keywords: ['近代史'],
      personIds: [],
      eventIds: [],
    })
    const otherCard = store.createCard({
      front: '秦统一六国是哪一年？',
      back: '前221年。',
      hint: '',
      keywords: ['古代史'],
      personIds: [],
      eventIds: [],
    })

    const wrapper = mount(FlashcardPage, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.get('[data-test="toggle-draw-form"]').trigger('click')
    await wrapper.get('[data-test="draw-range-toggle"]').trigger('click')
    await wrapper.get('[data-test="draw-range-custom"]').trigger('click')
    await wrapper.get('[data-test="custom-direction-toggle"]').trigger('click')
    await wrapper.get('[data-test="custom-direction-keyword"]').trigger('click')
    await wrapper.get('[data-test="custom-range-input"]').setValue('近代史')
    await wrapper.get('[data-test="confirm-custom-range"]').trigger('click')
    await wrapper.get('[data-test="draw-form"]').trigger('submit')

    const drawnCardList = wrapper.get('[data-test="drawn-card-list"]')

    expect(drawnCardList.text()).toContain(matchingCard.front)
    expect(drawnCardList.text()).not.toContain(otherCard.front)
  })

  it('opens card details by default and study practice in study mode', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    store.createCard({
      front: '王安石变法开始于哪一年？',
      back: '1069年。',
      hint: '北宋神宗时期',
      keywords: ['宋代'],
      personIds: [],
      eventIds: [],
    })

    const wrapper = mount(FlashcardPage, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.get('.card-preview-button').trigger('click')

    expect(wrapper.find('[aria-label="卡片详情"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="背诵练习"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="卡片详情"]').text()).not.toContain(
      '开始背诵',
    )

    await wrapper.get('[data-test="toggle-study-mode"]').trigger('click')
    await wrapper.get('.card-preview-button').trigger('click')

    expect(wrapper.find('[aria-label="卡片详情"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="背诵练习"]').exists()).toBe(true)
  })

  it('selects cards instead of opening details in batch delete mode', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    store.createCard({
      front: '戊戌变法发生在哪一年？',
      back: '1898年。',
      hint: '',
      keywords: ['近代史'],
      personIds: [],
      eventIds: [],
    })

    const wrapper = mount(FlashcardPage, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.get('.batch-actions button').trigger('click')
    await wrapper.get('.card-preview-button').trigger('click')

    expect(wrapper.find('[aria-label="卡片详情"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="背诵练习"]').exists()).toBe(false)
    expect(wrapper.get('.batch-actions').text()).toContain('已选择 1 张卡片')
  })

  it('shows related people and events during card study', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const person = store.createPerson({
      name: '康有为',
      lifeTime: '',
      summary: '',
      biography: '',
      achievements: '',
      keywords: [],
    })
    const event = store.createEvent({
      timeLabel: '1898年',
      title: '戊戌变法',
      hint: '',
      summary: '',
      detail: '',
      keywords: [],
      personIds: [person.id],
    })
    store.createCard({
      front: '戊戌变法的主要内容是什么？',
      back: '维新变法。',
      hint: '',
      keywords: [],
      personIds: [person.id],
      eventIds: [event.id],
    })

    const wrapper = mount(FlashcardPage, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.get('[data-test="toggle-study-mode"]').trigger('click')
    await wrapper.get('.card-preview-button').trigger('click')

    const studyDialog = wrapper.get('[aria-label="背诵练习"]')

    expect(studyDialog.text()).toContain('关联人物：康有为')
    expect(studyDialog.text()).toContain('关联事件：戊戌变法')
  })

  it('discards unsaved card edit changes when closing the editor', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const card = store.createCard({
      front: '辛亥革命爆发于哪一年？',
      back: '1911年。',
      hint: '',
      keywords: [],
      personIds: [],
      eventIds: ['event-1911'],
    })

    const wrapper = mount(FlashcardPage, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.get('.edit-card-button').trigger('click')
    await wrapper
      .findAll(
        '[role="dialog"][aria-label="编辑卡片"] input[placeholder="用英文逗号分隔"]',
      )[2]
      .setValue('')
    await wrapper
      .findAll('[role="dialog"][aria-label="编辑卡片"] .action-row button')[2]
      .trigger('click')
    await wrapper.get('.edit-card-button').trigger('click')

    expect(store.cards.find((item) => item.id === card.id)?.eventIds).toEqual([
      'event-1911',
    ])
    expect(
      wrapper.get('[role="dialog"][aria-label="编辑卡片"]').text(),
    ).toContain('编辑卡片')
    expect(
      wrapper.findAll(
        '[role="dialog"][aria-label="编辑卡片"] input[placeholder="用英文逗号分隔"]',
      )[2].element,
    ).toHaveProperty('value', 'event-1911')
  })

  it('uses the latest study result when a card is marked multiple times', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const card = store.createCard({
      front: '贞观之治是哪位皇帝？',
      back: '唐太宗李世民。',
      hint: '',
      keywords: ['唐代'],
      personIds: [],
      eventIds: [],
    })
    store.recordStudy('card', card.id, 'forgotten')
    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'))
    store.recordStudy('card', card.id, 'remembered')

    const wrapper = mount(FlashcardPage, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.get('[data-test="toggle-draw-form"]').trigger('click')
    await wrapper.get('[data-test="draw-range-toggle"]').trigger('click')
    await wrapper.get('[data-test="draw-range-remembered"]').trigger('click')
    await wrapper.get('[data-test="draw-form"]').trigger('submit')

    const drawnCardList = wrapper.get('[data-test="drawn-card-list"]')

    expect(drawnCardList.text()).toContain(card.front)

    vi.useRealTimers()
  })
})

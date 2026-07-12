import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  getAllTextbookPeople,
  getTextbookEventById,
  getTextbookPersonById,
} from '@/domain/textbookSelectors'
import { useHistoryStore } from '@/stores/historyStore'
import SearchPage from './SearchPage.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/people', component: { template: '<div />' } },
      { path: '/events', component: { template: '<div />' } },
    ],
  })
}

describe('SearchPage', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the empty hint before any query is entered', () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const wrapper = mount(SearchPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    expect(wrapper.text()).toContain('请输入关键词开始搜索')
    expect(wrapper.find('[aria-label="搜索结果"]').exists()).toBe(false)
  })

  it('首次输入时显示 pending 并隐藏结果与无结果空态', async () => {
    vi.useFakeTimers()
    const pinia = createPinia()
    setActivePinia(pinia)
    const person = getTextbookPersonById('g7u-confucius')
    expect(person).toBeDefined()

    const wrapper = mount(SearchPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    await wrapper.get('.search-panel input').setValue(person!.name)

    const pending = wrapper.get('.empty-message')
    expect(pending.text()).toContain('正在搜索…')
    expect(pending.attributes('role')).toBe('status')
    expect(pending.attributes('aria-live')).toBe('polite')
    expect(wrapper.find('[aria-label="搜索结果"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('没有找到匹配结果')
  })

  it('已有结果后换词会立即隐藏旧结果，防抖后显示新结果', async () => {
    vi.useFakeTimers()
    const pinia = createPinia()
    setActivePinia(pinia)
    const firstPerson = getTextbookPersonById('g7u-confucius')
    const nextPerson = getTextbookPersonById('g7u-laozi')
    expect(firstPerson).toBeDefined()
    expect(nextPerson).toBeDefined()

    const wrapper = mount(SearchPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    const input = wrapper.get('.search-panel input')
    await input.setValue(firstPerson!.name)
    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()

    const firstResults = wrapper.get('[aria-label="搜索结果"]')
    expect(firstResults.text()).toContain(firstPerson!.name)
    expect(
      firstResults
        .get(`a[href="/people?person=${firstPerson!.id}"]`)
        .attributes('href'),
    ).toBe(`/people?person=${firstPerson!.id}`)

    await input.setValue(nextPerson!.name)

    expect(wrapper.text()).toContain('正在搜索…')
    expect(wrapper.find('[aria-label="搜索结果"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain(firstPerson!.name)

    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()

    const nextResults = wrapper.get('[aria-label="搜索结果"]')
    expect(nextResults.text()).toContain(nextPerson!.name)
    expect(nextResults.text()).not.toContain(firstPerson!.name)
  })

  it('防抖后无结果时显示无结果空态', async () => {
    vi.useFakeTimers()
    const pinia = createPinia()
    setActivePinia(pinia)
    const missingQuery = '不存在于教材中的人物'
    expect(
      getAllTextbookPeople().some((person) =>
        person.name.includes(missingQuery),
      ),
    ).toBe(false)

    const wrapper = mount(SearchPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    await wrapper.get('.search-panel input').setValue(missingQuery)
    expect(wrapper.text()).toContain('正在搜索…')

    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).not.toContain('正在搜索…')
    expect(wrapper.text()).toContain('没有找到匹配结果')
    expect(wrapper.find('[aria-label="搜索结果"]').exists()).toBe(false)
  })

  it('shows matched events and cards without a timeline group', async () => {
    vi.useFakeTimers()
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const event = getTextbookEventById('china-event-0029')
    if (!event) {
      throw new Error('缺少测试所需的教材事件')
    }
    store.createCard({
      front: '秦始皇统一六国是哪一年？',
      back: '前221年。',
      hint: '',
      keywords: ['秦朝'],
      personIds: [],
      eventIds: [],
    })

    const wrapper = mount(SearchPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    await wrapper.get('.search-panel input').setValue('秦始皇')
    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()

    const results = wrapper.get('[aria-label="搜索结果"]')

    expect(results.text()).toContain(event.title)
    expect(results.text()).toContain('秦始皇统一六国是哪一年')
    expect(results.text()).not.toContain('时间线')
    expect(
      results
        .get(`a[href="/events?event=${event.id}"]`)
        .attributes('href'),
    ).toBe(`/events?event=${event.id}`)
  })
})

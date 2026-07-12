import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useHistoryStore } from '@/stores/historyStore'
import SearchPage from './SearchPage.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/people/:id', component: { template: '<div />' } },
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

  it('does not update results immediately after input due to debounce', async () => {
    vi.useFakeTimers()
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    store.createPerson({
      name: '孙中山',
      lifeTime: '1866-1925',
      summary: '革命先行者',
      biography: '',
      achievements: '',
      keywords: [],
    })

    const wrapper = mount(SearchPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    await wrapper.get('.search-panel input').setValue('孙中山')

    expect(wrapper.find('[aria-label="搜索结果"]').exists()).toBe(false)
  })

  it('updates results after the debounce delay elapses', async () => {
    vi.useFakeTimers()
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    store.createPerson({
      name: '孙中山',
      lifeTime: '1866-1925',
      summary: '革命先行者',
      biography: '',
      achievements: '',
      keywords: [],
    })

    const wrapper = mount(SearchPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    await wrapper.get('.search-panel input').setValue('孙中山')
    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()

    const results = wrapper.get('[aria-label="搜索结果"]')

    expect(results.text()).toContain('孙中山')
  })

  it('shows matched events and cards without a timeline group', async () => {
    vi.useFakeTimers()
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const event = store.createEvent({
      timeLabel: '前221年',
      title: '秦统一六国',
      hint: '',
      summary: '秦始皇建立秦朝',
      detail: '',
      keywords: ['统一'],
      personIds: [],
    })
    store.createCard({
      front: '秦朝建立于哪一年？',
      back: '前221年。',
      hint: '',
      keywords: ['秦朝'],
      personIds: [],
      eventIds: [],
    })

    const wrapper = mount(SearchPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    await wrapper.get('.search-panel input').setValue('秦')
    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()

    const results = wrapper.get('[aria-label="搜索结果"]')

    expect(results.text()).toContain('秦统一六国')
    expect(results.text()).toContain('秦朝建立于哪一年')
    expect(results.text()).not.toContain('时间线')
    expect(
      results
        .get(`a[href="/events?event=${event.id}"]`)
        .attributes('href'),
    ).toBe(`/events?event=${event.id}`)
  })
})

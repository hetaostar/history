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

  it('首次输入后的防抖期间隐藏结果和错误空态', async () => {
    vi.useFakeTimers()
    const pinia = createPinia()
    setActivePinia(pinia)

    const wrapper = mount(SearchPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    await wrapper.get('.search-panel input').setValue('孔子')

    expect(wrapper.find('[aria-label="搜索结果"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('没有找到匹配结果')
    expect(wrapper.text()).toContain('正在搜索')
  })

  it('新关键词防抖期间立即隐藏旧结果，完成后显示新结果或无结果', async () => {
    vi.useFakeTimers()
    const pinia = createPinia()
    setActivePinia(pinia)

    const wrapper = mount(SearchPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    await wrapper.get('.search-panel input').setValue('孔子')
    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[aria-label="搜索结果"]').text()).toContain('孔子')

    await wrapper.get('.search-panel input').setValue('孟子')
    expect(wrapper.find('[aria-label="搜索结果"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('孔子')
    expect(wrapper.text()).not.toContain('没有找到匹配结果')

    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[aria-label="搜索结果"]').text()).toContain('孟子')
    expect(wrapper.text()).not.toContain('孔子')

    await wrapper.get('.search-panel input').setValue('不存在的人物')
    expect(wrapper.find('[aria-label="搜索结果"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('孟子')
    expect(wrapper.text()).not.toContain('没有找到匹配结果')

    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[aria-label="搜索结果"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('没有找到匹配结果')
  })

  it('按教材人物姓名搜索并在防抖后链接到人物抽屉 query', async () => {
    vi.useFakeTimers()
    const pinia = createPinia()
    setActivePinia(pinia)

    const wrapper = mount(SearchPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    await wrapper.get('.search-panel input').setValue('孔子')
    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()

    const results = wrapper.get('[aria-label="搜索结果"]')

    expect(results.text()).toContain('孔子')
    expect(
      results.get('a[href="/people?person=g7u-confucius"]').attributes('href'),
    ).toBe('/people?person=g7u-confucius')
  })

  it('可以通过教材人物摘要搜索人物', async () => {
    vi.useFakeTimers()
    const pinia = createPinia()
    setActivePinia(pinia)

    const wrapper = mount(SearchPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    await wrapper.get('.search-panel input').setValue('重视教育')
    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[aria-label="搜索结果"]').text()).toContain('孔子')
  })

  it('搜索教材事件和本地卡片并链接到事件详情', async () => {
    vi.useFakeTimers()
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
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

    expect(results.text()).toContain('秦始皇统一六国')
    expect(results.text()).toContain('秦朝建立于哪一年')
    expect(results.text()).not.toContain('时间线')
    expect(
      results
        .get('a[href="/events?event=china-event-0029"]')
        .attributes('href'),
    ).toBe('/events?event=china-event-0029')
  })
})

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { KEY_EVENTS } from '@/data/chinaHistoryRiver'
import { formatHistoricalYear } from '@/domain/chinaRiverLayout'
import { useHistoryStore } from '@/stores/historyStore'
import EventListPage from './EventListPage.vue'

async function mountPage(path = '/events') {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/events', component: EventListPage }],
  })
  await router.push(path)
  await router.isReady()

  return {
    store: useHistoryStore(),
    router,
    wrapper: mount(EventListPage, {
      attachTo: document.body,
      global: { plugins: [pinia, router] },
    }),
  }
}

const sortedEvents = [...KEY_EVENTS].sort((a, b) => a.year - b.year)

enableAutoUnmount(afterEach)

describe('EventListPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('按年份展示中华历史长河的全部事件卡片', async () => {
    const { wrapper } = await mountPage()
    const cards = wrapper.findAll('[data-test^="event-card-"]')

    expect(cards).toHaveLength(KEY_EVENTS.length)
    expect(
      cards.map((card) => card.attributes('data-test')),
    ).toEqual(sortedEvents.map((event) => `event-card-${event.id}`))
    expect(cards[0].element.tagName).toBe('A')
    expect(cards[0].text()).toContain(sortedEvents[0].title)
    expect(cards[0].text()).toContain(formatHistoricalYear(sortedEvents[0].year))
    expect(cards[cards.length - 1].text()).toContain(
      sortedEvents[sortedEvents.length - 1].title,
    )
    expect(wrapper.text()).toContain(`内置 · 只读 · ${KEY_EVENTS.length} 个事件`)
  })

  it('仅提供只读卡片，不显示脉络和增删改入口', async () => {
    const { wrapper } = await mountPage()

    expect(wrapper.text()).not.toContain('事件脉络')
    expect(wrapper.text()).not.toContain('添加历史事件')
    expect(wrapper.text()).not.toContain('批量删除')
    expect(wrapper.find('[data-test="edit-event"]').exists()).toBe(false)
  })

  it('通过 event query 自动打开内置事件详情', async () => {
    const event = sortedEvents[0]
    const { wrapper } = await mountPage(`/events?event=${event.id}`)

    expect(wrapper.get('[data-test="event-detail-overlay"]').text()).toContain(
      event.title,
    )
  })

  it('无效 event query 安全回落到卡片列表', async () => {
    const { wrapper } = await mountPage('/events?event=missing')

    expect(wrapper.find('[data-test="event-detail-overlay"]').exists()).toBe(
      false,
    )
    expect(wrapper.get('h1').text()).toBe('事件')
  })

  it('卡片点击、路由变化和关闭详情保持同步', async () => {
    const first = sortedEvents[0]
    const second = sortedEvents[1]
    const { router, wrapper } = await mountPage()

    await wrapper.get(`[data-test="event-card-${first.id}"]`).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.event).toBe(first.id)
    expect(wrapper.get('[data-test="event-detail-overlay"]').text()).toContain(
      first.title,
    )

    await router.push(`/events?event=${second.id}`)
    await flushPromises()
    expect(wrapper.get('[data-test="event-detail-overlay"]').text()).toContain(
      second.title,
    )

    await wrapper.get('[data-test="close"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).not.toHaveProperty('event')
    expect(wrapper.find('[data-test="event-detail-overlay"]').exists()).toBe(
      false,
    )
  })

  it('在详情中背诵事件并写入共享学习记录', async () => {
    const event = sortedEvents[0]
    const { store, wrapper } = await mountPage()

    await wrapper.get(`[data-test="event-card-${event.id}"]`).trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="remembered"]').trigger('click')

    expect(store.studyRecords).toEqual([
      expect.objectContaining({
        targetType: 'event',
        targetId: event.id,
        result: 'remembered',
      }),
    ])
    expect(wrapper.get('[data-test="study-status"]').text()).toContain('记住了')
  })
})

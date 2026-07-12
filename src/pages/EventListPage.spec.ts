import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { KEY_EVENTS } from '@/data/chinaHistoryRiver'
import { formatHistoricalYear } from '@/domain/chinaRiverLayout'
import { HISTORY_PERIODS } from '@/domain/historyPeriods'
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
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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

  it('按主要历史时期展示分界线和事件卡片', async () => {
    const { wrapper } = await mountPage()
    const sections = wrapper.findAll('[data-test^="period-section-"]')

    expect(sections).toHaveLength(HISTORY_PERIODS.length)
    expect(sections.map((section) => section.get('h3').text())).toEqual(
      HISTORY_PERIODS.map((period) => period.name),
    )
    expect(wrapper.get('[data-test="period-section-tang"]').text()).toContain(
      '唐',
    )
    expect(wrapper.find('[data-test="period-navigation"]').exists()).toBe(true)
  })

  it('点击朝代导航后更新 hash 并滚动到对应分界线', async () => {
    const { router, wrapper } = await mountPage()
    const tangSection = wrapper.get('[data-test="period-section-tang"]')

    await wrapper.get('[data-test="period-navigation-tang"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.hash).toBe('#period-tang')
    expect(tangSection.element.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
  })

  it('首次进入带时期 hash 的地址时定位对应分界线', async () => {
    const { wrapper } = await mountPage('/events#period-ming')
    await flushPromises()

    expect(
      wrapper.get('[data-test="period-section-ming"]').element.scrollIntoView,
    ).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    })
  })

  it('读取全局页头高度为窄屏双 sticky 布局预留空间', async () => {
    const appHeader = document.createElement('header')
    appHeader.className = 'app-header'
    appHeader.getBoundingClientRect = () =>
      ({ height: 132 }) as DOMRect
    document.body.appendChild(appHeader)

    const { wrapper } = await mountPage()
    await flushPromises()

    expect(wrapper.get('.event-page').attributes('style')).toContain(
      '--app-header-height: 132px',
    )
  })

  it('阅读到新时期时同步高亮朝代导航', async () => {
    const { wrapper } = await mountPage()
    await flushPromises()
    const tangIndex = HISTORY_PERIODS.findIndex(({ id }) => id === 'tang')
    wrapper
      .findAll<HTMLElement>('[data-test^="period-section-"]')
      .forEach((section, index) => {
        section.element.getBoundingClientRect = () =>
          ({
            top: index < tangIndex ? -320 : index === tangIndex ? 80 : 720,
          }) as DOMRect
      })

    window.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()

    expect(
      wrapper
        .get('[data-test="period-navigation-tang"]')
        .attributes('aria-current'),
    ).toBe('location')
  })

  it('按越过阅读线的最后一个时期稳定高亮较长朝代', async () => {
    const { wrapper } = await mountPage()
    await flushPromises()
    const jinIndex = HISTORY_PERIODS.findIndex(
      ({ id }) => id === 'jin-northern-southern',
    )
    const sectionTops = new Map<string, number>(
      HISTORY_PERIODS.map(({ id }, index) => [
        id,
        index < jinIndex ? -420 : index === jinIndex ? 80 : 680,
      ]),
    )

    wrapper
      .findAll<HTMLElement>('[data-test^="period-section-"]')
      .forEach((section) => {
        const periodId = section.attributes('data-period-id') ?? ''
        section.element.getBoundingClientRect = () =>
          ({
            top: sectionTops.get(periodId) ?? 900,
          }) as DOMRect
      })

    window.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()

    expect(
      wrapper
        .get('[data-test="period-navigation-jin-northern-southern"]')
        .attributes('aria-current'),
    ).toBe('location')

    sectionTops.set('jin-northern-southern', -180)
    sectionTops.set('sui', 520)
    window.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()

    expect(
      wrapper
        .get('[data-test="period-navigation-jin-northern-southern"]')
        .attributes('aria-current'),
    ).toBe('location')
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
    const { router, wrapper } = await mountPage('/events#period-xia')

    await wrapper.get(`[data-test="event-card-${first.id}"]`).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.event).toBe(first.id)
    expect(router.currentRoute.value.hash).toBe('#period-xia')
    expect(wrapper.get('[data-test="event-detail-overlay"]').text()).toContain(
      first.title,
    )

    await router.push({
      path: '/events',
      query: { event: second.id },
      hash: '#period-xia',
    })
    await flushPromises()
    expect(wrapper.get('[data-test="event-detail-overlay"]').text()).toContain(
      second.title,
    )

    await wrapper.get('[data-test="close"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).not.toHaveProperty('event')
    expect(router.currentRoute.value.hash).toBe('#period-xia')
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

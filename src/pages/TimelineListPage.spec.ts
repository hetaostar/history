import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useHistoryStore } from '@/stores/historyStore'
import TimelineListPage from './TimelineListPage.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/timelines/:id', component: { template: '<div />' } },
    ],
  })
}

describe('TimelineListPage', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('shows empty hint when there are no timelines', () => {
    const wrapper = mount(TimelineListPage, {
      global: { plugins: [createPinia(), createTestRouter()] },
    })

    expect(wrapper.text()).toContain('还没有时间线')
  })

  it('renders a created timeline in the list', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    store.createTimeline({
      name: '中国近代史',
      description: '近代事件',
      tags: ['高考'],
    })

    const wrapper = mount(TimelineListPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    expect(wrapper.text()).toContain('中国近代史')
    expect(wrapper.text()).toContain('近代事件')
  })

  it('marks a timeline without events as "未开始"', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    store.createTimeline({
      name: '空时间线',
      description: '',
      tags: [],
    })

    const wrapper = mount(TimelineListPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    const statuses = wrapper.findAll('.study-status')
    expect(statuses).toHaveLength(1)
    expect(statuses[0].text()).toBe('未开始')
    expect(statuses[0].classes()).toContain('study-status--empty')
  })

  it('marks a timeline with all events remembered as "已背过"', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '已背过时间线',
      description: '',
      tags: [],
    })
    const event = store.createEvent({
      timelineId: timeline.id,
      timeLabel: '1840年',
      title: '鸦片战争',
      hint: '',
      summary: '',
      detail: '',
      keywords: [],
      personIds: [],
    })
    store.recordStudy('event', event.id, 'remembered')

    const wrapper = mount(TimelineListPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    const status = wrapper.find('.study-status')
    expect(status.text()).toBe('已背过')
    expect(status.classes()).toContain('study-status--remembered')
  })

  it('marks a timeline with at least one forgotten event as "未背过"', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '部分背过时间线',
      description: '',
      tags: [],
    })
    const rememberedEvent = store.createEvent({
      timelineId: timeline.id,
      timeLabel: '1840年',
      title: '鸦片战争',
      hint: '',
      summary: '',
      detail: '',
      keywords: [],
      personIds: [],
    })
    store.createEvent({
      timelineId: timeline.id,
      timeLabel: '1911年',
      title: '辛亥革命',
      hint: '',
      summary: '',
      detail: '',
      keywords: [],
      personIds: [],
    })
    store.recordStudy('event', rememberedEvent.id, 'remembered')

    const wrapper = mount(TimelineListPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    const status = wrapper.find('.study-status')
    expect(status.text()).toBe('未背过')
    expect(status.classes()).toContain('study-status--forgotten')
  })

  it('"删除未背过" does not delete empty timelines', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const emptyTimeline = store.createTimeline({
      name: '空时间线',
      description: '',
      tags: [],
    })
    const timelineWithForgottenEvent = store.createTimeline({
      name: '未背过时间线',
      description: '',
      tags: [],
    })
    store.createEvent({
      timelineId: timelineWithForgottenEvent.id,
      timeLabel: '1840年',
      title: '鸦片战争',
      hint: '',
      summary: '',
      detail: '',
      keywords: [],
      personIds: [],
    })

    const wrapper = mount(TimelineListPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    // 进入批量删除模式
    const batchButton = wrapper
      .findAll('.batch-actions button')
      .find((btn) => btn.text().includes('批量删除'))
    await batchButton!.trigger('click')

    const forgottenButton = wrapper
      .findAll('.batch-actions button')
      .find((btn) => btn.text().includes('删除未背过'))
    await forgottenButton!.trigger('click')

    const confirmButton = wrapper
      .findAll('[role="dialog"] button')
      .find((btn) => btn.text().includes('确认'))
    await confirmButton!.trigger('click')

    expect(store.timelines.find((t) => t.id === emptyTimeline.id)).toBeDefined()
    expect(
      store.timelines.find((t) => t.id === timelineWithForgottenEvent.id),
    ).toBeUndefined()
  })

  it('"删除已背过" only deletes timelines where all events are remembered', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const rememberedTimeline = store.createTimeline({
      name: '已背过时间线',
      description: '',
      tags: [],
    })
    const rememberedEvent = store.createEvent({
      timelineId: rememberedTimeline.id,
      timeLabel: '1840年',
      title: '鸦片战争',
      hint: '',
      summary: '',
      detail: '',
      keywords: [],
      personIds: [],
    })
    store.recordStudy('event', rememberedEvent.id, 'remembered')

    const forgottenTimeline = store.createTimeline({
      name: '未背过时间线',
      description: '',
      tags: [],
    })
    store.createEvent({
      timelineId: forgottenTimeline.id,
      timeLabel: '1911年',
      title: '辛亥革命',
      hint: '',
      summary: '',
      detail: '',
      keywords: [],
      personIds: [],
    })

    const wrapper = mount(TimelineListPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    const batchButton = wrapper
      .findAll('.batch-actions button')
      .find((btn) => btn.text().includes('批量删除'))
    await batchButton!.trigger('click')

    const rememberedButton = wrapper
      .findAll('.batch-actions button')
      .find((btn) => btn.text().includes('删除已背过'))
    await rememberedButton!.trigger('click')

    const confirmButton = wrapper
      .findAll('[role="dialog"] button')
      .find((btn) => btn.text().includes('确认'))
    await confirmButton!.trigger('click')

    expect(
      store.timelines.find((t) => t.id === rememberedTimeline.id),
    ).toBeUndefined()
    expect(
      store.timelines.find((t) => t.id === forgottenTimeline.id),
    ).toBeDefined()
  })
})

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import TimelineDetailPage from './TimelineDetailPage.vue'
import { useHistoryStore } from '@/stores/historyStore'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/timelines/:timelineId', component: TimelineDetailPage },
      { path: '/people/:personId', component: { template: '<div />' } },
    ],
  })
}

describe('TimelineDetailPage', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('加载不存在的时间线显示"没有找到这条时间线"', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/timelines/not-exist')
    await router.isReady()

    const wrapper = mount(TimelineDetailPage, {
      global: { plugins: [pinia, router] },
    })

    expect(wrapper.text()).toContain('没有找到这条时间线')
  })

  it('事件列表按 timeLabel 排序展示', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '近代史',
      description: '',
      tags: [],
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
    store.createEvent({
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
      timeLabel: '前221年',
      title: '秦统一六国',
      hint: '',
      summary: '',
      detail: '',
      keywords: [],
      personIds: [],
    })

    const router = createTestRouter()
    await router.push(`/timelines/${timeline.id}`)
    await router.isReady()

    const wrapper = mount(TimelineDetailPage, {
      global: { plugins: [pinia, router] },
    })

    const times = wrapper.findAll('.event-time').map((el) => el.text())
    expect(times).toEqual(['前221年', '1840年', '1911年'])
  })

  it('创建事件：必填 timeLabel 和 title', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '近代史',
      description: '',
      tags: [],
    })

    const router = createTestRouter()
    await router.push(`/timelines/${timeline.id}`)
    await router.isReady()

    const wrapper = mount(TimelineDetailPage, {
      global: { plugins: [pinia, router] },
    })

    // 打开创建表单
    const addButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('添加历史事件'))
    await addButton!.trigger('click')

    // 空提交应报错
    const form = wrapper.get('.event-form')
    await form.trigger('submit')

    expect(wrapper.text()).toContain('请填写时间和事件标题。')
    expect(store.events).toHaveLength(0)

    // 填写后提交
    await wrapper.get('input[placeholder="例如：1840年"]').setValue('1840年')
    await wrapper
      .get('input[placeholder="例如：鸦片战争"]')
      .setValue('鸦片战争')
    await form.trigger('submit')

    expect(store.events).toHaveLength(1)
    expect(store.events[0].title).toBe('鸦片战争')
    expect(store.events[0].timeLabel).toBe('1840年')
  })

  it('编辑事件：保存后 store.events 更新', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '近代史',
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

    const router = createTestRouter()
    await router.push(`/timelines/${timeline.id}`)
    await router.isReady()

    const wrapper = mount(TimelineDetailPage, {
      global: { plugins: [pinia, router] },
    })

    // 点击编辑按钮
    await wrapper.get('[data-test="edit-event"]').trigger('click')

    // 修改标题
    const editDialog = wrapper.get('[role="dialog"][aria-label^="编辑"]')
    const titleInput = editDialog.findAll('input[type="text"]')[1]
    await titleInput.setValue('第一次鸦片战争')

    // 保存
    await editDialog.get('form').trigger('submit')

    expect(store.events.find((e) => e.id === event.id)?.title).toBe(
      '第一次鸦片战争',
    )
  })

  it('删除事件：弹出 ConfirmActionModal，确认后删除', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '近代史',
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

    const router = createTestRouter()
    await router.push(`/timelines/${timeline.id}`)
    await router.isReady()

    const wrapper = mount(TimelineDetailPage, {
      global: { plugins: [pinia, router] },
    })

    // 点击编辑按钮
    await wrapper.get('[data-test="edit-event"]').trigger('click')

    // 点击"删除事件"
    const editDialog = wrapper.get('[role="dialog"][aria-label^="编辑"]')
    const deleteButton = editDialog
      .findAll('button')
      .find((btn) => btn.text().includes('删除事件'))
    await deleteButton!.trigger('click')

    // 确认弹窗
    expect(
      wrapper.find('[role="dialog"][aria-label="确认操作"]').exists(),
    ).toBe(true)

    const confirmButton = wrapper
      .findAll('[role="dialog"][aria-label="确认操作"] button')
      .find((btn) => btn.text().includes('确认'))
    await confirmButton!.trigger('click')

    expect(store.events.find((e) => e.id === event.id)).toBeUndefined()
  })

  it('背诵模式：点击事件打开 StudyRevealCard，标记后写入 studyRecords', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '近代史',
      description: '',
      tags: [],
    })
    const event = store.createEvent({
      timelineId: timeline.id,
      timeLabel: '1840年',
      title: '鸦片战争',
      hint: '',
      summary: '',
      detail: '战争详情',
      keywords: [],
      personIds: [],
    })

    const router = createTestRouter()
    await router.push(`/timelines/${timeline.id}`)
    await router.isReady()

    const wrapper = mount(TimelineDetailPage, {
      global: { plugins: [pinia, router] },
    })

    // 进入背诵模式
    await wrapper.get('[data-test="toggle-event-study-mode"]').trigger('click')

    // 点击事件节点
    await wrapper.get(`[data-test="event-node-${event.id}"]`).trigger('click')

    // 背诵弹窗出现
    const studyDialog = wrapper.get('[role="dialog"][aria-label="背诵练习"]')

    // 查看反面
    await studyDialog.get('[data-test="reveal"]').trigger('click')

    // 标记为已背过
    await studyDialog.get('[data-test="remembered"]').trigger('click')

    const record = store.studyRecords.find(
      (r) => r.targetType === 'event' && r.targetId === event.id,
    )
    expect(record).toBeDefined()
    expect(record!.result).toBe('remembered')
  })

  it('批量删除已背过：只删已背过的事件', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '近代史',
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
    const forgottenEvent = store.createEvent({
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

    const router = createTestRouter()
    await router.push(`/timelines/${timeline.id}`)
    await router.isReady()

    const wrapper = mount(TimelineDetailPage, {
      global: { plugins: [pinia, router] },
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
      .findAll('[role="dialog"][aria-label="确认操作"] button')
      .find((btn) => btn.text().includes('确认'))
    await confirmButton!.trigger('click')

    expect(
      store.events.find((e) => e.id === rememberedEvent.id),
    ).toBeUndefined()
    expect(store.events.find((e) => e.id === forgottenEvent.id)).toBeDefined()
  })

  it('批量删除未背过：只删未背过的事件', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '近代史',
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
    const forgottenEvent = store.createEvent({
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

    const router = createTestRouter()
    await router.push(`/timelines/${timeline.id}`)
    await router.isReady()

    const wrapper = mount(TimelineDetailPage, {
      global: { plugins: [pinia, router] },
    })

    const batchButton = wrapper
      .findAll('.batch-actions button')
      .find((btn) => btn.text().includes('批量删除'))
    await batchButton!.trigger('click')

    const forgottenButton = wrapper
      .findAll('.batch-actions button')
      .find((btn) => btn.text().includes('删除未背过'))
    await forgottenButton!.trigger('click')

    const confirmButton = wrapper
      .findAll('[role="dialog"][aria-label="确认操作"] button')
      .find((btn) => btn.text().includes('确认'))
    await confirmButton!.trigger('click')

    expect(store.events.find((e) => e.id === rememberedEvent.id)).toBeDefined()
    expect(store.events.find((e) => e.id === forgottenEvent.id)).toBeUndefined()
  })
})

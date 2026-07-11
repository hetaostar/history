import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RiverEventDetail from './RiverEventDetail.vue'
import riverEventDetailSource from './RiverEventDetail.vue?raw'
import { safeLocalStorage } from '@/domain/safeLocalStorage'
import { useHistoryStore } from '@/stores/historyStore'
import type { IHistoricalEvent } from '@/domain/chinaRiverTypes'

const completeEvent: IHistoricalEvent = {
  id: 'china-event-0029',
  year: -221,
  title: '秦始皇统一六国',
  type: 'politics',
  description: '秦结束战国割据，建立统一的中央集权国家。',
  importance: 1,
}

function mountDetail(event: IHistoricalEvent = completeEvent) {
  return mount(RiverEventDetail, {
    attachTo: document.body,
    props: { event },
  })
}

describe('RiverEventDetail', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    document.body.style.overflow = ''
    setActivePinia(createPinia())
  })

  afterEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
    vi.restoreAllMocks()
  })

  it('显示完整事件字段、格式化年份和中文类型标签', () => {
    const wrapper = mountDetail()

    expect(wrapper.get('[data-test="event-year"]').text()).toBe('公元前221年')
    expect(wrapper.get('h2').text()).toBe('秦始皇统一六国')
    expect(wrapper.get('[data-test="event-type"]').text()).toBe('政治')
    expect(wrapper.get('[data-test="event-description"]').text()).toBe(
      completeEvent.description,
    )

    wrapper.unmount()
  })

  it.each([
    ['war', '战争'],
    ['culture', '文化'],
    ['politics', '政治'],
    ['science', '科技'],
  ] as const)('将 %s 类型显示为%s', (type, expectedLabel) => {
    const wrapper = mountDetail({ ...completeEvent, type })

    expect(wrapper.get('[data-test="event-type"]').text()).toBe(expectedLabel)

    wrapper.unmount()
  })

  it('显示公元年份并为缺少或空白的描述提供本地兜底文案', async () => {
    const wrapper = mountDetail({
      ...completeEvent,
      year: 1949,
      description: undefined,
    })

    expect(wrapper.get('[data-test="event-year"]').text()).toBe('公元1949年')
    expect(wrapper.get('[data-test="event-description"]').text()).toBe(
      '暂无更多本地资料',
    )

    await wrapper.setProps({
      event: { ...completeEvent, description: '   ' },
    })
    expect(wrapper.get('[data-test="event-description"]').text()).toBe(
      '暂无更多本地资料',
    )

    wrapper.unmount()
  })

  it('提供可访问模态语义并通过关闭按钮和遮罩 emit close', async () => {
    const wrapper = mountDetail()
    const dialog = wrapper.get('[role="dialog"]')
    const title = wrapper.get('h2')
    const closeButton = wrapper.get('[data-test="close"]')

    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.attributes('aria-labelledby')).toBe(title.attributes('id'))
    expect(
      document.querySelectorAll(`[id="${title.attributes('id')}"]`),
    ).toHaveLength(1)
    expect(closeButton.attributes('aria-label')).toBe('关闭事件详情')

    await closeButton.trigger('click')
    await wrapper.get('[data-test="event-detail-overlay"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(2)
    wrapper.unmount()
  })

  it('多个独立挂载的详情弹窗仍使用唯一标题 ID 并保持准确关联', () => {
    const firstWrapper = mountDetail()
    const secondWrapper = mountDetail({
      ...completeEvent,
      id: 'china-event-0030',
      title: '修筑灵渠',
    })
    const wrappers = [firstWrapper, secondWrapper]
    const titleIds = wrappers.map((wrapper) =>
      wrapper.get('h2').attributes('id'),
    )

    wrappers.forEach((wrapper, index) => {
      expect(wrapper.get('[role="dialog"]').attributes('aria-labelledby')).toBe(
        titleIds[index],
      )
      expect(
        document.querySelectorAll(`[id="${titleIds[index]}"]`),
      ).toHaveLength(1)
    })
    expect(new Set(titleIds).size).toBe(titleIds.length)

    wrappers.forEach((wrapper) => wrapper.unmount())
  })

  it('样式颜色仅由 base.css token 和 color-mix 派生', () => {
    const style =
      riverEventDetailSource.match(/<style scoped>([\s\S]*?)<\/style>/)?.[1] ??
      ''

    expect(style).toContain('color-mix(in srgb')
    expect(style).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(/i)
  })

  it('挂载后锁定滚动并聚焦首个按钮，ESC 关闭，卸载后恢复焦点', async () => {
    const trigger = document.createElement('button')
    trigger.textContent = '打开事件'
    document.body.appendChild(trigger)
    trigger.focus()

    const isOpen = ref(true)
    const Host = defineComponent({
      components: { RiverEventDetail },
      setup: () => ({ completeEvent, isOpen }),
      template: `
        <RiverEventDetail
          v-if="isOpen"
          :event="completeEvent"
          @close="isOpen = false"
        />
      `,
    })
    const wrapper = mount(Host, { attachTo: document.body })

    await nextTick()
    await nextTick()
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.activeElement?.getAttribute('data-test')).toBe('close')

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    await nextTick()

    expect(isOpen.value).toBe(false)
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(trigger)

    wrapper.unmount()
    trigger.remove()
  })

  it('在首尾按钮之间循环 Tab 焦点', async () => {
    const wrapper = mountDetail()
    await nextTick()
    await nextTick()

    const closeButton = wrapper.get('[data-test="close"]')
      .element as HTMLElement
    const forgottenButton = wrapper.get('[data-test="forgotten"]')
      .element as HTMLElement

    forgottenButton.focus()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    )
    expect(document.activeElement).toBe(closeButton)

    closeButton.focus()
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
      }),
    )
    expect(document.activeElement).toBe(forgottenButton)

    wrapper.unmount()
  })

  it.each([
    ['remembered', '记住了'],
    ['forgotten', '没记住'],
  ] as const)('点击%s按钮写入正确的事件学习记录', async (result, label) => {
    const store = useHistoryStore()
    const wrapper = mountDetail()

    await wrapper.get(`[data-test="${result}"]`).trigger('click')

    expect(store.studyRecords).toHaveLength(1)
    expect(store.studyRecords[0]).toMatchObject({
      targetType: 'event',
      targetId: completeEvent.id,
      result,
    })
    expect(wrapper.get('[data-test="study-status"]').text()).toContain(label)

    wrapper.unmount()
  })

  it('按 createdAt 和同时间数组顺序显示稳定 ID 的最近结果', () => {
    const store = useHistoryStore()
    store.studyRecords.push(
      {
        id: 'other-event',
        targetType: 'event',
        targetId: 'china-event-other',
        result: 'forgotten',
        createdAt: '2026-07-11T10:00:00.000Z',
      },
      {
        id: 'newer-by-position-1',
        targetType: 'event',
        targetId: completeEvent.id,
        result: 'remembered',
        createdAt: '2026-07-11T11:00:00.000Z',
      },
      {
        id: 'older',
        targetType: 'event',
        targetId: completeEvent.id,
        result: 'remembered',
        createdAt: '2026-07-11T09:00:00.000Z',
      },
      {
        id: 'newer-by-position-2',
        targetType: 'event',
        targetId: completeEvent.id,
        result: 'forgotten',
        createdAt: '2026-07-11T11:00:00.000Z',
      },
    )

    const wrapper = mountDetail()

    expect(wrapper.get('[data-test="study-status"]').text()).toContain('没记住')
    wrapper.unmount()
  })

  it('本地保存失败时保留新增记录和当前状态并显示 store 错误', async () => {
    vi.spyOn(safeLocalStorage, 'setItem').mockReturnValue(false)
    const store = useHistoryStore()
    const wrapper = mountDetail()

    await wrapper.get('[data-test="remembered"]').trigger('click')

    expect(store.studyRecords).toHaveLength(1)
    expect(store.studyRecords[0]?.result).toBe('remembered')
    expect(wrapper.get('[data-test="study-status"]').text()).toContain('记住了')
    expect(wrapper.get('[role="alert"]').text()).toBe(store.lastError)
    expect(store.lastError).toBe('本地保存失败，请重试或先导出当前数据。')

    wrapper.unmount()
  })

  it('记录内置事件学习结果时不修改用户 events 或 timelines', async () => {
    const store = useHistoryStore()
    const originalEvents = JSON.parse(JSON.stringify(store.events))
    const originalTimelines = JSON.parse(JSON.stringify(store.timelines))
    const wrapper = mountDetail()

    await wrapper.get('[data-test="remembered"]').trigger('click')
    await wrapper.get('[data-test="forgotten"]').trigger('click')

    expect(store.events).toEqual(originalEvents)
    expect(store.timelines).toEqual(originalTimelines)
    wrapper.unmount()
  })
})

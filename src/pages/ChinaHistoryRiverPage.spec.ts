import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, onMounted } from 'vue'
import { DYNASTIES, KEY_EVENTS } from '@/data/chinaHistoryRiver'
import ChinaHistoryRiverPage from './ChinaHistoryRiverPage.vue'

type ResizeObserverCallback = (entries: ResizeObserverEntry[]) => void

const resizeObservers: FakeResizeObserver[] = []
let measuredWidth = 1180
let measuredHeight = 640

class FakeResizeObserver {
  callback: ResizeObserverCallback
  disconnect = vi.fn()
  observe = vi.fn()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    resizeObservers.push(this)
  }

  trigger() {
    this.callback([])
  }
}

function mountPage(
  componentStubs: Record<string, ReturnType<typeof defineComponent>> = {},
) {
  return mount(ChinaHistoryRiverPage, {
    attachTo: document.body,
    global: {
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a :href="to"><slot /></a>',
        },
        ChinaRiverCanvas: {
          name: 'ChinaRiverCanvas',
          props: ['width', 'height', 'dynasties', 'events'],
          emits: ['select'],
          template:
            '<button data-test="canvas" @click="$emit(\'select\', events[0])">画布</button>',
        },
        RiverEventDetail: {
          name: 'RiverEventDetail',
          props: ['event'],
          emits: ['close'],
          template:
            '<aside data-test="detail">{{ event.title }}<button data-test="close-detail" @click="$emit(\'close\')">关闭</button></aside>',
        },
        ...componentStubs,
      },
    },
  })
}

describe('ChinaHistoryRiverPage', () => {
  beforeEach(() => {
    resizeObservers.length = 0
    measuredWidth = 1180
    measuredHeight = 640
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({
        width: measuredWidth,
        height: measuredHeight,
        top: 0,
        right: measuredWidth,
        bottom: measuredHeight,
        left: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    )
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('将容器尺寸和只读内置数据传给画布', async () => {
    const wrapper = await mountPage()
    await flushPromises()

    const canvas = wrapper.getComponent({ name: 'ChinaRiverCanvas' })
    expect(canvas.props('width')).toBe(1180)
    expect(canvas.props('height')).toBe(640)
    expect(canvas.props('dynasties')).toBe(DYNASTIES)
    expect(canvas.props('events')).toBe(KEY_EVENTS)
  })

  it('尺寸为 0 时不绘制并显示明确状态', async () => {
    measuredWidth = 0
    measuredHeight = 0

    const wrapper = await mountPage()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'ChinaRiverCanvas' }).exists()).toBe(
      false,
    )
    expect(wrapper.get('[data-test="river-status"]').text()).toContain(
      '画布尺寸暂不可用',
    )
  })

  it('点击事件打开详情，关闭后恢复画布', async () => {
    const wrapper = await mountPage()
    await flushPromises()

    await wrapper.get('[data-test="canvas"]').trigger('click')
    expect(wrapper.get('[data-test="detail"]').text()).toContain(
      KEY_EVENTS[0].title,
    )

    await wrapper.get('[data-test="close-detail"]').trigger('click')
    expect(wrapper.find('[data-test="detail"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="canvas"]').exists()).toBe(true)
  })

  it('响应容器变化并在卸载时清理观察器和窗口监听', async () => {
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const wrapper = await mountPage()
    await flushPromises()

    measuredWidth = 960
    measuredHeight = 540
    resizeObservers[0].trigger()
    await nextTick()

    expect(
      wrapper.getComponent({ name: 'ChinaRiverCanvas' }).props('width'),
    ).toBe(960)
    expect(
      wrapper.getComponent({ name: 'ChinaRiverCanvas' }).props('height'),
    ).toBe(540)

    wrapper.unmount()
    expect(resizeObservers[0].disconnect).toHaveBeenCalledOnce()
    expect(removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    )
  })

  it('挂载后立即卸载不会遗留观察器或窗口监听', async () => {
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const removeEventListener = vi.spyOn(window, 'removeEventListener')

    const wrapper = mountPage()
    wrapper.unmount()
    await flushPromises()

    expect(addEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    )
    expect(removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    )
    expect(resizeObservers).toHaveLength(1)
    expect(resizeObservers[0].observe).toHaveBeenCalledOnce()
    expect(resizeObservers[0].disconnect).toHaveBeenCalledOnce()
  })

  it('子组件异常时显示页面级回退并移除整个风险子树', async () => {
    const escapedError = vi.fn()
    const FaultyEventDetail = defineComponent({
      name: 'RiverEventDetail',
      setup() {
        onMounted(() => {
          throw new Error('详情挂载失败')
        })
        return () => h('aside', { 'data-test': 'faulty-detail' }, '故障详情')
      },
    })
    const wrapper = mountPage({ RiverEventDetail: FaultyEventDetail })
    wrapper.vm.$.appContext.config.errorHandler = escapedError
    await flushPromises()

    await wrapper.get('[data-test="canvas"]').trigger('click')
    await flushPromises()

    expect(escapedError).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="river-status"]').text()).toContain(
      '中华历史长河加载异常',
    )
    expect(wrapper.find('[data-test="canvas"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="faulty-detail"]').exists()).toBe(false)
  })
})

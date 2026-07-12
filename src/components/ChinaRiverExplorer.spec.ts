import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, onMounted } from 'vue'
import { DYNASTIES } from '@/data/chinaHistoryRiver'
import { getAllTextbookEvents } from '@/domain/textbookSelectors'
import ChinaRiverExplorer from './ChinaRiverExplorer.vue'

enableAutoUnmount(afterEach)

type ResizeObserverCallback = (entries: ResizeObserverEntry[]) => void

const resizeObservers: FakeResizeObserver[] = []
let measuredWidth = 1180
let measuredHeight = 480
const textbookEvents = getAllTextbookEvents()

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

function mountExplorer(
  componentStubs: Record<string, ReturnType<typeof defineComponent>> = {},
) {
  return mount(ChinaRiverExplorer, {
    attachTo: document.body,
    global: {
      stubs: {
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

describe('ChinaRiverExplorer', () => {
  beforeEach(() => {
    resizeObservers.length = 0
    measuredWidth = 1180
    measuredHeight = 480
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

  it('将容器尺寸和只读历史数据传给画布', async () => {
    const wrapper = mountExplorer()
    await flushPromises()

    const canvas = wrapper.getComponent({ name: 'ChinaRiverCanvas' })
    expect(canvas.props('width')).toBe(1180)
    expect(canvas.props('height')).toBe(480)
    expect(canvas.props('dynasties')).toBe(DYNASTIES)
    expect(canvas.props('events')).toBe(textbookEvents)
  })

  it('尺寸不可用时显示明确状态而不绘制画布', async () => {
    measuredWidth = 0
    measuredHeight = 0

    const wrapper = mountExplorer()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'ChinaRiverCanvas' }).exists()).toBe(
      false,
    )
    expect(wrapper.get('[data-test="river-status"]').text()).toContain(
      '画布尺寸暂不可用',
    )
  })

  it('点击事件打开详情并允许关闭', async () => {
    const wrapper = mountExplorer()
    await flushPromises()

    await wrapper.get('[data-test="canvas"]').trigger('click')
    expect(wrapper.get('[data-test="detail"]').text()).toContain(
      textbookEvents[0].title,
    )

    await wrapper.get('[data-test="close-detail"]').trigger('click')
    expect(wrapper.find('[data-test="detail"]').exists()).toBe(false)
  })

  it('响应尺寸变化并在卸载时清理监听', async () => {
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const wrapper = mountExplorer()
    await flushPromises()

    measuredWidth = 920
    measuredHeight = 520
    resizeObservers[0].trigger()
    await nextTick()

    const canvas = wrapper.getComponent({ name: 'ChinaRiverCanvas' })
    expect(canvas.props('width')).toBe(920)
    expect(canvas.props('height')).toBe(520)

    wrapper.unmount()
    expect(resizeObservers[0].disconnect).toHaveBeenCalledOnce()
    expect(removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    )
  })

  it('风险子组件异常时只替换探索器内容', async () => {
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
    const wrapper = mountExplorer({ RiverEventDetail: FaultyEventDetail })
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

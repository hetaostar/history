/* eslint-disable vue/one-component-per-file, vue/require-default-prop */
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { createPinia } from 'pinia'
import type { IHistoricalEvent } from '@/domain/chinaRiverTypes'
import { getTextbookEvents } from '@/domain/textbookSelectors'
import TextbookRiverTimeline from './TextbookRiverTimeline.vue'

const CanvasStub = defineComponent({
  name: 'ChinaRiverCanvas',
  props: {
    width: Number,
    height: Number,
    dynasties: Array,
    events: Array,
    startYear: Number,
    endYear: Number,
    initialCenterYear: Number,
    initialZoom: Number,
  },
  emits: ['select'],
  template: `
    <button
      data-test="canvas-stub"
      type="button"
      @click="$emit('select', events[0])"
    >
      选择事件
    </button>
  `,
})

const EventDetailStub = defineComponent({
  name: 'RiverEventDetail',
  props: {
    event: Object,
    readOnly: Boolean,
  },
  emits: ['close'],
  template: `
    <div data-test="detail-stub" :data-read-only="String(readOnly)">
      {{ event.title }}
      <button v-if="!readOnly" data-test="study-action">记住了</button>
      <button data-test="close-detail" @click="$emit('close')">关闭</button>
    </div>
  `,
})

class ResizeObserverStub {
  constructor() {
    resizeObserverInstances.push(this)
  }

  observe = vi.fn()
  disconnect = vi.fn()
}

let resizeObserverInstances: ResizeObserverStub[]

function createBounds(width: number, height: number): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  }
}

async function mountTimeline(
  textbookId = 'grade-7-up',
  options: {
    width?: number
    height?: number
    canvas?: object
  } = {},
) {
  const width = options.width ?? 1000
  const height = options.height ?? 560
  const wrapper = mount(TextbookRiverTimeline, {
    props: { textbookId },
    global: {
      plugins: [createPinia()],
      stubs: {
        ChinaRiverCanvas: options.canvas ?? CanvasStub,
        RiverEventDetail: EventDetailStub,
      },
    },
  })
  vi.spyOn(
    wrapper.get('.timeline-canvas').element,
    'getBoundingClientRect',
  ).mockReturnValue(createBounds(width, height))
  window.dispatchEvent(new Event('resize'))
  await nextTick()
  return wrapper
}

beforeEach(() => {
  resizeObserverInstances = []
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('TextbookRiverTimeline', () => {
  it('同页双实例使用唯一标题 ID 并分别关联自身标题', () => {
    const wrapper = mount({
      components: { TextbookRiverTimeline },
      template: `
        <div>
          <TextbookRiverTimeline textbook-id="grade-7-up" />
          <TextbookRiverTimeline textbook-id="grade-7-down" />
        </div>
      `,
    }, {
      global: {
        plugins: [createPinia()],
        stubs: {
          ChinaRiverCanvas: CanvasStub,
          RiverEventDetail: EventDetailStub,
        },
      },
    })
    const regions = wrapper.findAll('[data-test="textbook-river-timeline"]')
    const titleIds = regions.map((region) =>
      region.get('h2').attributes('id'),
    )

    expect(regions).toHaveLength(2)
    expect(new Set(titleIds).size).toBe(2)
    regions.forEach((region, index) => {
      expect(region.attributes('aria-labelledby')).toBe(titleIds[index])
    })
    wrapper.unmount()
  })

  it('仅传入本册去重事件，并包含与首尾年份相交的朝代边界', async () => {
    const wrapper = await mountTimeline('grade-7-down')
    const canvas = wrapper.getComponent(CanvasStub)
    const expectedEvents = getTextbookEvents('grade-7-down')
    const receivedEvents = canvas.props('events') as IHistoricalEvent[]
    const firstYear = expectedEvents[0].year
    const lastYear = expectedEvents[expectedEvents.length - 1].year
    const receivedDynastyIds = (
      canvas.props('dynasties') as readonly { readonly id: string }[]
    ).map((dynasty) => dynasty.id)

    expect(receivedEvents).toEqual(expectedEvents)
    expect(new Set(receivedEvents.map((event) => event.id)).size).toBe(
      expectedEvents.length,
    )
    expect(firstYear).toBe(589)
    expect(lastYear).toBe(1792)
    expect(receivedDynastyIds).toContain('chen')
    expect(receivedDynastyIds).toContain('sui')
    expect(receivedDynastyIds).toContain('qing')
    expect(receivedDynastyIds).not.toContain('xia')
    expect(receivedDynastyIds).not.toContain('roc')
    expect(canvas.props('startYear')).toBeLessThan(firstYear)
    expect(canvas.props('endYear')).toBeGreaterThan(lastYear)
    expect(canvas.props('initialCenterYear')).toBe((firstYear + lastYear) / 2)
    wrapper.unmount()
  })

  it('七上切换七下时更新事件、范围和朝代并关闭旧详情', async () => {
    const wrapper = await mountTimeline()
    await wrapper.get('[data-test="canvas-stub"]').trigger('click')
    const canvas = wrapper.getComponent(CanvasStub)
    const initialDynastyIds = (
      canvas.props('dynasties') as readonly { readonly id: string }[]
    ).map((dynasty) => dynasty.id)

    expect(wrapper.get('[data-test="detail-stub"]').text()).toContain(
      getTextbookEvents('grade-7-up')[0].title,
    )
    expect(initialDynastyIds).toContain('northern_wei')
    expect(initialDynastyIds).not.toContain('chen')
    expect(initialDynastyIds).not.toContain('sui')

    await wrapper.setProps({ textbookId: 'grade-7-down' })
    await nextTick()

    const nextEvents = getTextbookEvents('grade-7-down')
    const firstYear = nextEvents[0].year
    const lastYear = nextEvents[nextEvents.length - 1].year
    const nextDynastyIds = (
      canvas.props('dynasties') as readonly { readonly id: string }[]
    ).map((dynasty) => dynasty.id)
    expect(canvas.props('events')).toEqual(nextEvents)
    expect(nextDynastyIds).toContain('chen')
    expect(nextDynastyIds).toContain('sui')
    expect(nextDynastyIds).toContain('qing')
    expect(nextDynastyIds).not.toContain('northern_wei')
    expect(nextDynastyIds).not.toContain('roc')
    expect(canvas.props('startYear')).toBeLessThan(firstYear)
    expect(canvas.props('endYear')).toBeGreaterThan(lastYear)
    expect(wrapper.find('[data-test="detail-stub"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('点击事件打开详情并可关闭', async () => {
    const wrapper = await mountTimeline()

    await wrapper.get('[data-test="canvas-stub"]').trigger('click')
    const detail = wrapper.getComponent(EventDetailStub)
    expect(detail.text()).toContain(
      getTextbookEvents('grade-7-up')[0].title,
    )
    expect(detail.props('readOnly')).toBe(true)
    expect(detail.find('[data-test="study-action"]').exists()).toBe(false)

    await wrapper.get('[data-test="close-detail"]').trigger('click')
    expect(wrapper.find('[data-test="detail-stub"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('尺寸不可用时仅在时间线区域显示状态', async () => {
    const wrapper = await mountTimeline('grade-7-up', { width: 0, height: 0 })

    expect(wrapper.get('[data-test="textbook-river-status"]').text()).toContain(
      '尺寸暂不可用',
    )
    expect(wrapper.findComponent(CanvasStub).exists()).toBe(false)
    expect(wrapper.attributes('role')).toBe('region')
    wrapper.unmount()
  })

  it('画布渲染异常时仅替换时间线内容并阻止错误向父级传播', async () => {
    const parentError = vi.fn()
    const ThrowingCanvas = defineComponent({
      name: 'ChinaRiverCanvas',
      setup() {
        throw new Error('canvas render failed')
      },
      template: '<div />',
    })
    const Parent = defineComponent({
      components: { TextbookRiverTimeline },
      errorCaptured(error) {
        parentError(error)
        return false
      },
      template:
        '<main><p data-test="sibling">其他教材内容</p><TextbookRiverTimeline textbook-id="grade-7-up" /></main>',
    })
    const wrapper = mount(Parent, {
      global: {
        plugins: [createPinia()],
        stubs: {
          ChinaRiverCanvas: ThrowingCanvas,
          RiverEventDetail: EventDetailStub,
        },
      },
    })
    vi.spyOn(
      wrapper.get('.timeline-canvas').element,
      'getBoundingClientRect',
    ).mockReturnValue(createBounds(1000, 560))
    window.dispatchEvent(new Event('resize'))
    await nextTick()

    expect(wrapper.get('[data-test="sibling"]').text()).toBe('其他教材内容')
    expect(wrapper.get('[data-test="textbook-river-status"]').text()).toContain(
      '加载异常',
    )
    expect(parentError).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('卸载时断开尺寸观察并移除窗口监听', async () => {
    const addWindowListener = vi.spyOn(window, 'addEventListener')
    const removeWindowListener = vi.spyOn(window, 'removeEventListener')
    const wrapper = await mountTimeline()
    const resizeRegistration = addWindowListener.mock.calls.find(
      ([type]) => type === 'resize',
    )
    const resizeCallback = resizeRegistration?.[1]

    expect(resizeObserverInstances).toHaveLength(1)
    expect(resizeCallback).toBeTypeOf('function')
    wrapper.unmount()

    expect(resizeObserverInstances[0].disconnect).toHaveBeenCalledOnce()
    expect(removeWindowListener).toHaveBeenCalledWith('resize', resizeCallback)
  })
})

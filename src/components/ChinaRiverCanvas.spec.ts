import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import ChinaRiverCanvas from './ChinaRiverCanvas.vue'
import { createRiverDataPoints } from '@/domain/chinaRiverLayout'
import type { IDynasty, IHistoricalEvent } from '@/domain/chinaRiverTypes'

vi.mock('@/domain/chinaRiverLayout', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/domain/chinaRiverLayout')>()
  return {
    ...actual,
    createRiverDataPoints: vi.fn(actual.createRiverDataPoints),
  }
})

const dynasties: IDynasty[] = [
  {
    id: 'han',
    name: 'Han',
    chineseName: '汉',
    startYear: -202,
    endYear: 220,
    color: '#b45309',
    description: '汉代',
  },
  {
    id: 'prc',
    name: 'PRC',
    chineseName: '中华人民共和国',
    startYear: 1949,
    endYear: 2025,
    color: '#ef4444',
    description: '中华人民共和国',
  },
]

const events: IHistoricalEvent[] = [
  {
    id: 'founding',
    year: 1949,
    title: '中华人民共和国成立',
    type: 'politics',
    importance: 1,
  },
  {
    id: 'reform',
    year: 1978,
    title: '改革开放',
    type: 'politics',
    importance: 2,
  },
  {
    id: 'center-detail',
    year: -237,
    title: '中心细节事件',
    type: 'culture',
    importance: 2,
  },
]

let rafCallbacks: Map<number, FrameRequestCallback>
let nextRafId: number

function flushAnimationFrames() {
  const callbacks = [...rafCallbacks.values()]
  rafCallbacks.clear()
  callbacks.forEach((callback) => callback(performance.now()))
}

function mountCanvas() {
  return mount(ChinaRiverCanvas, {
    attachTo: document.body,
    props: {
      width: 1200,
      height: 720,
      dynasties,
      events,
    },
  })
}

function createConcurrentDynasty(id: string, index: number): IDynasty {
  return {
    id,
    name: id,
    chineseName: `并立政权${index + 1}`,
    startYear: 800,
    endYear: 1000,
    color: `hsl(${index * 40} 70% 50%)`,
    description: '并立政权',
  }
}

function getPathYCoordinates(path: string): number[] {
  const coordinates =
    path.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)?.map(Number) ?? []
  return coordinates.filter((_, index) => index % 2 === 1)
}

function getTranslateY(transform: string | undefined): number {
  if (!transform) throw new Error('缺少 transform 属性')
  const match = transform.match(/translate\([^ ]+ ([^)]+)\)/)
  if (!match) throw new Error(`无法解析 transform: ${transform}`)
  return Number(match[1])
}

function getTranslateX(transform: string | undefined): number {
  if (!transform) throw new Error('缺少 transform 属性')
  const match = transform.match(/translate\(([^ ]+)/)
  if (!match) throw new Error(`无法解析 transform: ${transform}`)
  return Number(match[1])
}

function getScale(transform: string | undefined): number {
  if (!transform) throw new Error('缺少 transform 属性')
  const match = transform.match(/scale\(([^ )]+)/)
  if (!match) throw new Error(`无法解析 transform: ${transform}`)
  return Number(match[1])
}

beforeEach(() => {
  vi.mocked(createRiverDataPoints).mockClear()
  rafCallbacks = new Map()
  nextRafId = 1
  vi.spyOn(SVGSVGElement.prototype, 'createSVGPoint').mockImplementation(() => {
    const point = {
      x: 0,
      y: 0,
      matrixTransform: () => ({ x: point.x, y: point.y }),
    }
    return point as DOMPoint
  })
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      const id = nextRafId
      nextRafId += 1
      rafCallbacks.set(id, callback)
      return id
    }),
  )
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => rafCallbacks.delete(id)),
  )
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ChinaRiverCanvas', () => {
  it('渲染 SVG、朝代河流与 1949 顶部轨道', () => {
    const wrapper = mountCanvas()

    expect(wrapper.get('svg').attributes('width')).toBe('1200')
    expect(wrapper.findAll('[data-test="dynasty-river"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('汉')
    expect(wrapper.get('[data-test="prc-track"]').text()).toContain('1949')

    wrapper.unmount()
  })

  it('同一页面的两个画布使用互不冲突的 defs ID', () => {
    const wrapper = mount({
      components: { ChinaRiverCanvas },
      setup: () => ({ dynasties, events }),
      template: `
        <div>
          <ChinaRiverCanvas :width="1200" :height="720" :dynasties="dynasties" :events="events" />
          <ChinaRiverCanvas :width="1200" :height="720" :dynasties="dynasties" :events="events" />
        </div>
      `,
    })

    const ids = wrapper
      .findAll('svg defs [id]')
      .map((node) => node.attributes('id'))

    expect(ids).toHaveLength(4)
    expect(new Set(ids).size).toBe(4)
    wrapper.unmount()
  })

  it('多政权并立时将全部堆叠层限制在河流绘制范围内', () => {
    const concurrentDynasties = [
      'tang',
      'han_west',
      'han_east',
      'qing',
      'yuan',
      'prc',
      'ming',
      'song',
    ].map(createConcurrentDynasty)
    const wrapper = mount(ChinaRiverCanvas, {
      props: {
        width: 1200,
        height: 720,
        dynasties: concurrentDynasties,
        events: [],
      },
    })

    const allPathYCoordinates = wrapper
      .findAll('[data-test="dynasty-river"]')
      .flatMap((path) => getPathYCoordinates(path.attributes('d') ?? ''))

    expect(allPathYCoordinates.length).toBeGreaterThan(0)
    expect(Math.min(...allPathYCoordinates)).toBeGreaterThanOrEqual(400)
    expect(Math.max(...allPathYCoordinates)).toBeLessThanOrEqual(616)
    wrapper.unmount()
  })

  it('同年并立朝代标签位于各自堆叠层内部', () => {
    const concurrentDynasties = ['tang', 'han_west'].map(
      createConcurrentDynasty,
    )
    const wrapper = mount(ChinaRiverCanvas, {
      props: {
        width: 1200,
        height: 720,
        dynasties: concurrentDynasties,
        events: [],
      },
    })

    const lowerLayerLabelY = getTranslateY(
      wrapper.get('[data-test="dynasty-label-tang"]').attributes('transform'),
    )
    const upperLayerLabelY = getTranslateY(
      wrapper
        .get('[data-test="dynasty-label-han_west"]')
        .attributes('transform'),
    )

    expect(lowerLayerLabelY).toBeGreaterThan(400)
    expect(lowerLayerLabelY).toBeLessThan(616)
    expect(upperLayerLabelY).toBeGreaterThan(400)
    expect(upperLayerLabelY).toBeLessThan(616)
    expect(lowerLayerLabelY).toBeGreaterThan(upperLayerLabelY)
    wrapper.unmount()
  })

  it('按事件、朝代河流、独立年份轴从上到下分区', () => {
    const wrapper = mountCanvas()
    const eventY = getTranslateY(
      wrapper
        .get('[data-test="river-event-founding"]')
        .attributes('transform'),
    )
    const dynastyLabelYs = wrapper
      .findAll('.dynasty-labels > g')
      .map((label) => getTranslateY(label.attributes('transform')))
    const timelineY = getTranslateY(
      wrapper.get('.timeline-axis > g').attributes('transform'),
    )

    expect(dynastyLabelYs.length).toBeGreaterThan(0)
    expect(eventY).toBeLessThan(Math.min(...dynastyLabelYs))
    expect(timelineY).toBeGreaterThan(Math.max(...dynastyLabelYs))
    expect(wrapper.find('[data-test="timeline-divider"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('密集事件不超出画布顶部的事件区容量', () => {
    const crowdedEvents = Array.from({ length: 10 }, (_, index) => ({
      id: `crowded-${index}`,
      year: -237,
      title: `同年密集事件${index}`,
      type: 'politics' as const,
      importance: 1 as const,
    }))
    const wrapper = mount(ChinaRiverCanvas, {
      props: {
        width: 1200,
        height: 720,
        dynasties,
        events: crowdedEvents,
      },
    })
    const eventYs = wrapper
      .findAll('.river-event')
      .map((event) => getTranslateY(event.attributes('transform')))

    expect(eventYs.length).toBeGreaterThan(0)
    expect(eventYs.length).toBeLessThan(crowdedEvents.length)
    expect(Math.min(...eventYs)).toBeGreaterThanOrEqual(24)
    wrapper.unmount()
  })

  it('点击事件时向外选择该事件', async () => {
    const wrapper = mountCanvas()

    await wrapper.get('[data-test="river-event-founding"]').trigger('click')

    expect(wrapper.emitted('select')?.[0]).toEqual([events[0]])
    wrapper.unmount()
  })

  it('按 Enter 时向外选择聚焦事件', async () => {
    const wrapper = mountCanvas()

    await wrapper
      .get('[data-test="river-event-founding"]')
      .trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('select')?.[0]).toEqual([events[0]])
    wrapper.unmount()
  })

  it('按 Space 时向外选择聚焦事件', async () => {
    const wrapper = mountCanvas()

    await wrapper
      .get('[data-test="river-event-founding"]')
      .trigger('keydown', { key: ' ' })

    expect(wrapper.emitted('select')?.[0]).toEqual([events[0]])
    wrapper.unmount()
  })

  it('缩放后提高可见 importance 并渐进显示事件', async () => {
    const wrapper = mountCanvas()
    flushAnimationFrames()
    await nextTick()

    const initialImportanceEmissions =
      wrapper.emitted('importance-change') ?? []
    expect(
      initialImportanceEmissions[initialImportanceEmissions.length - 1],
    ).toEqual([1])
    expect(
      wrapper.find('[data-test="river-event-center-detail"]').exists(),
    ).toBe(false)

    for (let index = 0; index < 3; index += 1) {
      await wrapper.get('svg').trigger('keydown', { key: '+' })
      flushAnimationFrames()
      await nextTick()
    }

    const zoomedImportanceEmissions = wrapper.emitted('importance-change') ?? []
    expect(
      zoomedImportanceEmissions[zoomedImportanceEmissions.length - 1]?.[0],
    ).toBeGreaterThan(1)
    expect(
      wrapper.find('[data-test="river-event-center-detail"]').exists(),
    ).toBe(true)
    wrapper.unmount()
  })

  it('事件卡片上的滚轮操作仍能缩放画布', async () => {
    const wrapper = mountCanvas()
    flushAnimationFrames()
    await nextTick()

    wrapper.get('[data-test="river-event-founding"]').element.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -2000,
        clientX: 860,
        clientY: 320,
        bubbles: true,
        cancelable: true,
      }),
    )
    flushAnimationFrames()
    await nextTick()

    const importanceEmissions = wrapper.emitted('importance-change') ?? []
    expect(
      importanceEmissions[importanceEmissions.length - 1]?.[0],
    ).toBeGreaterThan(1)
    wrapper.unmount()
  })

  it('滚轮缩放后仍将时间轴保持在横向边界内', async () => {
    const wrapper = mountCanvas()
    flushAnimationFrames()
    const zoomSurface = wrapper.get('[data-test="zoom-surface"]').element

    zoomSurface.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -2000,
        clientX: 0,
        clientY: 360,
        bubbles: true,
        cancelable: true,
      }),
    )
    flushAnimationFrames()
    await nextTick()

    let worldTransform = wrapper.get('.river-world').attributes('transform')
    let zoom = getScale(worldTransform)
    let offset = getTranslateX(worldTransform)
    expect(offset).toBeGreaterThanOrEqual(1200 - 9600 * zoom)
    expect(offset).toBeLessThanOrEqual(0)

    zoomSurface.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: 10_000,
        clientX: 1200,
        clientY: 360,
        bubbles: true,
        cancelable: true,
      }),
    )
    flushAnimationFrames()
    await nextTick()

    worldTransform = wrapper.get('.river-world').attributes('transform')
    zoom = getScale(worldTransform)
    offset = getTranslateX(worldTransform)
    expect(offset).toBeCloseTo((1200 - 9600 * zoom) / 2)
    wrapper.unmount()
  })

  it('使用可访问交互语义并支持键盘平移与缩放', async () => {
    const wrapper = mountCanvas()
    flushAnimationFrames()
    const svg = wrapper.get('svg')

    expect(wrapper.attributes('role')).toBe('region')
    expect(svg.attributes('role')).toBe('group')
    expect(svg.attributes('tabindex')).toBe('0')

    await svg.trigger('keydown', { key: '+' })
    flushAnimationFrames()
    await nextTick()
    const initialTransform = wrapper.get('.river-world').attributes('transform')

    await svg.trigger('keydown', { key: 'ArrowRight' })
    flushAnimationFrames()
    await nextTick()
    const pannedTransform = wrapper.get('.river-world').attributes('transform')

    expect(getTranslateX(pannedTransform)).toBeLessThan(
      getTranslateX(initialTransform),
    )

    await svg.trigger('keydown', { key: '+' })
    flushAnimationFrames()
    await nextTick()

    expect(
      getScale(wrapper.get('.river-world').attributes('transform')),
    ).toBeGreaterThan(getScale(pannedTransform))
    wrapper.unmount()
  })

  it('将键盘平移限制在完整时间轴的左右边界内', async () => {
    const wrapper = mountCanvas()
    flushAnimationFrames()
    await nextTick()
    const svg = wrapper.get('svg')

    expect(
      getTranslateX(wrapper.get('.river-world').attributes('transform')),
    ).toBeCloseTo(24)

    await svg.trigger('keydown', { key: '+' })
    flushAnimationFrames()
    await nextTick()

    for (let index = 0; index < 20; index += 1) {
      await svg.trigger('keydown', { key: 'ArrowLeft' })
      flushAnimationFrames()
      await nextTick()
    }
    expect(
      getTranslateX(wrapper.get('.river-world').attributes('transform')),
    ).toBe(0)

    for (let index = 0; index < 20; index += 1) {
      await svg.trigger('keydown', { key: 'ArrowRight' })
      flushAnimationFrames()
      await nextTick()
    }
    const worldTransform = wrapper.get('.river-world').attributes('transform')
    const zoom = getScale(worldTransform)
    expect(getTranslateX(worldTransform)).toBeCloseTo(1200 - 9600 * zoom)
    wrapper.unmount()
  })

  it('将鼠标拖拽限制在完整时间轴的左右边界内', async () => {
    const wrapper = mountCanvas()
    flushAnimationFrames()
    const svg = wrapper.get('svg')
    const zoomSurface = wrapper.get('[data-test="zoom-surface"]').element

    await svg.trigger('keydown', { key: '+' })
    flushAnimationFrames()
    await nextTick()

    zoomSurface.dispatchEvent(
      new MouseEvent('mousedown', {
        clientX: 600,
        clientY: 360,
        button: 0,
        bubbles: true,
        view: window,
      }),
    )
    window.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: -10_000,
        clientY: 360,
        buttons: 1,
        bubbles: true,
        view: window,
      }),
    )
    window.dispatchEvent(
      new MouseEvent('mouseup', {
        clientX: -10_000,
        clientY: 360,
        bubbles: true,
        view: window,
      }),
    )
    flushAnimationFrames()
    await nextTick()

    const worldTransform = wrapper.get('.river-world').attributes('transform')
    const zoom = getScale(worldTransform)
    expect(getTranslateX(worldTransform)).toBeCloseTo(1200 - 9600 * zoom)

    zoomSurface.dispatchEvent(
      new MouseEvent('mousedown', {
        clientX: 600,
        clientY: 360,
        button: 0,
        bubbles: true,
        view: window,
      }),
    )
    window.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: 10_000,
        clientY: 360,
        buttons: 1,
        bubbles: true,
        view: window,
      }),
    )
    window.dispatchEvent(
      new MouseEvent('mouseup', {
        clientX: 10_000,
        clientY: 360,
        bubbles: true,
        view: window,
      }),
    )
    flushAnimationFrames()
    await nextTick()
    expect(
      getTranslateX(wrapper.get('.river-world').attributes('transform')),
    ).toBe(0)
    wrapper.unmount()
  })

  it('纵向拖动与偏心缩放后三区仍保持固定纵向位置', async () => {
    const wrapper = mountCanvas()
    flushAnimationFrames()
    const zoomSurface = wrapper.get('[data-test="zoom-surface"]').element
    const initialDynastyLabelY = getTranslateY(
      wrapper
        .get('[data-test="dynasty-label-prc"]')
        .attributes('transform'),
    )

    zoomSurface.dispatchEvent(
      new MouseEvent('mousedown', {
        clientX: 600,
        clientY: 360,
        button: 0,
        bubbles: true,
        view: window,
      }),
    )
    window.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: 600,
        clientY: 120,
        buttons: 1,
        bubbles: true,
        view: window,
      }),
    )
    window.dispatchEvent(
      new MouseEvent('mouseup', {
        clientX: 600,
        clientY: 120,
        bubbles: true,
        view: window,
      }),
    )
    flushAnimationFrames()
    await nextTick()

    const worldTransform = wrapper.get('.river-world').attributes('transform')
    const zoom = getScale(worldTransform)
    const verticalOffset = getTranslateY(worldTransform)
    const timelineCenter = getTranslateY(
      wrapper.get('.timeline-axis > g').attributes('transform'),
    )
    const event = wrapper.get('[data-test="river-event-founding"]')
    const eventAnchor =
      getTranslateY(event.attributes('transform')) +
      Number(event.get('.event-connector').attributes('y1'))
    const internalTransform = (
      wrapper.get('svg').element as SVGSVGElement & {
        __zoom: { y: number; k: number }
      }
    ).__zoom

    expect(zoom).toBeGreaterThan(0)
    expect(verticalOffset).toBe(0)
    expect(internalTransform.y).toBe(0)
    expect(
      getTranslateY(
        wrapper
          .get('[data-test="dynasty-label-prc"]')
          .attributes('transform'),
      ),
    ).toBe(initialDynastyLabelY)
    expect(eventAnchor).toBeLessThan(timelineCenter)
    wrapper.unmount()
  })

  it('指针移动时显示对应年份竖线与浮标', async () => {
    const wrapper = mountCanvas()
    flushAnimationFrames()

    wrapper.element.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 600,
        clientY: 240,
        bubbles: true,
      }),
    )
    flushAnimationFrames()
    await nextTick()

    expect(wrapper.find('[data-test="hover-year-line"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="hover-year-badge"]').text()).toContain(
      '公元前237年',
    )
    wrapper.unmount()
  })

  it('SVG 被 CSS 缩小时按 viewBox 比例换算指针坐标', async () => {
    const wrapper = mountCanvas()
    flushAnimationFrames()
    vi.spyOn(
      wrapper.get('svg').element,
      'getBoundingClientRect',
    ).mockReturnValue({
      x: 100,
      y: 50,
      left: 100,
      top: 50,
      right: 700,
      bottom: 410,
      width: 600,
      height: 360,
      toJSON: () => ({}),
    })

    wrapper.element.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 400,
        clientY: 230,
        bubbles: true,
      }),
    )
    flushAnimationFrames()
    await nextTick()

    expect(wrapper.get('[data-test="hover-year-line"]').attributes('x1')).toBe(
      '600',
    )
    expect(wrapper.get('[data-test="hover-year-badge"]').text()).toContain(
      '公元前237年',
    )
    wrapper.unmount()
  })

  it('尺寸变化后更新画布范围并保持固定纵向分区', async () => {
    const wrapper = mountCanvas()
    flushAnimationFrames()

    await wrapper.setProps({ width: 800, height: 600 })
    await nextTick()
    flushAnimationFrames()
    await nextTick()

    const worldTransform = wrapper.get('.river-world').attributes('transform')
    const zoom = getScale(worldTransform)
    const internalTransform = (
      wrapper.get('svg').element as SVGSVGElement & {
        __zoom: { y: number; k: number }
      }
    ).__zoom

    expect(wrapper.get('svg').attributes('viewBox')).toBe('0 0 800 600')
    expect(zoom).toBeGreaterThan(0)
    expect(getTranslateY(worldTransform)).toBe(0)
    expect(getTranslateX(worldTransform)).toBeCloseTo(16)
    expect(internalTransform.y).toBe(0)
    expect(
      getTranslateY(
        wrapper.get('.timeline-axis > g').attributes('transform'),
      ),
    ).toBe(558)
    wrapper.unmount()
  })

  it('同一采样级连续缩放不重复计算河流重几何', async () => {
    const wrapper = mountCanvas()
    flushAnimationFrames()
    await nextTick()
    const initialCalculationCount = vi.mocked(createRiverDataPoints).mock.calls
      .length
    const zoomSurface = wrapper.get('[data-test="zoom-surface"]').element

    for (let index = 0; index < 2; index += 1) {
      zoomSurface.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: -100,
          clientX: 600,
          clientY: 360,
          bubbles: true,
          cancelable: true,
        }),
      )
      flushAnimationFrames()
      await nextTick()
    }

    expect(createRiverDataPoints).toHaveBeenCalledTimes(initialCalculationCount)
    wrapper.unmount()
  })

  it('不渲染当前可见年份范围外的事件', async () => {
    const offscreenEvent: IHistoricalEvent = {
      id: 'offscreen-event',
      year: -2400,
      title: '远古画外事件',
      type: 'culture',
      importance: 1,
    }
    const wrapper = mount(ChinaRiverCanvas, {
      props: {
        width: 1200,
        height: 720,
        dynasties,
        events: [...events, offscreenEvent],
      },
    })

    flushAnimationFrames()
    await wrapper.get('svg').trigger('keydown', { key: '+' })
    flushAnimationFrames()
    await nextTick()

    expect(
      wrapper.find('[data-test="river-event-offscreen-event"]').exists(),
    ).toBe(false)
    wrapper.unmount()
  })

  it('卸载时取消 RAF 并移除 wheel 与 pointer 监听', () => {
    const wrapper = mountCanvas()
    const removeContainerListener = vi.spyOn(
      wrapper.element,
      'removeEventListener',
    )
    const removeSvgListener = vi.spyOn(
      wrapper.get('svg').element,
      'removeEventListener',
    )

    wrapper.element.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 300, bubbles: true }),
    )
    wrapper.unmount()

    expect(cancelAnimationFrame).toHaveBeenCalled()
    expect(
      removeSvgListener.mock.calls.some(([type]) => type === 'wheel'),
    ).toBe(true)
    expect(
      removeContainerListener.mock.calls.some(
        ([type]) => type === 'pointermove',
      ),
    ).toBe(true)
  })
})

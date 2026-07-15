import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import ChinaRiverCanvas from './ChinaRiverCanvas.vue'
import {
  DYNASTIES as COMPLETE_DYNASTIES,
  KEY_EVENTS as COMPLETE_EVENTS,
} from '@/data/chinaHistoryRiver'
import { createDynastySegments } from '@/domain/chinaRiverLayout'
import type { IDynasty, IHistoricalEvent } from '@/domain/chinaRiverTypes'

vi.mock('@/domain/chinaRiverLayout', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/domain/chinaRiverLayout')>()
  return {
    ...actual,
    createDynastySegments: vi.fn(actual.createDynastySegments),
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
  vi.mocked(createDynastySegments).mockClear()
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
  it('渲染 SVG 与使用源颜色的朝代色带', () => {
    const wrapper = mountCanvas()
    const bands = wrapper.findAll('[data-test="dynasty-band"]')

    expect(wrapper.get('svg').attributes('width')).toBe('1200')
    expect(bands).toHaveLength(2)
    expect(bands.map((band) => band.attributes('fill'))).toEqual([
      '#b45309',
      '#ef4444',
    ])
    expect(wrapper.findAll('[data-test="timeline-rail"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('汉')
    expect(wrapper.find('[data-test="prc-track"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('按教材自定义年份范围显示事件并换算中心年份', async () => {
    const customEvents: IHistoricalEvent[] = [
      {
        id: 'custom-visible',
        year: 750,
        title: '范围内事件',
        type: 'politics',
        importance: 1,
      },
      {
        id: 'custom-hidden',
        year: 1200,
        title: '范围外事件',
        type: 'politics',
        importance: 1,
      },
    ]
    const wrapper = mount(ChinaRiverCanvas, {
      props: {
        width: 1000,
        height: 640,
        dynasties,
        events: customEvents,
        startYear: 500,
        endYear: 1000,
        initialCenterYear: 750,
        initialZoom: 0.125,
      },
    })

    expect(
      wrapper.find('[data-test="river-event-custom-visible"]').exists(),
    ).toBe(true)
    expect(
      wrapper.find('[data-test="river-event-custom-hidden"]').exists(),
    ).toBe(false)
    expect(
      getScale(wrapper.get('.river-world').attributes('transform')),
    ).toBeCloseTo(0.125)

    wrapper.element.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 500,
        clientY: 240,
        bubbles: true,
      }),
    )
    flushAnimationFrames()
    await nextTick()

    expect(wrapper.get('[data-test="hover-year-badge"]').text()).toContain(
      '750年',
    )
    wrapper.unmount()
  })

  it('年份配置变化时重置视口并安全处理异常范围', async () => {
    const wrapper = mount(ChinaRiverCanvas, {
      props: {
        width: 1200,
        height: 720,
        dynasties,
        events,
        startYear: 0,
        endYear: 1000,
        initialCenterYear: 500,
        initialZoom: 0.2,
      },
    })

    await wrapper.setProps({
      startYear: 1200,
      endYear: 2000,
      initialCenterYear: 1600,
      initialZoom: 0.125,
    })
    await nextTick()
    flushAnimationFrames()
    await nextTick()

    expect(
      getScale(wrapper.get('.river-world').attributes('transform')),
    ).toBeCloseTo(0.125)

    await wrapper.setProps({
      startYear: -1_000_000,
      endYear: 1_000_000,
      initialCenterYear: Number.POSITIVE_INFINITY,
      initialZoom: Number.NaN,
    })
    await nextTick()
    flushAnimationFrames()
    await nextTick()

    expect(wrapper.find('svg').exists()).toBe(true)
    expect(
      Number.isFinite(
        getScale(wrapper.get('.river-world').attributes('transform')),
      ),
    ).toBe(true)
    wrapper.unmount()
  })

  it('完整数据初始视图保持有限节点且事件卡片互不重叠', () => {
    const wrapper = mount(ChinaRiverCanvas, {
      props: {
        width: 1200,
        height: 720,
        dynasties: COMPLETE_DYNASTIES,
        events: COMPLETE_EVENTS,
      },
    })
    const bands = wrapper.findAll('[data-test="dynasty-band"]')
    const cards = wrapper.findAll('.river-event').map((event) => {
      const card = event.get('.event-card')
      const eventX = getTranslateX(event.attributes('transform'))
      const eventY = getTranslateY(event.attributes('transform'))
      const cardX = Number(card.attributes('x'))
      const cardY = Number(card.attributes('y'))
      const width = Number(card.attributes('width'))
      const height = Number(card.attributes('height'))

      return {
        left: eventX + cardX,
        right: eventX + cardX + width,
        top: eventY + cardY,
        bottom: eventY + cardY + height,
      }
    })

    expect(bands.length).toBeGreaterThan(0)
    expect(bands.length).toBeLessThan(COMPLETE_DYNASTIES.length * 3)
    expect(
      wrapper.find('[data-dynasty-id="overview-spring-warring"]').exists(),
    ).toBe(true)
    expect(cards.length).toBeLessThan(COMPLETE_EVENTS.length)
    cards.forEach((card, index) => {
      cards.slice(index + 1).forEach((otherCard) => {
        const overlapsHorizontally =
          card.left < otherCard.right && card.right > otherCard.left
        const overlapsVertically =
          card.top < otherCard.bottom && card.bottom > otherCard.top

        expect(overlapsHorizontally && overlapsVertically).toBe(false)
      })
    })

    wrapper.unmount()
  })

  it('总览折叠并立时期并在放大后自动展开全部政权', async () => {
    const wrapper = mount(ChinaRiverCanvas, {
      props: {
        width: 1200,
        height: 720,
        dynasties: COMPLETE_DYNASTIES,
        events: [],
      },
    })

    ;[
      'overview-spring-warring',
      'overview-three-kingdoms',
      'overview-wei-jin',
      'overview-five-ten',
    ].forEach((groupId) => {
      expect(wrapper.find(`[data-dynasty-id="${groupId}"]`).exists()).toBe(true)
    })
    ;['ws_qi', 'threekingdoms_wei', 'jin', 'ten_wuyue'].forEach((dynastyId) => {
      expect(wrapper.find(`[data-dynasty-id="${dynastyId}"]`).exists()).toBe(
        false,
      )
    })
    expect(wrapper.text()).toContain('春秋战国')
    expect(wrapper.text()).toContain('9政权')

    for (let index = 0; index < 5; index += 1) {
      await wrapper.get('svg').trigger('keydown', { key: '+' })
      flushAnimationFrames()
      await nextTick()
    }

    expect(
      wrapper.find('[data-dynasty-id="overview-spring-warring"]').exists(),
    ).toBe(false)
    expect(wrapper.find('[data-dynasty-id="ws_qi"]').exists()).toBe(true)
    expect(wrapper.find('[data-dynasty-id="ten_wuyue"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('详细视图将明清大顺等分并让北宋南宋保持单层衔接', async () => {
    const wrapper = mount(ChinaRiverCanvas, {
      props: {
        width: 1200,
        height: 720,
        dynasties: COMPLETE_DYNASTIES,
        events: [],
      },
    })

    for (let index = 0; index < 5; index += 1) {
      await wrapper.get('svg').trigger('keydown', { key: '+' })
      flushAnimationFrames()
      await nextTick()
    }

    const transitionBands = wrapper.findAll(
      '[data-start-year="1644"][data-end-year="1645"]',
    )
    expect(
      transitionBands.map((band) => band.attributes('data-dynasty-id')),
    ).toEqual(['qing', 'shun', 'ming'])
    expect(
      new Set(transitionBands.map((band) => band.attributes('height'))).size,
    ).toBe(1)
    expect(transitionBands.map((band) => Number(band.attributes('y')))).toEqual(
      [...transitionBands]
        .map((band) => Number(band.attributes('y')))
        .sort((first, second) => first - second),
    )

    const northernSong = wrapper.get(
      '[data-dynasty-id="northern_song"][data-end-year="1127"]',
    )
    const southernSong = wrapper.get(
      '[data-dynasty-id="southern_song"][data-start-year="1127"]',
    )
    expect(northernSong.attributes('data-stack-count')).toBe('1')
    expect(southernSong.attributes('data-stack-count')).toBe('1')
    expect(northernSong.attributes('y')).toBe(southernSong.attributes('y'))
    expect(northernSong.attributes('height')).toBe(
      southernSong.attributes('height'),
    )
    wrapper.unmount()
  })

  it('跨过详细视图阈值后仍支持事件选择、滚轮缩放与键盘平移', async () => {
    const detailEvent: IHistoricalEvent = {
      id: 'detail-threshold-event',
      year: -237,
      title: '阈值交互事件',
      type: 'politics',
      importance: 1,
    }
    const wrapper = mount(ChinaRiverCanvas, {
      props: {
        width: 1200,
        height: 720,
        dynasties: COMPLETE_DYNASTIES,
        events: [detailEvent],
      },
    })
    const svg = wrapper.get('svg')
    const zoomSurface = wrapper.get('[data-test="zoom-surface"]').element

    for (let index = 0; index < 5; index += 1) {
      await svg.trigger('keydown', { key: '+' })
      flushAnimationFrames()
      await nextTick()
    }

    await wrapper
      .get('[data-test="river-event-detail-threshold-event"]')
      .trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual([detailEvent])

    const scaleBeforeWheel = getScale(
      wrapper.get('.river-world').attributes('transform'),
    )
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
    expect(
      getScale(wrapper.get('.river-world').attributes('transform')),
    ).toBeGreaterThan(scaleBeforeWheel)

    const offsetBeforePan = getTranslateX(
      wrapper.get('.river-world').attributes('transform'),
    )
    await svg.trigger('keydown', { key: 'ArrowRight' })
    flushAnimationFrames()
    await nextTick()
    expect(
      getTranslateX(wrapper.get('.river-world').attributes('transform')),
    ).toBeLessThan(offsetBeforePan)
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

  it('多政权并立时在同一条粗色带内等高分层', () => {
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

    const bands = wrapper.findAll('[data-test="dynasty-band"]')
    const bandTop = Math.min(
      ...bands.map((band) => Number(band.attributes('y'))),
    )
    const bandBottom = Math.max(
      ...bands.map(
        (band) =>
          Number(band.attributes('y')) + Number(band.attributes('height')),
      ),
    )
    const heights = bands.map((band) => Number(band.attributes('height')))

    expect(bands).toHaveLength(concurrentDynasties.length)
    expect(new Set(heights).size).toBe(1)
    expect(heights.reduce((total, height) => total + height, 0)).toBeCloseTo(
      bandBottom - bandTop,
    )
    expect(bandBottom - bandTop).toBeGreaterThanOrEqual(110)
    wrapper.unmount()
  })

  it('同年并立朝代标签位于各自色带轨道中央', () => {
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
    expect(lowerLayerLabelY).toBeLessThan(634)
    expect(upperLayerLabelY).toBeGreaterThan(400)
    expect(upperLayerLabelY).toBeLessThan(634)
    expect(lowerLayerLabelY).toBeLessThan(upperLayerLabelY)
    wrapper.unmount()
  })

  it('按事件、朝代河流、独立年份轴从上到下分区', () => {
    const wrapper = mountCanvas()
    const eventY = getTranslateY(
      wrapper.get('[data-test="river-event-founding"]').attributes('transform'),
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

  it('长事件标题在卡片内省略但保留完整无障碍名称', () => {
    const longTitle = '这是一个用于验证事件卡片文字边界的超长历史事件标题'
    const wrapper = mount(ChinaRiverCanvas, {
      props: {
        width: 1200,
        height: 720,
        dynasties,
        events: [
          {
            id: 'long-title',
            year: -237,
            title: longTitle,
            type: 'culture',
            importance: 1,
          },
        ],
      },
    })
    const event = wrapper.get('[data-test="river-event-long-title"]')

    expect(event.get('.event-title').text()).toMatch(/…$/)
    expect(event.attributes('aria-label')).toContain(longTitle)
    wrapper.unmount()
  })

  it('紧凑卡片改为两行展示，标题可省略且年份完整保留', async () => {
    const longTitle = '这是一个用于验证紧凑卡片两行截断的超长历史事件标题'
    const wrapper = mount(ChinaRiverCanvas, {
      props: {
        width: 1200,
        height: 720,
        dynasties,
        events: [
          {
            id: 'compact-title',
            year: -237,
            title: longTitle,
            type: 'politics',
            importance: 2,
          },
        ],
      },
    })

    for (let index = 0; index < 3; index += 1) {
      await wrapper.get('svg').trigger('keydown', { key: '+' })
      flushAnimationFrames()
      await nextTick()
    }

    const event = wrapper.get('[data-test="river-event-compact-title"]')
    expect(event.get('.event-title').text()).toMatch(/…$/)
    expect(event.get('.event-title').text()).not.toContain('·')
    expect(event.get('.event-meta').text()).toBe('公元前237年')
    expect(event.attributes('aria-label')).toContain(longTitle)
    wrapper.unmount()
  })

  it('重要级大于 3 的事件只显示标题不显示年份', async () => {
    const wrapper = mount(ChinaRiverCanvas, {
      props: {
        width: 1200,
        height: 720,
        dynasties,
        events: [
          {
            id: 'detail-only-title',
            year: 900,
            title: '地方军镇割据',
            type: 'politics',
            importance: 4,
          },
        ],
        initialCenterYear: 900,
        initialZoom: 2.5,
      },
    })
    flushAnimationFrames()
    await nextTick()

    const event = wrapper.get('[data-test="river-event-detail-only-title"]')
    expect(event.get('.event-title').text()).toBe('地方军镇割据')
    expect(event.find('.event-meta').exists()).toBe(false)
    expect(event.attributes('aria-label')).toContain('公元900年')
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
    expect(
      wrapper
        .get('[data-test="river-event-founding"]')
        .classes('river-event--featured'),
    ).toBe(true)

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
    expect(
      wrapper
        .get('[data-test="river-event-center-detail"]')
        .classes('river-event--compact'),
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
      wrapper.get('[data-test="dynasty-label-han"]').attributes('transform'),
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
        wrapper.get('[data-test="dynasty-label-han"]').attributes('transform'),
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
      getTranslateY(wrapper.get('.timeline-axis > g').attributes('transform')),
    ).toBe(558)
    wrapper.unmount()
  })

  it('指针移动和连续缩放不重复计算预生成的两套朝代片段', async () => {
    const wrapper = mountCanvas()
    flushAnimationFrames()
    await nextTick()
    const initialCalculationCount = vi.mocked(createDynastySegments).mock.calls
      .length
    const zoomSurface = wrapper.get('[data-test="zoom-surface"]').element

    wrapper.element.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 500,
        clientY: 220,
        bubbles: true,
      }),
    )
    flushAnimationFrames()
    await nextTick()

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

    expect(createDynastySegments).toHaveBeenCalledTimes(initialCalculationCount)
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

  it('跨过详细视图阈值后仍支持鼠标拖拽', async () => {
    const wrapper = mount(ChinaRiverCanvas, {
      props: {
        width: 1200,
        height: 720,
        dynasties: COMPLETE_DYNASTIES,
        events: [],
      },
    })
    const svg = wrapper.get('svg')
    const zoomSurface = wrapper.get('[data-test="zoom-surface"]').element

    for (let index = 0; index < 5; index += 1) {
      await svg.trigger('keydown', { key: '+' })
      flushAnimationFrames()
      await nextTick()
    }

    const offsetBeforeDrag = getTranslateX(
      wrapper.get('.river-world').attributes('transform'),
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
        clientX: 500,
        clientY: 360,
        buttons: 1,
        bubbles: true,
        view: window,
      }),
    )
    window.dispatchEvent(
      new MouseEvent('mouseup', {
        clientX: 500,
        clientY: 360,
        bubbles: true,
        view: window,
      }),
    )
    flushAnimationFrames()
    await nextTick()

    expect(
      getTranslateX(wrapper.get('.river-world').attributes('transform')),
    ).toBeLessThan(offsetBeforeDrag)
    await new Promise((resolve) => setTimeout(resolve, 0))
    wrapper.unmount()
  })
})

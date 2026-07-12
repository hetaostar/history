import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HISTORY_PERIODS } from '@/domain/historyPeriods'
import HistoryPeriodNavigation from './HistoryPeriodNavigation.vue'

describe('HistoryPeriodNavigation', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('按历史时期顺序渲染带标签的导航', () => {
    const wrapper = mount(HistoryPeriodNavigation, {
      props: {
        periods: HISTORY_PERIODS.slice(0, 3),
        activePeriodId: 'xia',
      },
    })

    expect(wrapper.get('nav').attributes('aria-label')).toBe('朝代导航')
    expect(
      wrapper
        .findAll('[data-test^="period-navigation-"]')
        .map((item) => item.text()),
    ).toEqual(['夏', '商', '西周'])
  })

  it('使用 aria-current 标记当前阅读时期', () => {
    const wrapper = mount(HistoryPeriodNavigation, {
      props: {
        periods: HISTORY_PERIODS.slice(0, 3),
        activePeriodId: 'shang',
      },
    })

    expect(
      wrapper
        .get('[data-test="period-navigation-shang"]')
        .attributes('aria-current'),
    ).toBe('location')
    expect(
      wrapper
        .get('[data-test="period-navigation-xia"]')
        .attributes('aria-current'),
    ).toBeUndefined()
  })

  it('点击时期按钮时请求页面定位', async () => {
    const wrapper = mount(HistoryPeriodNavigation, {
      props: {
        periods: HISTORY_PERIODS.slice(0, 3),
        activePeriodId: 'xia',
      },
    })

    await wrapper.get('[data-test="period-navigation-shang"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([['shang']])
  })

  it('时期项目使用原生按钮以支持键盘操作', () => {
    const wrapper = mount(HistoryPeriodNavigation, {
      props: {
        periods: HISTORY_PERIODS.slice(0, 1),
        activePeriodId: 'xia',
      },
    })

    expect(
      wrapper.get('[data-test="period-navigation-xia"]').element.tagName,
    ).toBe('BUTTON')
  })

  it('当前时期变化时把活动项滚动到导航可视区域', async () => {
    const wrapper = mount(HistoryPeriodNavigation, {
      props: {
        periods: HISTORY_PERIODS,
        activePeriodId: 'xia',
      },
    })
    const mingButton = wrapper.get(
      '[data-test="period-navigation-ming"]',
    ).element

    await wrapper.setProps({ activePeriodId: 'ming' })
    await flushPromises()

    expect(mingButton.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
  })
})

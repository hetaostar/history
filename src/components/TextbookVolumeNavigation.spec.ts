import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TEXTBOOKS } from '@/data/textbooks'
import TextbookVolumeNavigation from './TextbookVolumeNavigation.vue'

const publishedTextbooks = TEXTBOOKS.filter(
  (textbook) => textbook.status === 'published',
)

describe('TextbookVolumeNavigation', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('按册次顺序渲染可键盘操作的教材索引', () => {
    const wrapper = mount(TextbookVolumeNavigation, {
      props: {
        textbooks: publishedTextbooks,
        activeTextbookId: 'grade-7-up',
      },
    })

    expect(wrapper.get('nav').attributes('aria-label')).toBe('册次导航')
    expect(wrapper.get('.navigation-title').text()).toBe('教材索引')
    expect(
      wrapper
        .findAll('[data-test^="textbook-navigation-"]')
        .map((item) => item.text()),
    ).toEqual(['七上', '七下'])
    expect(
      wrapper.get('[data-test="textbook-navigation-grade-7-up"]').element
        .tagName,
    ).toBe('BUTTON')
  })

  it('标记当前册次并在点击时请求页面定位', async () => {
    const wrapper = mount(TextbookVolumeNavigation, {
      props: {
        textbooks: publishedTextbooks,
        activeTextbookId: 'grade-7-up',
      },
    })

    expect(
      wrapper
        .get('[data-test="textbook-navigation-grade-7-up"]')
        .attributes('aria-current'),
    ).toBe('location')

    await wrapper
      .get('[data-test="textbook-navigation-grade-7-down"]')
      .trigger('click')
    expect(wrapper.emitted('select')).toEqual([['grade-7-down']])
  })

  it('活动册次变化时滚动到可视区域并尊重减少动态效果', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }))
    const wrapper = mount(TextbookVolumeNavigation, {
      props: {
        textbooks: publishedTextbooks,
        activeTextbookId: 'grade-7-up',
      },
    })
    const downButton = wrapper.get(
      '[data-test="textbook-navigation-grade-7-down"]',
    ).element

    await wrapper.setProps({ activeTextbookId: 'grade-7-down' })
    await flushPromises()

    expect(downButton.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'nearest',
      inline: 'nearest',
    })
  })
})

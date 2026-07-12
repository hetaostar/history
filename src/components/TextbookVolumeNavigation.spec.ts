import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ITextbook } from '@/domain/textbookTypes'
import TextbookVolumeNavigation from './TextbookVolumeNavigation.vue'

const textbooks: readonly ITextbook[] = [
  {
    id: 'grade-7-up',
    title: '七年级上册',
    shortTitle: '七上',
    grade: 7,
    semester: 'up',
    edition: '测试版',
    revisionYear: 2024,
    status: 'published',
    summary: '',
    order: 1,
  },
  {
    id: 'grade-7-down',
    title: '七年级下册',
    shortTitle: '七下',
    grade: 7,
    semester: 'down',
    edition: '测试版',
    revisionYear: 2024,
    status: 'published',
    summary: '',
    order: 2,
  },
]

describe('TextbookVolumeNavigation', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false }),
    )
  })

  it('使用教材索引和册次导航语义渲染按钮', () => {
    const wrapper = mount(TextbookVolumeNavigation, {
      props: {
        textbooks,
        activeTextbookId: 'grade-7-up',
      },
    })

    expect(wrapper.get('nav').attributes('aria-label')).toBe('册次导航')
    expect(wrapper.text()).toContain('教材索引')
    expect(
      wrapper.findAll('[data-textbook-id]').map((item) => item.text()),
    ).toEqual(['七上', '七下'])
    expect(
      wrapper
        .get('[data-textbook-id="grade-7-up"]')
        .attributes('aria-current'),
    ).toBe('location')
  })

  it('点击册次按钮时请求页面定位', async () => {
    const wrapper = mount(TextbookVolumeNavigation, {
      props: {
        textbooks,
        activeTextbookId: 'grade-7-up',
      },
    })

    await wrapper
      .get('[data-textbook-id="grade-7-down"]')
      .trigger('click')

    expect(wrapper.emitted('select')).toEqual([['grade-7-down']])
  })

  it('活动册次变化时平滑滚动到可视区域', async () => {
    const wrapper = mount(TextbookVolumeNavigation, {
      props: {
        textbooks,
        activeTextbookId: 'grade-7-up',
      },
    })
    const target = wrapper.get(
      '[data-textbook-id="grade-7-down"]',
    ).element

    await wrapper.setProps({ activeTextbookId: 'grade-7-down' })
    await flushPromises()

    expect(target.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
  })

  it('减少动态效果时活动项使用即时滚动', async () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
    } as MediaQueryList)
    const wrapper = mount(TextbookVolumeNavigation, {
      props: {
        textbooks,
        activeTextbookId: 'grade-7-up',
      },
    })
    const target = wrapper.get(
      '[data-textbook-id="grade-7-down"]',
    ).element

    await wrapper.setProps({ activeTextbookId: 'grade-7-down' })
    await flushPromises()

    expect(target.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'nearest',
      inline: 'nearest',
    })
  })
})

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import EntityCard from './EntityCard.vue'

describe('EntityCard', () => {
  it('渲染 title / subtitle / summary', () => {
    const wrapper = mount(EntityCard, {
      props: {
        title: '鸦片战争',
        subtitle: '1840年',
        summary: '中国近代史的开端',
      },
    })

    expect(wrapper.get('h3').text()).toBe('鸦片战争')
    expect(wrapper.get('.subtitle').text()).toBe('1840年')
    expect(wrapper.text()).toContain('中国近代史的开端')
  })

  it('不传 subtitle 时不渲染 .subtitle 元素', () => {
    const wrapper = mount(EntityCard, {
      props: {
        title: '辛亥革命',
        summary: '推翻帝制',
      },
    })

    expect(wrapper.find('.subtitle').exists()).toBe(false)
    expect(wrapper.get('h3').text()).toBe('辛亥革命')
  })

  it('不传 summary 时不渲染 summary 段落', () => {
    const wrapper = mount(EntityCard, {
      props: {
        title: '洋务运动',
        subtitle: '1861年',
      },
    })

    expect(wrapper.find('.subtitle').exists()).toBe(true)
    // 模板里 summary 用 v-if，没有传时只剩 subtitle 与 h3，没有额外的 p
    const paragraphs = wrapper.findAll('article > p')
    // 只剩 subtitle 一个 p
    expect(paragraphs).toHaveLength(1)
    expect(paragraphs[0].classes()).toContain('subtitle')
  })
})

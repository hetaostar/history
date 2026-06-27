import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StudyRevealCard from './StudyRevealCard.vue'

describe('StudyRevealCard', () => {
  it('places the supplied hint beside the face label', () => {
    const wrapper = mount(StudyRevealCard, {
      props: {
        prompt: '前221年',
        answer: '前221年',
        hint: '秦统一六国',
      },
    })

    const header = wrapper.get('.flip-face-front .face-heading')

    expect(header.get('.face-label').text()).toBe('正面')
    expect(header.get('.face-hint').text()).toBe('秦统一六国')
    expect(wrapper.get('.flip-face-front > .flip-hint').text()).toBe(
      '点击卡片查看反面',
    )
  })

  it('hides answer before reveal and emits result after reveal', async () => {
    const wrapper = mount(StudyRevealCard, {
      props: {
        prompt: '秦统一六国是哪一年？',
        answer: '前221年',
      },
    })

    expect(wrapper.text()).not.toContain('前221年')
    await wrapper.get('[data-test="reveal"]').trigger('click')
    expect(wrapper.text()).toContain('前221年')
    await wrapper.get('[data-test="remembered"]').trigger('click')
    expect(wrapper.emitted('mark')?.[0]).toEqual(['remembered'])
  })

  it('can hide the answer again after reveal', async () => {
    const wrapper = mount(StudyRevealCard, {
      props: {
        prompt: '秦统一六国是哪一年？',
        answer: '前221年',
      },
    })

    await wrapper.get('[data-test="reveal"]').trigger('click')
    expect(wrapper.text()).toContain('前221年')

    await wrapper.get('[data-test="hide"]').trigger('click')
    expect(wrapper.text()).not.toContain('前221年')
  })
})

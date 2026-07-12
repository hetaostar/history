import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { getTextbookLessons, getTextbookUnits } from '@/domain/textbookSelectors'
import TextbookUnitList from './TextbookUnitList.vue'

describe('TextbookUnitList', () => {
  it('单元摘要默认收起并提供明确的键盘操作名称', async () => {
    const wrapper = mount(TextbookUnitList, {
      attachTo: document.body,
      props: {
        textbookId: 'grade-7-up',
        units: getTextbookUnits('grade-7-up'),
        lessons: getTextbookLessons('grade-7-up'),
      },
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })

    const firstDetails = wrapper.get('details')
    const firstSummary = firstDetails.get('summary')
    expect(firstDetails.element.tagName).toBe('DETAILS')
    expect(firstSummary.element.tagName).toBe('SUMMARY')
    expect(firstSummary.attributes('role')).toBeUndefined()
    expect(firstSummary.attributes('tabindex')).toBeUndefined()
    ;(firstSummary.element as HTMLElement).focus()
    expect(document.activeElement).toBe(firstSummary.element)
    expect(firstDetails.attributes()).not.toHaveProperty('open')
    expect(firstSummary.attributes('aria-label')).toBe(
      '展开第 1 单元课程：史前时期：原始社会与中华文明的起源',
    )

    ;(firstDetails.element as HTMLDetailsElement).open = true
    await firstDetails.trigger('toggle')
    expect(firstSummary.attributes('aria-label')).toBe(
      '收起第 1 单元课程：史前时期：原始社会与中华文明的起源',
    )
    wrapper.unmount()
  })

  it('将交错课程正确归入多个单元并保持顺序且不重复', () => {
    const units = [
      {
        id: 'unit-one',
        textbookId: 'test-book',
        title: '第一单元',
        summary: '第一单元摘要',
        order: 1,
      },
      {
        id: 'unit-two',
        textbookId: 'test-book',
        title: '第二单元',
        summary: '第二单元摘要',
        order: 2,
      },
    ] as const
    const lessons = [
      {
        id: 'lesson-one',
        unitId: 'unit-one',
        lessonNumber: 1,
        title: '第一课',
        summary: '第一课摘要',
        personIds: [],
        eventIds: [],
      },
      {
        id: 'lesson-three',
        unitId: 'unit-two',
        lessonNumber: 3,
        title: '第三课',
        summary: '第三课摘要',
        personIds: [],
        eventIds: [],
      },
      {
        id: 'lesson-two',
        unitId: 'unit-one',
        lessonNumber: 2,
        title: '第二课',
        summary: '第二课摘要',
        personIds: [],
        eventIds: [],
      },
      {
        id: 'lesson-four',
        unitId: 'unit-two',
        lessonNumber: 4,
        title: '第四课',
        summary: '第四课摘要',
        personIds: [],
        eventIds: [],
      },
    ] as const
    const wrapper = mount(TextbookUnitList, {
      props: {
        textbookId: 'test-book',
        units,
        lessons,
      },
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })
    const renderedUnits = wrapper.findAll('.textbook-unit')
    const firstUnitLinks = renderedUnits[0]
      .findAll('.textbook-lesson-link')
      .map((link) => link.attributes('href'))
    const secondUnitLinks = renderedUnits[1]
      .findAll('.textbook-lesson-link')
      .map((link) => link.attributes('href'))
    const allLinks = [...firstUnitLinks, ...secondUnitLinks]

    expect(firstUnitLinks).toEqual([
      '/textbooks/test-book/lessons/lesson-one',
      '/textbooks/test-book/lessons/lesson-two',
    ])
    expect(secondUnitLinks).toEqual([
      '/textbooks/test-book/lessons/lesson-three',
      '/textbooks/test-book/lessons/lesson-four',
    ])
    expect(new Set(allLinks).size).toBe(4)
    expect(allLinks).toHaveLength(4)
  })
})

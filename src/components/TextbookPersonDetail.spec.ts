import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { TEXTBOOKS } from '@/data/textbooks'
import { createTextbookPeople } from '@/data/textbooks/createTextbookPeople'
import { getTextbookPersonById } from '@/domain/textbookSelectors'
import type {
  ITextbookLesson,
  ITextbookUnit,
} from '@/domain/textbookTypes'
import TextbookPersonDetail from './TextbookPersonDetail.vue'

const person = getTextbookPersonById('g7u-yuanmou-man')!
type TextbookPersonDetailProps = InstanceType<
  typeof TextbookPersonDetail
>['$props']

function mountDetail(props: TextbookPersonDetailProps = { person }) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/textbooks/:textbookId/lessons/:lessonId', component: {} },
      { path: '/events', component: {} },
    ],
  })
  return mount(TextbookPersonDetail, {
    attachTo: document.body,
    props,
    global: { plugins: [router] },
  })
}

enableAutoUnmount(afterEach)

describe('TextbookPersonDetail', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  it('显示只读人物资料、所属教材和具体课程链接', () => {
    const wrapper = mountDetail()

    expect(wrapper.get('h2').text()).toBe(person.name)
    expect(wrapper.text()).toContain(person.lifeTime)
    expect(wrapper.text()).toContain(person.summary)
    expect(wrapper.get('[data-test="person-textbook-grade-7-up"]').text()).toContain(
      '七年级上册',
    )
    const lessonLink = wrapper.get(
      '[data-test="person-lesson-grade-7-up-g7u-lesson-01"]',
    )
    expect(lessonLink.text()).toContain('远古时期的人类活动')
    expect(lessonLink.attributes('href')).toBe(
      '/textbooks/grade-7-up/lessons/g7u-lesson-01',
    )
  })

  it('只读展示人物对应的教材事件并链接到事件详情', () => {
    const confucius = getTextbookPersonById('g7u-confucius')!
    const wrapper = mountDetail({ person: confucius })
    const eventLink = wrapper.get('[data-test="person-event-china-event-0012"]')

    expect(wrapper.text()).toContain('关联事件')
    expect(eventLink.text()).toContain('孔子诞生')
    expect(eventLink.attributes('href')).toBe('/events?event=china-event-0012')
    expect(wrapper.text()).not.toContain('新增相关事件')
    expect(wrapper.text()).not.toContain('保存相关事件')
  })

  it('跨册人物展示全部所属教材及每册各自的课程', () => {
    const [sharedPerson] = createTextbookPeople(
      [['shared-person', '跨册人物', '测试时期', '用于验证多册详情。']],
      ['grade-7-up', 'grade-7-down'],
    )
    const units = [
      {
        id: 'synthetic-up-unit',
        textbookId: 'grade-7-up',
        title: '上册单元',
        summary: '',
        order: 1,
      },
      {
        id: 'synthetic-down-unit',
        textbookId: 'grade-7-down',
        title: '下册单元',
        summary: '',
        order: 1,
      },
    ] satisfies readonly ITextbookUnit[]
    const lessons = [
      {
        id: 'synthetic-up-lesson',
        unitId: 'synthetic-up-unit',
        lessonNumber: 1,
        title: '上册关联课程',
        summary: '',
        personIds: ['shared-person'],
        eventIds: [],
      },
      {
        id: 'synthetic-down-lesson',
        unitId: 'synthetic-down-unit',
        lessonNumber: 2,
        title: '下册关联课程',
        summary: '',
        personIds: ['shared-person'],
        eventIds: [],
      },
    ] satisfies readonly ITextbookLesson[]

    const wrapper = mountDetail({
      person: sharedPerson,
      textbooks: TEXTBOOKS,
      units,
      lessons,
    })

    const upGroup = wrapper.get('[data-test="person-textbook-grade-7-up"]')
    const downGroup = wrapper.get('[data-test="person-textbook-grade-7-down"]')
    expect(upGroup.text()).toContain('七年级上册')
    expect(upGroup.text()).toContain('上册关联课程')
    expect(upGroup.text()).not.toContain('下册关联课程')
    expect(downGroup.text()).toContain('七年级下册')
    expect(downGroup.text()).toContain('下册关联课程')
    expect(downGroup.text()).not.toContain('上册关联课程')
    expect(
      upGroup.get('[data-test="person-lesson-grade-7-up-synthetic-up-lesson"]')
        .attributes('href'),
    ).toBe('/textbooks/grade-7-up/lessons/synthetic-up-lesson')
    expect(
      downGroup
        .get(
          '[data-test="person-lesson-grade-7-down-synthetic-down-lesson"]',
        )
        .attributes('href'),
    ).toBe('/textbooks/grade-7-down/lessons/synthetic-down-lesson')
  })

  it('提供可访问对话框语义并支持按钮、遮罩与 ESC 关闭', async () => {
    const wrapper = mountDetail()
    const dialog = wrapper.get('[role="dialog"]')
    const title = wrapper.get('h2')

    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.attributes('aria-labelledby')).toBe(title.attributes('id'))
    expect(wrapper.get('[data-test="close"]').attributes('aria-label')).toBe(
      '关闭人物详情',
    )

    await wrapper.get('[data-test="close"]').trigger('click')
    await wrapper.get('[data-test="person-detail-overlay"]').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('close')).toHaveLength(3)
  })
})

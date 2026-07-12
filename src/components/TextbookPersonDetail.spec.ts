import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { ITextbookPeopleGroup } from '@/domain/textbookPeopleCatalog'
import type {
  ITextbook,
  ITextbookLesson,
  ITextbookPerson,
} from '@/domain/textbookTypes'
import TextbookPersonDetail from './TextbookPersonDetail.vue'

const person: ITextbookPerson = {
  id: 'shared-person',
  name: '跨册人物',
  lifeTime: '测试时期',
  summary: '用于验证跨册详情。',
  textbookIds: ['book-a', 'book-b'],
  historyPeriodId: 'han',
}

function createTextbook(
  id: string,
  title: string,
  order: number,
): ITextbook {
  return {
    id,
    title,
    shortTitle: title,
    grade: 7,
    semester: order === 1 ? 'up' : 'down',
    edition: '测试版',
    revisionYear: 2024,
    status: 'published',
    summary: '',
    order,
  }
}

function createLesson(
  id: string,
  unitId: string,
  lessonNumber: number,
  title: string,
): ITextbookLesson {
  return {
    id,
    unitId,
    lessonNumber,
    title,
    summary: '',
    personIds: [person.id],
    eventIds: [],
  }
}

const groups: readonly ITextbookPeopleGroup[] = [
  {
    textbook: createTextbook('book-a', '第一册', 1),
    entries: [
      {
        person,
        lessons: [
          createLesson('lesson-a-1', 'unit-a', 1, '第一册第一课'),
          createLesson('lesson-a-2', 'unit-a', 2, '第一册第二课'),
        ],
      },
    ],
  },
  {
    textbook: createTextbook('book-b', '第二册', 2),
    entries: [
      {
        person,
        lessons: [createLesson('lesson-b-1', 'unit-b', 1, '第二册第一课')],
      },
    ],
  },
]

async function mountDetail() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: { template: '<div />' },
      },
      {
        path: '/textbooks/:textbookId/lessons/:lessonId',
        component: { template: '<div />' },
      },
    ],
  })
  await router.push('/')
  await router.isReady()

  return mount(TextbookPersonDetail, {
    attachTo: document.body,
    props: {
      person,
      groups,
    },
    global: { plugins: [router] },
  })
}

enableAutoUnmount(afterEach)

describe('TextbookPersonDetail', () => {
  it('明确声明当前页详情使用抽屉布局', async () => {
    const wrapper = await mountDetail()
    const dialog = wrapper.get('[role="dialog"]')

    expect(dialog.attributes('data-layout')).toBe('drawer')
    expect(
      wrapper.find('[data-test="textbook-person-detail-drawer"]').exists(),
    ).toBe(true)
  })

  it('渲染可访问模态框和人物基础信息', async () => {
    const wrapper = await mountDetail()

    expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(wrapper.get('h2').text()).toBe(person.name)
    expect(wrapper.text()).toContain(person.lifeTime)
    expect(wrapper.text()).toContain(person.summary)
  })

  it('按所属教材隔离展示跨册课程', async () => {
    const wrapper = await mountDetail()
    const sections = wrapper.findAll('[data-test^="person-textbook-"]')

    expect(sections).toHaveLength(2)
    expect(sections[0].text()).toContain('第一册')
    expect(sections[0].text()).toContain('第一册第一课')
    expect(sections[0].text()).toContain('第一册第二课')
    expect(sections[0].text()).not.toContain('第二册第一课')
    expect(sections[1].text()).toContain('第二册')
    expect(sections[1].text()).toContain('第二册第一课')
    expect(sections[1].text()).not.toContain('第一册第一课')
  })

  it('课程链接指向对应教材课程详情', async () => {
    const wrapper = await mountDetail()

    expect(
      wrapper
        .get('[data-test="person-lesson-lesson-b-1"]')
        .attributes('href'),
    ).toBe('/textbooks/book-b/lessons/lesson-b-1')
  })

  it('点击关闭按钮和按 Escape 都发出关闭事件', async () => {
    const wrapper = await mountDetail()

    await wrapper.get('[data-test="close-person-detail"]').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()

    expect(wrapper.emitted('close')).toEqual([[], []])
  })
})

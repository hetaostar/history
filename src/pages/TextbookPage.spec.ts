import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  getTextbookEvents,
  getTextbookLessons,
  getTextbookPeople,
  getTextbookUnits,
} from '@/domain/textbookSelectors'
import TextbookPage from './TextbookPage.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      {
        path: '/textbooks/:textbookId',
        component: TextbookPage,
      },
      {
        path: '/textbooks/:textbookId/lessons/:lessonId',
        component: { template: '<div />' },
      },
    ],
  })
}

async function mountPage(path: string) {
  const router = createTestRouter()
  await router.push(path)
  await router.isReady()
  return mount(TextbookPage, {
    attachTo: document.body,
    global: { plugins: [router, createPinia()] },
  })
}

beforeEach(() => {
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  setActivePinia(createPinia())
})

describe('TextbookPage', () => {
  it('作为 App 主内容内的 section 渲染而不嵌套 main', async () => {
    const wrapper = await mountPage('/textbooks/grade-7-up')

    expect(wrapper.element.tagName).toBe('SECTION')
    expect(wrapper.find('main').exists()).toBe(false)
    expect(wrapper.attributes('aria-label')).toBe('教材学习')
  })

  it('汇总已出版教材并展示人物、事件和全部单元', async () => {
    const wrapper = await mountPage('/textbooks/grade-7-up')
    const learning = wrapper.get('[data-test="textbook-learning"]')
    const sectionOrder = learning
      .findAll(':scope > .learning-section, :scope > [data-test="textbook-river-timeline"]')
      .map((section) => {
        if (section.attributes('data-test') === 'textbook-river-timeline') {
          return 'river'
        }
        return section.get('h2').text()
      })

    expect(wrapper.get('h1').text()).toBe('七年级上册')
    expect(wrapper.text()).toContain(
      `${getTextbookPeople('grade-7-up').length} 人物`,
    )
    expect(wrapper.text()).toContain(
      `${getTextbookEvents('grade-7-up').length} 事件`,
    )
    expect(wrapper.text()).toContain(
      `${getTextbookUnits('grade-7-up').length} 单元`,
    )
    expect(wrapper.text()).toContain(
      `${getTextbookLessons('grade-7-up').length} 课程`,
    )
    expect(wrapper.get('[data-test="textbook-people"]').text()).toContain('孔子')
    expect(wrapper.get('[data-test="textbook-events"]').text()).toContain(
      '夏朝建立',
    )
    expect(wrapper.findAll('.textbook-unit')).toHaveLength(4)
    expect(sectionOrder).toEqual([
      '全部单元',
      '本册人物',
      '本册事件',
      'river',
    ])
    expect(wrapper.text()).toContain('本册历史长河')
    expect(
      wrapper.find('[data-test="textbook-river-timeline"]').exists(),
    ).toBe(true)
    expect(
      wrapper.get('[data-test="textbook-learning"]').element.lastElementChild,
    ).toBe(wrapper.get('[data-test="textbook-river-timeline"]').element)
  })

  it.each([
    {
      textbookId: 'grade-7-up',
      personId: 'g7u-confucius',
      personName: '孔子',
      personLesson: '百家争鸣',
      eventId: 'china-event-0001',
      eventTitle: '夏朝建立',
      eventLesson: '夏商周的更替',
    },
    {
      textbookId: 'grade-7-down',
      personId: 'g7d-li-shimin',
      personName: '唐太宗',
      personLesson: '从“贞观之治”到“开元盛世”',
      eventId: 'china-event-0067',
      eventTitle: '隋灭陈/统一全国',
      eventLesson: '隋朝的统一与灭亡',
    },
  ])(
    '$textbookId 点击人物和事件卡片后弹层展示关联课程',
    async ({
      textbookId,
      personId,
      personName,
      personLesson,
      eventId,
      eventTitle,
      eventLesson,
    }) => {
      const wrapper = await mountPage(`/textbooks/${textbookId}`)
      const personCard = wrapper.get(
        `[data-test="textbook-person-card-${personId}"]`,
      )
      const eventCard = wrapper.get(
        `[data-test="textbook-event-card-${eventId}"]`,
      )

      expect(personCard.text()).toContain(personName)
      expect(personCard.text()).not.toContain(personLesson)
      expect(eventCard.text()).toContain(eventTitle)
      expect(eventCard.text()).not.toContain(eventLesson)
      expect(wrapper.find('[data-test="textbook-person-detail"]').exists()).toBe(
        false,
      )
      expect(wrapper.find('[data-test="event-detail-overlay"]').exists()).toBe(
        false,
      )

      await personCard.trigger('click')
      await flushPromises()

      const personDetail = wrapper.get('[data-test="textbook-person-detail"]')
      expect(personDetail.text()).toContain(personName)
      expect(personDetail.text()).toContain(personLesson)

      await wrapper.get('[data-test="close-person-detail"]').trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-test="textbook-person-detail"]').exists()).toBe(
        false,
      )

      await eventCard.trigger('click')
      await flushPromises()

      const eventDetail = wrapper.get('[data-test="event-detail-overlay"]')
      expect(eventDetail.text()).toContain(eventTitle)
      expect(eventDetail.text()).toContain(eventLesson)
      expect(wrapper.find('[data-test="study-status"]').exists()).toBe(false)
    },
  )

  it('单元可展开课程并提供课程详情链接', async () => {
    const wrapper = await mountPage('/textbooks/grade-7-up')
    const firstUnit = wrapper.findAll('.textbook-unit')[0]

    expect(firstUnit.get('details').attributes()).not.toHaveProperty('open')
    await firstUnit.get('summary').trigger('click')

    const lessonLinks = firstUnit.findAll('.textbook-lesson-link')
    expect(lessonLinks).toHaveLength(3)
    expect(lessonLinks[0].attributes('href')).toBe(
      '/textbooks/grade-7-up/lessons/g7u-lesson-01',
    )
  })

  it.each([
    {
      textbookId: 'grade-7-up',
      lessonIdPrefix: 'g7u',
      lessonCount: 21,
    },
    {
      textbookId: 'grade-7-down',
      lessonIdPrefix: 'g7d',
      lessonCount: 22,
    },
  ])(
    '$textbookId 全部单元展开后按目录展示 $lessonCount 课',
    async ({ textbookId, lessonIdPrefix, lessonCount }) => {
      const wrapper = await mountPage(`/textbooks/${textbookId}`)

      for (const summary of wrapper.findAll('.textbook-unit summary')) {
        await summary.trigger('click')
      }

      const lessonLinks = wrapper.findAll('.textbook-lesson-link')
      expect(lessonLinks).toHaveLength(lessonCount)
      expect(lessonLinks.map((link) => link.attributes('href'))).toEqual(
        Array.from({ length: lessonCount }, (_, index) => {
          const lessonNumber = String(index + 1).padStart(2, '0')
          return `/textbooks/${textbookId}/lessons/${lessonIdPrefix}-lesson-${lessonNumber}`
        }),
      )
    },
  )

  it('待出版教材只显示状态和返回切换入口', async () => {
    const wrapper = await mountPage('/textbooks/grade-8-up')

    expect(wrapper.get('[role="status"]').text()).toContain('待出版')
    expect(wrapper.get('[data-test="textbook-switcher"]')).toBeTruthy()
    expect(wrapper.get('a[href="/"]').text()).toContain('返回主页')
    expect(wrapper.find('[data-test="textbook-learning"]').exists()).toBe(false)
    expect(
      wrapper.find('[data-test="textbook-river-timeline"]').exists(),
    ).toBe(false)
  })

  it('快速切换仅为已出版教材提供链接并禁用待出版教材', async () => {
    const wrapper = await mountPage('/textbooks/grade-7-up')
    const switcher = wrapper.get('[data-test="textbook-switcher"]')

    expect(switcher.findAll('a').map((link) => link.attributes('href'))).toEqual([
      '/textbooks/grade-7-up',
      '/textbooks/grade-7-down',
    ])
    const disabledItems = switcher.findAll('[aria-disabled="true"]')
    expect(disabledItems).toHaveLength(4)
    expect(disabledItems.every((item) => item.find('a').exists() === false)).toBe(
      true,
    )
  })

  it('未知教材显示不存在状态和返回入口', async () => {
    const wrapper = await mountPage('/textbooks/not-a-textbook')

    expect(wrapper.get('[role="alert"]').text()).toContain('教材不存在')
    expect(wrapper.get('a[href="/"]').text()).toContain('返回主页')
    expect(wrapper.find('[data-test="textbook-learning"]').exists()).toBe(false)
    expect(
      wrapper.find('[data-test="textbook-river-timeline"]').exists(),
    ).toBe(false)
  })

  it('同一实例切换 textbookId 时同步更新聚合内容并关闭弹层', async () => {
    const router = createTestRouter()
    await router.push('/textbooks/grade-7-up')
    await router.isReady()
    const wrapper = mount(TextbookPage, {
      attachTo: document.body,
      global: { plugins: [router, createPinia()] },
    })

    expect(wrapper.get('h1').text()).toBe('七年级上册')
    expect(wrapper.findAll('.textbook-unit')).toHaveLength(4)
    expect(wrapper.get('[data-test="textbook-people"]').text()).toContain('孔子')

    await wrapper
      .get('[data-test="textbook-person-card-g7u-confucius"]')
      .trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-test="textbook-person-detail"]').text()).toContain(
      '百家争鸣',
    )

    await router.push('/textbooks/grade-7-down')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('h1').text()).toBe('七年级下册')
    expect(wrapper.findAll('.textbook-unit')).toHaveLength(3)
    expect(wrapper.get('[data-test="textbook-people"]').text()).toContain(
      '唐太宗',
    )
    expect(wrapper.get('[data-test="textbook-events"]').text()).toContain(
      '隋灭陈/统一全国',
    )
    expect(wrapper.find('[data-test="textbook-person-detail"]').exists()).toBe(
      false,
    )
    expect(
      wrapper
        .get('[data-test="textbook-person-card-g7d-li-shimin"]')
        .text(),
    ).toContain('唐太宗')

    await router.push('/textbooks/grade-8-up')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role="status"]').text()).toContain('待出版')
    expect(wrapper.find('[data-test="textbook-learning"]').exists()).toBe(false)

    await router.push('/textbooks/unknown')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role="alert"]').text()).toContain('教材不存在')
  })
})

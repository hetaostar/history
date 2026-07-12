import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { TEXTBOOKS } from '@/data/textbooks'
import { createTextbookPeople } from '@/data/textbooks/createTextbookPeople'
import {
  getAllTextbookPeople,
  getTextbookPeople,
} from '@/domain/textbookSelectors'
import { buildPublishedTextbookPeopleCatalog } from '@/domain/textbookPeopleCatalog'
import type {
  ITextbookLesson,
  ITextbookUnit,
} from '@/domain/textbookTypes'
import PersonListPage from './PersonListPage.vue'

async function mountPage(path = '/people') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/people', component: PersonListPage },
      {
        path: '/textbooks/:textbookId/lessons/:lessonId',
        component: { template: '<div />' },
      },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(PersonListPage, {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  await flushPromises()
  return { router, wrapper }
}

const publishedTextbooks = TEXTBOOKS.filter(
  (textbook) => textbook.status === 'published',
)

enableAutoUnmount(afterEach)

describe('PersonListPage', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('显示 85 个唯一教材人物并按已发布册次分组', async () => {
    const { wrapper } = await mountPage()
    const uniqueCount = new Set(getAllTextbookPeople().map(({ id }) => id)).size

    expect(uniqueCount).toBe(85)
    expect(wrapper.text()).toContain('内置 · 只读 · 85 个人物')
    const sections = wrapper.findAll('[data-test^="textbook-section-"]')
    expect(sections).toHaveLength(2)
    expect(sections.map((section) => section.get('h3').text())).toEqual(
      publishedTextbooks.map(({ title }) => title),
    )
    publishedTextbooks.forEach((textbook) => {
      expect(
        wrapper.get(`[data-test="textbook-section-${textbook.id}"]`).text(),
      ).toContain(`${getTextbookPeople(textbook.id).length} 人`)
    })
  })

  it('跨册人物在每册重复展示但目录总数按 ID 去重', () => {
    const sharedPeople = createTextbookPeople(
      [['shared-person', '跨册人物', '测试时期', '验证跨册目录。']],
      ['grade-7-up', 'grade-7-down'],
    )
    const singleVolumePeople = createTextbookPeople(
      [['single-person', '单册人物', '测试时期', '验证单册目录。']],
      ['grade-7-up'],
    )

    const catalog = buildPublishedTextbookPeopleCatalog(
      TEXTBOOKS,
      [...sharedPeople, ...singleVolumePeople],
    )

    expect(catalog.uniquePersonCount).toBe(2)
    expect(catalog.groups).toHaveLength(2)
    expect(catalog.groups[0].people.map(({ id }) => id)).toEqual([
      'shared-person',
      'single-person',
    ])
    expect(catalog.groups[1].people.map(({ id }) => id)).toEqual([
      'shared-person',
    ])
  })

  it('唯一总数忽略仅归属待出版册次的人物', () => {
    const publishedPeople = createTextbookPeople(
      [['published-person', '已出版人物', '测试时期', '已展示。']],
      ['grade-7-up'],
    )
    const comingSoonPeople = createTextbookPeople(
      [['coming-person', '待出版人物', '测试时期', '尚未展示。']],
      ['grade-8-up'],
    )

    const catalog = buildPublishedTextbookPeopleCatalog(
      TEXTBOOKS,
      [...publishedPeople, ...comingSoonPeople],
    )

    expect(catalog.uniquePersonCount).toBe(1)
    expect(
      catalog.groups.flatMap(({ people }) => people.map(({ id }) => id)),
    ).toEqual(['published-person'])
  })

  it('目录构建时按册隔离并排序每个人物的关联课程', () => {
    const [sharedPerson] = createTextbookPeople(
      [['shared-person', '跨册人物', '测试时期', '验证课程预计算。']],
      ['grade-7-up', 'grade-7-down'],
    )
    const units = [
      {
        id: 'up-unit',
        textbookId: 'grade-7-up',
        title: '上册单元',
        summary: '',
        order: 1,
      },
      {
        id: 'down-unit',
        textbookId: 'grade-7-down',
        title: '下册单元',
        summary: '',
        order: 1,
      },
    ] satisfies readonly ITextbookUnit[]
    const lessons = [
      {
        id: 'up-lesson-2',
        unitId: 'up-unit',
        lessonNumber: 2,
        title: '上册第二课',
        summary: '',
        personIds: ['shared-person'],
        eventIds: [],
      },
      {
        id: 'down-lesson',
        unitId: 'down-unit',
        lessonNumber: 1,
        title: '下册第一课',
        summary: '',
        personIds: ['shared-person'],
        eventIds: [],
      },
      {
        id: 'up-lesson-1',
        unitId: 'up-unit',
        lessonNumber: 1,
        title: '上册第一课',
        summary: '',
        personIds: ['shared-person'],
        eventIds: [],
      },
    ] satisfies readonly ITextbookLesson[]

    const catalog = buildPublishedTextbookPeopleCatalog(
      TEXTBOOKS,
      [sharedPerson],
      units,
      lessons,
    )

    expect(
      catalog.groups[0].entries[0].lessons.map(({ id }) => id),
    ).toEqual(['up-lesson-1', 'up-lesson-2'])
    expect(
      catalog.groups[1].entries[0].lessons.map(({ id }) => id),
    ).toEqual(['down-lesson'])
  })

  it('人物卡片展示年代、摘要和该册关联课程链接', async () => {
    const { wrapper } = await mountPage()
    const card = wrapper.get(
      '[data-test="textbook-person-grade-7-up-g7u-yuanmou-man"]',
    )
    const lesson = card.get(
      '[data-test="person-card-lesson-grade-7-up-g7u-lesson-01"]',
    )

    expect(card.text()).toContain('元谋人')
    expect(card.text()).toContain('距今约170万年')
    expect(card.text()).toContain('中国境内已知早期人类代表之一。')
    expect(lesson.text()).toContain('远古时期的人类活动')
    expect(lesson.attributes('href')).toBe(
      '/textbooks/grade-7-up/lessons/g7u-lesson-01',
    )
    const detailTrigger = card.get(
      '[data-test="person-detail-trigger-grade-7-up-g7u-yuanmou-man"]',
    )
    expect(detailTrigger.element.tagName).toBe('BUTTON')
    expect(detailTrigger.find('a').exists()).toBe(false)
    expect(lesson.element.parentElement?.closest('button')).toBeNull()
  })

  it('只提供教材只读入口，不显示人物增删改和新增相关事件', async () => {
    const { wrapper } = await mountPage()

    expect(wrapper.text()).not.toContain('新建人物')
    expect(wrapper.text()).not.toContain('编辑人物')
    expect(wrapper.text()).not.toContain('删除')
    expect(wrapper.text()).not.toContain('新增相关事件')
  })

  it('点击人物写入 query 并显示详情，课程链接不触发人物详情', async () => {
    const { router, wrapper } = await mountPage(
      '/people?view=archive#textbook-grade-7-up',
    )

    await wrapper
      .get('[data-test="person-card-lesson-grade-7-up-g7u-lesson-01"]')
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.person).toBeUndefined()

    await router.push('/people?view=archive#textbook-grade-7-up')
    await wrapper
      .get(
        '[data-test="person-detail-trigger-grade-7-up-g7u-yuanmou-man"]',
      )
      .trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({
      view: 'archive',
      person: 'g7u-yuanmou-man',
    })
    expect(router.currentRoute.value.hash).toBe('#textbook-grade-7-up')
    expect(wrapper.get('[data-test="person-detail-overlay"]').text()).toContain(
      '元谋人',
    )
  })

  it('课程链接按 Enter 时不会打开人物详情', async () => {
    const { router, wrapper } = await mountPage('/people?view=archive')
    const lessonLink = wrapper.get(
      '[data-test="person-card-lesson-grade-7-up-g7u-lesson-01"]',
    )

    await lessonLink.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ view: 'archive' })
    expect(wrapper.find('[data-test="person-detail-overlay"]').exists()).toBe(
      false,
    )
  })

  it('关闭详情只移除 person query 并保留其他 query 和 hash', async () => {
    const { router, wrapper } = await mountPage(
      '/people?view=archive&person=g7u-yuanmou-man#textbook-grade-7-up',
    )

    await wrapper.get('[data-test="close"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ view: 'archive' })
    expect(router.currentRoute.value.hash).toBe('#textbook-grade-7-up')
    expect(wrapper.find('[data-test="person-detail-overlay"]').exists()).toBe(
      false,
    )
  })

  it('无效 person query 安全回落到人物列表', async () => {
    const { wrapper } = await mountPage('/people?person=missing')

    expect(wrapper.find('[data-test="person-detail-overlay"]').exists()).toBe(
      false,
    )
    expect(wrapper.get('h1').text()).toBe('人物')
  })

  it('点击册次导航更新 hash 并滚动到对应分组', async () => {
    const { router, wrapper } = await mountPage()
    const section = wrapper.get('[data-test="textbook-section-grade-7-down"]')

    await wrapper
      .get('[data-test="textbook-navigation-grade-7-down"]')
      .trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.hash).toBe('#textbook-grade-7-down')
    expect(section.element.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
  })

  it('滚动越过阅读线后同步更新活动册次', async () => {
    const { wrapper } = await mountPage()
    const upSection = wrapper.get('[data-test="textbook-section-grade-7-up"]')
    const downSection = wrapper.get(
      '[data-test="textbook-section-grade-7-down"]',
    )
    upSection.element.getBoundingClientRect = () =>
      ({ top: -320 }) as DOMRect
    downSection.element.getBoundingClientRect = () => ({ top: 80 }) as DOMRect

    window.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()

    expect(
      wrapper
        .get('[data-test="textbook-navigation-grade-7-down"]')
        .attributes('aria-current'),
    ).toBe('location')
    expect(
      wrapper
        .get('[data-test="textbook-navigation-grade-7-up"]')
        .attributes('aria-current'),
    ).toBeUndefined()
  })

  it('首次进入 hash 定位分组并读取页头高度', async () => {
    const appHeader = document.createElement('header')
    appHeader.className = 'app-header'
    appHeader.getBoundingClientRect = () => ({ height: 124 }) as DOMRect
    document.body.appendChild(appHeader)

    const { wrapper } = await mountPage('/people#textbook-grade-7-down')

    expect(
      wrapper.get('[data-test="textbook-section-grade-7-down"]').element
        .scrollIntoView,
    ).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
    expect(wrapper.get('.person-page').attributes('style')).toContain(
      '--app-header-height: 124px',
    )
  })

  it('减少动态效果时导航滚动改用 auto', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }))
    const { wrapper } = await mountPage()
    const section = wrapper.get('[data-test="textbook-section-grade-7-down"]')

    await wrapper
      .get('[data-test="textbook-navigation-grade-7-down"]')
      .trigger('click')
    await flushPromises()

    expect(section.element.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    })
  })
})

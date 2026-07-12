import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { TEXTBOOK_LESSONS, TEXTBOOK_PEOPLE } from '@/data/textbooks'
import { PERSON_HISTORY_PERIODS } from '@/domain/personHistoryPeriods'
import PersonListPage from './PersonListPage.vue'

async function mountPage(path = '/people') {
  const pinia = createPinia()
  setActivePinia(pinia)
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

  return {
    router,
    wrapper: mount(PersonListPage, {
      attachTo: document.body,
      global: { plugins: [pinia, router] },
    }),
  }
}

enableAutoUnmount(afterEach)

describe('PersonListPage', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('展示 85 位只读教材人物元信息', async () => {
    const { wrapper } = await mountPage()

    expect(TEXTBOOK_PEOPLE).toHaveLength(85)
    expect(wrapper.text()).toContain('内置 · 只读 · 85 位人物')
    expect(wrapper.findAll('[data-test^="person-card-"]')).toHaveLength(85)
  })

  it('按历史时期唯一分组并保留人物的教材课程链接', async () => {
    const { wrapper } = await mountPage()
    const sections = wrapper.findAll('[data-test^="period-section-"]')

    expect(sections).toHaveLength(PERSON_HISTORY_PERIODS.length)
    expect(sections.map((section) => section.get('h3').text())).toEqual(
      PERSON_HISTORY_PERIODS.map((period) => period.name),
    )
    expect(wrapper.findAll('[data-test^="person-card-"]')).toHaveLength(85)

    const confuciusCard = wrapper.get('[data-test="person-card-g7u-confucius"]')
    expect(confuciusCard.text()).toContain('孔子')
    expect(confuciusCard.text()).toContain('前551—前479年')
    expect(confuciusCard.text()).toContain('儒家学派创始人')
    expect(confuciusCard.text()).toContain('第7课 百家争鸣')
    expect(
      confuciusCard.get('[data-test="person-lesson-g7u-lesson-07"]').attributes(
        'href',
      ),
    ).toBe('/textbooks/grade-7-up/lessons/g7u-lesson-07')
    expect(wrapper.text()).toContain('朝代索引')
    expect(wrapper.text()).not.toContain('教材索引')
  })

  it('人物详情按钮与课程链接为兄弟交互元素', async () => {
    const { wrapper } = await mountPage()
    const card = wrapper.get('[data-test="person-card-g7u-confucius"]')
    const detailButton = card.get('[data-test="open-person-g7u-confucius"]')
    const lessonLink = card.get('[data-test="person-lesson-g7u-lesson-07"]')

    expect(detailButton.element.tagName).toBe('BUTTON')
    expect(lessonLink.element.tagName).toBe('A')
    expect(detailButton.element.contains(lessonLink.element)).toBe(false)
    expect(detailButton.element.parentElement).toBe(lessonLink.element.parentElement)
  })

  it('不显示人物增删改、批删和事件新建入口', async () => {
    const { wrapper } = await mountPage()

    expect(wrapper.text()).not.toContain('新建人物')
    expect(wrapper.text()).not.toContain('编辑人物')
    expect(wrapper.text()).not.toContain('批量删除')
    expect(wrapper.text()).not.toContain('新增相关事件')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('通过 person query 打开详情并安全处理未知人物', async () => {
    const person = TEXTBOOK_PEOPLE[0]
    const { router, wrapper } = await mountPage(
      `/people?person=${person.id}#period-prehistory-legends`,
    )

    expect(wrapper.get('[data-test="textbook-person-detail"]').text()).toContain(
      person.name,
    )

    await router.replace('/people?person=missing#period-prehistory-legends')
    await flushPromises()

    expect(wrapper.find('[data-test="textbook-person-detail"]').exists()).toBe(
      false,
    )
    expect(wrapper.get('h1').text()).toBe('教材人物')
  })

  it('点击人物按钮写入 query，关闭只移除 person 并保留其他 query/hash', async () => {
    const person = TEXTBOOK_PEOPLE[0]
    const { router, wrapper } = await mountPage(
      '/people?mode=review#period-prehistory-legends',
    )

    await wrapper.get(`[data-test="open-person-${person.id}"]`).trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({
      mode: 'review',
      person: person.id,
    })
    expect(router.currentRoute.value.hash).toBe('#period-prehistory-legends')

    await wrapper.get('[data-test="close-person-detail"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ mode: 'review' })
    expect(router.currentRoute.value.hash).toBe('#period-prehistory-legends')
  })

  it('键盘激活课程链接不会打开人物详情', async () => {
    const { router, wrapper } = await mountPage(
      '/people#period-spring-autumn',
    )
    const lesson = TEXTBOOK_LESSONS.find((item) =>
      (item.personIds as readonly string[]).includes('g7u-confucius'),
    )!

    await wrapper
      .get(`[data-test="person-lesson-${lesson.id}"]`)
      .trigger('keydown', { key: 'Enter' })
    await wrapper
      .get(`[data-test="person-lesson-${lesson.id}"]`)
      .trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).not.toHaveProperty('person')
    expect(wrapper.find('[data-test="textbook-person-detail"]').exists()).toBe(
      false,
    )
  })

  it('点击朝代导航更新 hash 并平滑滚动到对应分组', async () => {
    const { router, wrapper } = await mountPage()
    const section = wrapper.get('[data-test="period-section-tang"]')
    Object.defineProperty(section.element, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })

    await wrapper
      .get('[data-test="period-navigation-tang"]')
      .trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.hash).toBe('#period-tang')
    expect(section.element.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
    expect(section.element.scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it('运行期切换到有效 hash 时定位对应分组并更新高亮', async () => {
    const { router, wrapper } = await mountPage(
      '/people#period-prehistory-legends',
    )
    await flushPromises()
    const section = wrapper.get('[data-test="period-section-tang"]')
    Object.defineProperty(section.element, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })

    await router.replace('/people#period-tang')
    await flushPromises()

    expect(section.element.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    })
    expect(
      wrapper
        .get('[data-test="period-navigation-tang"]')
        .attributes('aria-current'),
    ).toBe('location')
  })

  it('运行期无效 hash 不改变高亮或触发滚动', async () => {
    const { router, wrapper } = await mountPage(
      '/people#period-prehistory-legends',
    )
    await flushPromises()
    const sections = wrapper.findAll<HTMLElement>(
      '[data-test^="period-section-"]',
    )
    sections.forEach((section) => {
      vi.mocked(section.element.scrollIntoView).mockClear()
    })

    await router.replace('/people#period-missing')
    await flushPromises()

    expect(
      wrapper
        .get('[data-test="period-navigation-prehistory-legends"]')
        .attributes('aria-current'),
    ).toBe('location')
    expect(
      sections.some((section) =>
        vi.mocked(section.element.scrollIntoView).mock.calls.length > 0,
      ),
    ).toBe(false)
  })

  it('减少动态效果时点击朝代导航使用即时滚动', async () => {
    vi.mocked(window.matchMedia).mockImplementation(
      (query) => ({ matches: query.includes('prefers-reduced-motion') }) as MediaQueryList,
    )

    const { wrapper } = await mountPage()
    const section = wrapper.get('[data-test="period-section-tang"]')
    Object.defineProperty(section.element, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })

    await wrapper
      .get('[data-test="period-navigation-tang"]')
      .trigger('click')
    await flushPromises()

    expect(section.element.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    })
  })

  it('滚动时按 header offset 高亮当前朝代', async () => {
    const appHeader = document.createElement('header')
    appHeader.className = 'app-header'
    appHeader.getBoundingClientRect = () => ({ height: 120 }) as DOMRect
    document.body.appendChild(appHeader)
    vi.mocked(window.matchMedia).mockImplementation(
      (query) => ({ matches: query.includes('max-width') }) as MediaQueryList,
    )
    const { wrapper } = await mountPage()
    await flushPromises()
    const sections = wrapper.findAll<HTMLElement>(
      '[data-test^="period-section-"]',
    )
    const tangIndex = PERSON_HISTORY_PERIODS.findIndex(
      (period) => period.id === 'tang',
    )
    sections.forEach((section, index) => {
      section.element.getBoundingClientRect = () =>
        ({ top: index <= tangIndex ? -100 : 300 }) as DOMRect
    })

    window.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()

    expect(
      wrapper
        .get('[data-test="period-navigation-tang"]')
        .attributes('aria-current'),
    ).toBe('location')
    expect(wrapper.get('.person-page').attributes('style')).toContain(
      '--app-header-height: 120px',
    )
  })

  it('卸载时清理 resize 和 scroll 监听', async () => {
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const { wrapper } = await mountPage()
    await flushPromises()

    wrapper.unmount()

    const resizeHandler = addEventListener.mock.calls.find(
      ([eventName]) => eventName === 'resize',
    )?.[1]
    const scrollHandler = addEventListener.mock.calls.find(
      ([eventName]) => eventName === 'scroll',
    )?.[1]
    expect(removeEventListener).toHaveBeenCalledWith('resize', resizeHandler)
    expect(removeEventListener).toHaveBeenCalledWith('scroll', scrollHandler)
  })
})

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import TextbookLessonPage from './TextbookLessonPage.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      {
        path: '/textbooks/:textbookId',
        component: { template: '<div />' },
      },
      {
        path: '/textbooks/:textbookId/lessons/:lessonId',
        component: TextbookLessonPage,
      },
    ],
  })
}

async function mountPage(path: string) {
  const router = createTestRouter()
  await router.push(path)
  await router.isReady()
  return mount(TextbookLessonPage, {
    global: { plugins: [router] },
  })
}

describe('TextbookLessonPage', () => {
  it('作为 App 主内容内的 section 渲染而不嵌套 main', async () => {
    const wrapper = await mountPage(
      '/textbooks/grade-7-up/lessons/g7u-lesson-04',
    )

    expect(wrapper.element.tagName).toBe('SECTION')
    expect(wrapper.find('main').exists()).toBe(false)
    expect(wrapper.attributes('aria-label')).toBe('教材课程详情')
  })

  it('显示课程面包屑、摘要、单元及关联人物事件', async () => {
    const wrapper = await mountPage(
      '/textbooks/grade-7-up/lessons/g7u-lesson-04',
    )

    const breadcrumb = wrapper.get('nav[aria-label="面包屑"]')
    expect(breadcrumb.text()).toContain('主页')
    expect(breadcrumb.text()).toContain('七年级上册')
    expect(breadcrumb.text()).toContain(
      '夏商周时期：奴隶制王朝的更替和向封建社会的过渡',
    )
    expect(breadcrumb.text()).toContain('夏商西周王朝的更替')
    expect(wrapper.get('h1').text()).toBe('夏商西周王朝的更替')
    expect(wrapper.text()).toContain('梳理早期王朝的建立、更替和西周制度。')
    expect(wrapper.get('[data-test="lesson-people"]').text()).toContain('禹')
    expect(wrapper.get('[data-test="lesson-events"]').text()).toContain(
      '夏朝建立',
    )
  })

  it('未知 lessonId 显示课程不存在并返回当前教材或主页', async () => {
    const wrapper = await mountPage(
      '/textbooks/grade-7-up/lessons/not-a-lesson',
    )

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toContain('课程不存在')
    expect(alert.text()).not.toContain('不属于当前教材')
    expect(wrapper.get('a[href="/textbooks/grade-7-up"]').text()).toContain(
      '返回本册',
    )
    expect(wrapper.get('a[href="/"]').text()).toContain('返回主页')
    expect(wrapper.find('[data-test="lesson-content"]').exists()).toBe(false)
  })

  it('textbookId 与 lessonId 都无效时不链接到不存在的教材', async () => {
    const wrapper = await mountPage(
      '/textbooks/not-a-textbook/lessons/not-a-lesson',
    )

    expect(wrapper.get('[role="alert"]').text()).toContain('课程不存在')
    expect(wrapper.find('a[href="/textbooks/not-a-textbook"]').exists()).toBe(
      false,
    )
    expect(wrapper.get('a[href="/"]').text()).toContain('返回主页')
  })

  it('课程存在但跨教材时明确提示并可返回正确或当前教材', async () => {
    const wrapper = await mountPage(
      '/textbooks/grade-7-down/lessons/g7u-lesson-04',
    )

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toContain('该课程不属于当前教材')
    expect(alert.text()).not.toContain('课程不存在')
    expect(wrapper.get('a[href="/textbooks/grade-7-up"]').text()).toContain(
      '前往正确教材',
    )
    expect(wrapper.get('a[href="/textbooks/grade-7-down"]').text()).toContain(
      '返回当前教材',
    )
    expect(wrapper.get('a[href="/"]').text()).toContain('返回主页')
    expect(wrapper.find('[data-test="lesson-content"]').exists()).toBe(false)
  })

  it('同一实例切换 textbookId 和 lessonId 时同步更新内容、错误与链接', async () => {
    const router = createTestRouter()
    await router.push('/textbooks/grade-7-up/lessons/g7u-lesson-04')
    await router.isReady()
    const wrapper = mount(TextbookLessonPage, {
      global: { plugins: [router] },
    })

    expect(wrapper.get('h1').text()).toBe('夏商西周王朝的更替')
    expect(wrapper.get('[data-test="lesson-people"]').text()).toContain('禹')

    await router.push('/textbooks/grade-7-down/lessons/g7d-lesson-01')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('h1').text()).toBe('隋朝统一与灭亡')
    expect(wrapper.get('[data-test="lesson-people"]').text()).toContain('隋文帝')
    expect(wrapper.get('[data-test="lesson-events"]').text()).toContain(
      '隋灭陈/统一全国',
    )

    await router.push('/textbooks/grade-7-down/lessons/not-a-lesson')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role="alert"]').text()).toContain('课程不存在')
    expect(wrapper.get('a[href="/textbooks/grade-7-down"]').text()).toContain(
      '返回本册',
    )

    await router.push('/textbooks/grade-7-down/lessons/g7u-lesson-04')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[role="alert"]').text()).toContain(
      '该课程不属于当前教材',
    )
    expect(wrapper.get('a[href="/textbooks/grade-7-up"]').text()).toContain(
      '前往正确教材',
    )
    expect(wrapper.get('a[href="/textbooks/grade-7-down"]').text()).toContain(
      '返回当前教材',
    )
  })
})

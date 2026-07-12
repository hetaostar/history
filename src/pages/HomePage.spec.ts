import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useHistoryStore } from '@/stores/historyStore'
import HomePage from './HomePage.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/people', component: { template: '<div />' } },
      { path: '/people/:personId', component: { template: '<div />' } },
      { path: '/events', component: { template: '<div />' } },
      { path: '/cards', component: { template: '<div />' } },
      { path: '/search', component: { template: '<div />' } },
      { path: '/textbooks/:textbookId', component: { template: '<div />' } },
    ],
  })
}

describe('HomePage', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('空数据时显示事件与人物的空提示', () => {
    const wrapper = mount(HomePage, {
      global: { plugins: [createPinia(), createTestRouter()] },
    })

    const emptyNotes = wrapper.findAll('.empty-note')
    expect(emptyNotes.length).toBeGreaterThanOrEqual(2)
    expect(wrapper.text()).toContain('还没有事件。先添加一个需要背诵的事件。')
    expect(wrapper.text()).not.toContain('时间线')
    expect(wrapper.text()).toContain(
      '还没有人物。把重要人物的生平、主张和关键词先归档。',
    )
  })

  it('有数据时显示最近 3 条事件和最近 3 个人物', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    for (let i = 0; i < 5; i += 1) {
      store.createEvent({
        timeLabel: `184${i}年`,
        title: `事件${i}`,
        hint: '',
        summary: `摘要${i}`,
        detail: '',
        keywords: [],
        personIds: [],
      })
    }

    for (let i = 0; i < 5; i += 1) {
      store.createPerson({
        name: `人物${i}`,
        lifeTime: `180${i}-190${i}`,
        summary: '',
        biography: '',
        achievements: '',
        keywords: [],
      })
    }

    const router = createTestRouter()
    await router.push('/')
    await router.isReady()
    const wrapper = mount(HomePage, {
      global: { plugins: [pinia, router] },
    })

    // 最近 3 条事件
    const recentEvents = wrapper.findAll('.recent-list li')
    expect(recentEvents).toHaveLength(3)

    // 最近 3 个人物
    const personChips = wrapper.findAll('.person-chip')
    expect(personChips).toHaveLength(3)
  })

  it('feature-rail 的 RouterLink 跳转目标正确', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomePage, {
      global: { plugins: [pinia, router] },
    })

    const featureCards = wrapper.findAll('.feature-card')
    expect(featureCards).toHaveLength(4)

    const hrefs = featureCards.map((card) => card.attributes('href'))
    expect(hrefs).toContain('/people')
    expect(hrefs).toContain('/events')
    expect(hrefs).toContain('/cards')
    expect(hrefs).toContain('/search')
  })

  it('在原有四项功能前展示六册教材书架并区分出版状态', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomePage, {
      global: { plugins: [pinia, router] },
    })

    const shelf = wrapper.get('[aria-labelledby="textbook-shelf-title"]')
    expect(shelf.text()).toContain('初中历史教材')
    expect(shelf.findAll('.textbook-spine')).toHaveLength(6)
    expect(
      shelf.findAll('.textbook-spine-link').map((link) => link.attributes('href')),
    ).toEqual(['/textbooks/grade-7-up', '/textbooks/grade-7-down'])
    const comingSoonSpines = shelf.findAll('.textbook-spine-coming-soon')
    expect(comingSoonSpines).toHaveLength(4)
    expect(
      comingSoonSpines.every(
        (spine) =>
          spine.attributes('aria-disabled') === 'true' &&
          spine.find('a').exists() === false,
      ),
    ).toBe(true)
    expect(shelf.text()).toContain('七上')
    expect(shelf.text()).toContain('九下')
    expect(shelf.text().match(/待出版/g)).toHaveLength(4)
    expect(wrapper.findAll('.feature-card')).toHaveLength(4)
  })
})

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  getAllTextbookEvents,
  getAllTextbookPeople,
} from '@/domain/textbookSelectors'
import { useHistoryStore } from '@/stores/historyStore'
import HomePage from './HomePage.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/people', component: { template: '<div />' } },
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

  it('使用去重后的教材人物数统计人物和全部学习材料', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    store.createCard({
      front: '秦朝建立于哪一年？',
      back: '前221年。',
      hint: '',
      keywords: [],
      personIds: [],
      eventIds: [],
    })

    const router = createTestRouter()
    await router.push('/')
    await router.isReady()
    const wrapper = mount(HomePage, {
      global: { plugins: [pinia, router] },
    })

    const peopleCard = wrapper
      .findAll('.feature-card')
      .find((card) => card.get('strong').text() === '人物')
    const eventCard = wrapper
      .findAll('.feature-card')
      .find((card) => card.get('strong').text() === '事件')
    const uniquePeopleCount = new Set(
      getAllTextbookPeople().map((person) => person.id),
    ).size
    const textbookEventCount = getAllTextbookEvents().length
    const totalItems = uniquePeopleCount + textbookEventCount + store.cards.length

    expect(peopleCard?.text()).toContain(`${uniquePeopleCount} 项`)
    expect(eventCard?.text()).toContain('112 项')
    expect(wrapper.get('.archive-slip').text()).toContain(String(totalItems))
    expect(wrapper.get('.archive-slip').text()).toContain(
      `${uniquePeopleCount} 人物`,
    )
    expect(wrapper.get('.archive-slip').text()).toContain(
      '112 事件',
    )
    expect(wrapper.text()).not.toContain('最近事件')
    expect(wrapper.text()).not.toContain('人物抽屉')
    expect(wrapper.find('.desk-layout').exists()).toBe(false)
    expect(wrapper.find('.recent-list').exists()).toBe(false)
    expect(wrapper.find('.person-strip').exists()).toBe(false)
    expect(peopleCard?.text()).toContain('浏览教材人物')
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

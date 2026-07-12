import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { getAllTextbookPeople } from '@/domain/textbookSelectors'
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

  it('按教材人物去重数与本地事件、卡片数展示首页统计', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    store.createEvent({
      timeLabel: '1840年',
      title: '本地事件',
      hint: '',
      summary: '',
      detail: '',
      keywords: [],
      personIds: [],
    })
    store.createCard({
      front: '本地卡片',
      back: '答案',
      hint: '',
      keywords: [],
      personIds: [],
      eventIds: [],
    })
    const uniquePeopleCount = new Set(
      getAllTextbookPeople().map((person) => person.id),
    ).size

    const router = createTestRouter()
    await router.push('/')
    await router.isReady()
    const wrapper = mount(HomePage, {
      global: { plugins: [pinia, router] },
    })

    const featureCards = wrapper.findAll('.feature-card')
    const peopleFeature = featureCards.find((card) =>
      card.text().includes('人物索引'),
    )
    const eventFeature = featureCards.find((card) =>
      card.text().includes('历史事件'),
    )
    const searchFeature = featureCards.find((card) =>
      card.text().includes('全库检索'),
    )
    const archiveSlip = wrapper.get('.archive-slip')

    expect(peopleFeature?.text()).toContain(`${uniquePeopleCount} 项`)
    expect(peopleFeature?.text()).toContain('浏览教材人物')
    expect(eventFeature?.text()).toContain('1 项')
    expect(searchFeature?.text()).toContain(`${uniquePeopleCount + 2} 项`)
    expect(archiveSlip.text()).toContain(`${uniquePeopleCount}`)
    expect(archiveSlip.text()).toContain(`${uniquePeopleCount} 人物`)
    expect(archiveSlip.text()).toContain('1 事件')
    expect(archiveSlip.text()).toContain('1 卡片')
  })

  it('不渲染最近事件与人物抽屉', () => {
    const wrapper = mount(HomePage, {
      global: { plugins: [createPinia(), createTestRouter()] },
    })

    expect(wrapper.text()).not.toContain('最近事件')
    expect(wrapper.text()).not.toContain('人物抽屉')
    expect(wrapper.find('.desk-layout').exists()).toBe(false)
    expect(wrapper.find('.recent-list').exists()).toBe(false)
    expect(wrapper.find('.person-strip').exists()).toBe(false)
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

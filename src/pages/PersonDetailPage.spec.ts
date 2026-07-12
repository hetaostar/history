import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import PersonDetailPage from './PersonDetailPage.vue'
import { useHistoryStore } from '@/stores/historyStore'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/people/:personId', component: PersonDetailPage },
      { path: '/events', component: { template: '<div />' } },
    ],
  })
}

describe('PersonDetailPage', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('加载不存在的 personId 显示"没有找到这位人物"', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/people/not-exist')
    await router.isReady()

    const wrapper = mount(PersonDetailPage, {
      global: { plugins: [pinia, router] },
    })

    expect(wrapper.text()).toContain('没有找到这位人物')
  })

  it('加载存在的人物显示姓名 / 生平 / 成就 / 关键词', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const person = store.createPerson({
      name: '孙中山',
      lifeTime: '1866-1925',
      summary: '革命先行者',
      biography: '出生于广东香山。',
      achievements: '推翻帝制，建立民国。',
      keywords: ['辛亥革命', '三民主义'],
    })

    const router = createTestRouter()
    await router.push(`/people/${person.id}`)
    await router.isReady()

    const wrapper = mount(PersonDetailPage, {
      global: { plugins: [pinia, router] },
    })

    expect(wrapper.get('h1').text()).toBe('孙中山')
    expect(wrapper.text()).toContain('出生于广东香山。')
    expect(wrapper.text()).toContain('推翻帝制，建立民国。')

    const tags = wrapper.findAll('.tag-list .tag')
    expect(tags).toHaveLength(2)
    expect(tags[0].text()).toBe('辛亥革命')
    expect(tags[1].text()).toBe('三民主义')
  })

  it('关联事件列表来自 store.eventsByPerson', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const person = store.createPerson({
      name: '康有为',
      lifeTime: '',
      summary: '',
      biography: '',
      achievements: '',
      keywords: [],
    })
    store.createEvent({
      timeLabel: '1898年',
      title: '戊戌变法',
      hint: '',
      summary: '',
      detail: '',
      keywords: [],
      personIds: [person.id],
    })
    store.createEvent({
      timeLabel: '1911年',
      title: '辛亥革命',
      hint: '',
      summary: '',
      detail: '',
      keywords: [],
      personIds: [],
    })

    const router = createTestRouter()
    await router.push(`/people/${person.id}`)
    await router.isReady()

    const wrapper = mount(PersonDetailPage, {
      global: { plugins: [pinia, router] },
    })

    const relatedEventButtons = wrapper.findAll('.event-card-button')
    expect(relatedEventButtons).toHaveLength(1)
    expect(relatedEventButtons[0].text()).toContain('戊戌变法')
  })

  it('新建相关事件时自动绑定当前 personId', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const person = store.createPerson({
      name: '梁启超',
      lifeTime: '',
      summary: '',
      biography: '',
      achievements: '',
      keywords: [],
    })
    const router = createTestRouter()
    await router.push(`/people/${person.id}`)
    await router.isReady()

    const wrapper = mount(PersonDetailPage, {
      global: { plugins: [pinia, router] },
    })

    await wrapper.get('input[placeholder="例如：1911年"]').setValue('1898年')
    await wrapper.get('input[placeholder="事件标题"]').setValue('戊戌变法')
    // 提交表单
    await wrapper.get('form.event-form').trigger('submit')

    const createdEvent = store.events.find(
      (event) => event.title === '戊戌变法',
    )
    expect(createdEvent).toBeDefined()
    expect(createdEvent!.personIds).toContain(person.id)
    expect(createdEvent).not.toHaveProperty('timelineId')
  })

  it('关联事件详情提供统一事件页编辑入口', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const person = store.createPerson({
      name: '光绪',
      lifeTime: '',
      summary: '',
      biography: '',
      achievements: '',
      keywords: [],
    })

    const router = createTestRouter()
    await router.push(`/people/${person.id}`)
    await router.isReady()

    const event = store.createEvent({
      timeLabel: '1898年',
      title: '戊戌变法',
      hint: '',
      summary: '',
      detail: '',
      keywords: [],
      personIds: [person.id],
    })
    const wrapper = mount(PersonDetailPage, {
      global: { plugins: [pinia, router] },
    })
    await wrapper.get('.event-card-button').trigger('click')

    expect(wrapper.get('.event-detail a').attributes('href')).toBe(
      `/events?event=${event.id}`,
    )
    expect(wrapper.text()).not.toContain('时间线')
  })
})

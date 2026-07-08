import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import PersonListPage from './PersonListPage.vue'
import { useHistoryStore } from '@/stores/historyStore'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/people/:personId', component: { template: '<div />' } },
    ],
  })
}

describe('PersonListPage', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('创建人物：未填姓名时显示错误，填写后才创建', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()

    const wrapper = mount(PersonListPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    // 打开新建表单
    const createButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('新建人物'))
    await createButton!.trigger('click')

    // 未填姓名直接提交
    const form = wrapper.get('.person-form')
    await form.trigger('submit')

    expect(wrapper.text()).toContain('请先填写人物姓名。')
    expect(store.people).toHaveLength(0)

    // 填写姓名后提交
    await wrapper.get('input[placeholder="例如：孙中山"]').setValue('孙中山')
    await form.trigger('submit')

    expect(store.people).toHaveLength(1)
    expect(store.people[0].name).toBe('孙中山')
  })

  it('编辑人物：保存后 store.people 更新', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const person = store.createPerson({
      name: '原名',
      lifeTime: '',
      summary: '',
      biography: '',
      achievements: '',
      keywords: [],
    })

    const wrapper = mount(PersonListPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    // 打开编辑表单
    await wrapper.get('[aria-label="编辑人物"]').trigger('click')

    const editForm = wrapper.get('.inline-form')
    const nameInput = editForm.findAll('input[type="text"]')[0]
    await nameInput.setValue('新名字')

    // 提交保存
    await editForm.trigger('submit')

    expect(store.people.find((p) => p.id === person.id)?.name).toBe('新名字')
  })

  it('单条删除：弹出 ConfirmActionModal，确认后人物被删', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const person = store.createPerson({
      name: '待删除',
      lifeTime: '',
      summary: '',
      biography: '',
      achievements: '',
      keywords: [],
    })

    const wrapper = mount(PersonListPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    // 打开编辑表单
    await wrapper.get('[aria-label="编辑人物"]').trigger('click')

    // 点击删除按钮
    const editForm = wrapper.get('.inline-form')
    const deleteButton = editForm
      .findAll('button')
      .find((btn) => btn.text().includes('删除'))
    await deleteButton!.trigger('click')

    // 确认弹窗出现
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

    // 点击确认
    const confirmButton = wrapper
      .findAll('[role="dialog"] button')
      .find((btn) => btn.text().includes('确认'))
    await confirmButton!.trigger('click')

    expect(store.people.find((p) => p.id === person.id)).toBeUndefined()
  })

  it('批量删除已背过：只删已背过的人物', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const rememberedPerson = store.createPerson({
      name: '已背过',
      lifeTime: '',
      summary: '',
      biography: '',
      achievements: '',
      keywords: [],
    })
    const forgottenPerson = store.createPerson({
      name: '未背过',
      lifeTime: '',
      summary: '',
      biography: '',
      achievements: '',
      keywords: [],
    })
    store.recordStudy('person', rememberedPerson.id, 'remembered')

    const wrapper = mount(PersonListPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    // 进入批量删除模式
    const batchButton = wrapper
      .findAll('.batch-actions button')
      .find((btn) => btn.text().includes('批量删除'))
    await batchButton!.trigger('click')

    // 点击"删除已背过"
    const rememberedButton = wrapper
      .findAll('.batch-actions button')
      .find((btn) => btn.text().includes('删除已背过'))
    await rememberedButton!.trigger('click')

    // 点击确认
    const confirmButton = wrapper
      .findAll('[role="dialog"] button')
      .find((btn) => btn.text().includes('确认'))
    await confirmButton!.trigger('click')

    expect(
      store.people.find((p) => p.id === rememberedPerson.id),
    ).toBeUndefined()
    expect(store.people.find((p) => p.id === forgottenPerson.id)).toBeDefined()
  })

  it('批量删除未背过：只删未背过的人物', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useHistoryStore()
    const rememberedPerson = store.createPerson({
      name: '已背过',
      lifeTime: '',
      summary: '',
      biography: '',
      achievements: '',
      keywords: [],
    })
    const forgottenPerson = store.createPerson({
      name: '未背过',
      lifeTime: '',
      summary: '',
      biography: '',
      achievements: '',
      keywords: [],
    })
    store.recordStudy('person', rememberedPerson.id, 'remembered')

    const wrapper = mount(PersonListPage, {
      global: { plugins: [pinia, createTestRouter()] },
    })

    const batchButton = wrapper
      .findAll('.batch-actions button')
      .find((btn) => btn.text().includes('批量删除'))
    await batchButton!.trigger('click')

    const forgottenButton = wrapper
      .findAll('.batch-actions button')
      .find((btn) => btn.text().includes('删除未背过'))
    await forgottenButton!.trigger('click')

    const confirmButton = wrapper
      .findAll('[role="dialog"] button')
      .find((btn) => btn.text().includes('确认'))
    await confirmButton!.trigger('click')

    expect(store.people.find((p) => p.id === rememberedPerson.id)).toBeDefined()
    expect(
      store.people.find((p) => p.id === forgottenPerson.id),
    ).toBeUndefined()
  })
})

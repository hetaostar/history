import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'

describe('App navigation', () => {
  it('显示事件和中华历史长河，并移除时间线与导入导出', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })

    const navigation = wrapper.get('nav')
    expect(navigation.text()).toContain('事件')
    expect(navigation.text()).toContain('中华历史长河')
    expect(navigation.text()).not.toContain('时间线')
    expect(navigation.text()).not.toContain('导入导出')
    expect(navigation.get('a[href="/events"]').attributes('href')).toBe(
      '/events',
    )
    expect(navigation.get('a[href="/china-river"]').attributes('href')).toBe(
      '/china-river',
    )
  })
})

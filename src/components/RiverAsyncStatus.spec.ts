import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RiverAsyncStatus from './RiverAsyncStatus.vue'

describe('RiverAsyncStatus', () => {
  it('加载期间使用状态提示', () => {
    const wrapper = mount(RiverAsyncStatus)

    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.text()).toContain('历史长河正在汇入视野')
  })

  it('异步模块失败时使用警报提示', () => {
    const wrapper = mount(RiverAsyncStatus, {
      props: { error: new Error('加载失败') },
    })

    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.classes()).toContain('river-async-status--error')
    expect(wrapper.text()).toContain('中华历史长河加载失败')
  })
})

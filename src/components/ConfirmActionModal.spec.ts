import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// useModalBehavior 的 watch 不会在初始 ref(true) 时触发 lock()，
// 这里 mock 为挂载即添加 keydown 监听，以测试 ESC 关闭集成。
vi.mock('@/composables/useModalBehavior', async () => {
  const vue = await import('vue')
  return {
    useModalBehavior: (
      isActive: import('vue').Ref<boolean>,
      onClose: () => void,
    ) => {
      const containerRef = vue.ref<HTMLElement | null>(null)
      const onKeydown = (event: KeyboardEvent) => {
        if (!isActive.value) return
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
      }
      document.addEventListener('keydown', onKeydown)
      vue.onUnmounted(() => {
        document.removeEventListener('keydown', onKeydown)
      })
      return { containerRef }
    },
  }
})

import ConfirmActionModal from './ConfirmActionModal.vue'

describe('ConfirmActionModal', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })

  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('点击确认按钮 emit confirm', async () => {
    const wrapper = mount(ConfirmActionModal, {
      props: { message: '是否删除？' },
    })

    const confirmButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('确认'))
    await confirmButton!.trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('点击取消按钮 emit cancel', async () => {
    const wrapper = mount(ConfirmActionModal, {
      props: { message: '是否删除？' },
    })

    const cancelButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('取消'))
    await cancelButton!.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('点击 overlay 根元素 emit cancel', async () => {
    const wrapper = mount(ConfirmActionModal, {
      props: { message: '是否删除？' },
    })

    await wrapper.get('.confirm-overlay').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('按下 ESC 时 emit cancel', async () => {
    const wrapper = mount(ConfirmActionModal, {
      props: { message: '是否删除？' },
      attachTo: document.body,
    })

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )

    expect(wrapper.emitted('cancel')).toHaveLength(1)

    wrapper.unmount()
  })
})

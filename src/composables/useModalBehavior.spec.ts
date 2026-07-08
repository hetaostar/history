import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useModalBehavior } from './useModalBehavior'

function mountHost(initialActive: boolean) {
  const isActive = ref(initialActive)
  const onClose = vi.fn()
  let containerRef: ReturnType<typeof useModalBehavior>['containerRef'] | null =
    null

  const Host = defineComponent({
    setup() {
      const result = useModalBehavior(isActive, onClose)
      containerRef = result.containerRef
      return () =>
        isActive.value
          ? h('div', { ref: result.containerRef, role: 'dialog' }, [
              h('button', { id: 'first' }, 'first'),
              h('input', { id: 'middle' }),
              h('button', { id: 'last' }, 'last'),
            ])
          : null
    },
  })

  const wrapper = mount(Host, { attachTo: document.body })
  return { wrapper, isActive, onClose, getContainerRef: () => containerRef }
}

describe('useModalBehavior', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })

  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('locks body scroll and focuses the first focusable element when active', async () => {
    const { isActive } = mountHost(false)

    isActive.value = true
    await nextTick()
    await nextTick()

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.activeElement?.id).toBe('first')
  })

  it('restores body scroll and focus when deactivated', async () => {
    const trigger = document.createElement('button')
    trigger.id = 'trigger'
    document.body.appendChild(trigger)
    trigger.focus()

    const { isActive } = mountHost(false)

    isActive.value = true
    await nextTick()
    await nextTick()

    expect(document.activeElement?.id).toBe('first')

    isActive.value = false
    await nextTick()

    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement?.id).toBe('trigger')

    document.body.removeChild(trigger)
  })

  it('calls onClose when ESC is pressed while active', async () => {
    const { isActive, onClose } = mountHost(false)

    isActive.value = true
    await nextTick()

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when ESC is pressed while inactive', () => {
    const { onClose } = mountHost(false)

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )

    expect(onClose).not.toHaveBeenCalled()
  })

  it('traps Tab focus by wrapping from last to first', async () => {
    const { isActive } = mountHost(false)

    isActive.value = true
    await nextTick()
    await nextTick()

    const last = document.getElementById('last') as HTMLButtonElement
    last.focus()
    expect(document.activeElement?.id).toBe('last')

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    )

    expect(document.activeElement?.id).toBe('first')
  })

  it('traps Shift+Tab focus by wrapping from first to last', async () => {
    const { isActive } = mountHost(false)

    isActive.value = true
    await nextTick()
    await nextTick()

    const first = document.getElementById('first') as HTMLButtonElement
    first.focus()
    expect(document.activeElement?.id).toBe('first')

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
      }),
    )

    expect(document.activeElement?.id).toBe('last')
  })

  it('cleans up listeners and restores scroll on unmount while active', async () => {
    const { wrapper, isActive, onClose } = mountHost(false)

    isActive.value = true
    await nextTick()
    await nextTick()

    expect(document.body.style.overflow).toBe('hidden')

    wrapper.unmount()

    expect(document.body.style.overflow).toBe('')

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    expect(onClose).not.toHaveBeenCalled()
  })
})

async function nextTick() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

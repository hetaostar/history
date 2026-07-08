import { nextTick, onUnmounted, ref, watch } from 'vue'
import type { Ref } from 'vue'

const FOCUSABLE_SELECTOR =
  'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'

/**
 * 模态行为 composable：监听 ESC 关闭、Tab 焦点循环、锁定背景滚动、显示时把焦点收入容器、隐藏时还原焦点。
 *
 * 用法：
 *   const { containerRef } = useModalBehavior(isVisible, () => { isVisible.value = false })
 *   <div ref="containerRef" role="dialog">...</div>
 *
 * isActive 既可以是 ref<boolean>，也可以是 computed<boolean>（用于 v-if="selectedItem" 这类对象存在性场景）。
 */
export function useModalBehavior(
  isActive: Ref<boolean>,
  onClose: () => void,
): { containerRef: Ref<HTMLElement | null> } {
  const containerRef = ref<HTMLElement | null>(null)
  let lastFocused: HTMLElement | null = null

  function getFocusable(): HTMLElement[] {
    const root = containerRef.value
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  }

  function onKeydown(event: KeyboardEvent) {
    if (!isActive.value) return

    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key === 'Tab') {
      const focusable = getFocusable()
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  function lock() {
    lastFocused = (document.activeElement as HTMLElement | null) ?? null
    document.addEventListener('keydown', onKeydown)
    document.body.style.overflow = 'hidden'
    nextTick(() => {
      const first =
        containerRef.value?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      first?.focus()
    })
  }

  function unlock() {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
    const target = lastFocused
    lastFocused = null
    if (target && typeof target.focus === 'function') {
      target.focus()
    }
  }

  watch(isActive, (active) => {
    if (active) lock()
    else unlock()
  })

  onUnmounted(() => {
    if (isActive.value) unlock()
  })

  return { containerRef }
}

import { ref, watch } from 'vue'
import type { Ref } from 'vue'

/**
 * 防抖 ref：value 实时变化，debounced 延迟同步。
 * 用于搜索框等需要减少高频计算的场景。
 */
export function useDebouncedRef<T>(
  initial: T,
  delayMs = 200,
): {
  value: Ref<T>
  debounced: Ref<T>
} {
  const value = ref(initial) as Ref<T>
  const debounced = ref(initial) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | null = null

  watch(value, (next) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      debounced.value = next
    }, delayMs)
  })

  return { value, debounced }
}

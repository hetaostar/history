/**
 * 防御性 localStorage 包装：在 SSR / 隐私模式 / 存储已满等场景下
 * 直接访问 localStorage 会抛错，这里统一 try/catch + 可选链。
 */
export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null
    } catch {
      return null
    }
  },

  setItem(key: string, value: string): boolean {
    try {
      const storage = globalThis.localStorage
      if (!storage) return false
      storage.setItem(key, value)
      return true
    } catch {
      return false
    }
  },

  removeItem(key: string): void {
    try {
      globalThis.localStorage?.removeItem(key)
    } catch {
      /* noop */
    }
  },
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { safeLocalStorage } from './safeLocalStorage'

describe('safeLocalStorage', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  )

  afterEach(() => {
    // 还原 localStorage 描述符，避免污染其他测试
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalDescriptor)
    }
  })

  describe('when localStorage is accessible', () => {
    beforeEach(() => {
      // 用内存实现替换，避免污染真实 localStorage
      const store = new Map<string, string>()
      const mock: Storage = {
        get length() {
          return store.size
        },
        clear() {
          store.clear()
        },
        getItem(key) {
          return store.has(key) ? store.get(key)! : null
        },
        key(index) {
          return Array.from(store.keys())[index] ?? null
        },
        removeItem(key) {
          store.delete(key)
        },
        setItem(key, value) {
          store.set(key, value)
        },
      }
      Object.defineProperty(globalThis, 'localStorage', {
        value: mock,
        configurable: true,
        writable: true,
      })
    })

    it('setItem returns true and getItem returns the stored value', () => {
      expect(safeLocalStorage.setItem('k', 'v')).toBe(true)
      expect(safeLocalStorage.getItem('k')).toBe('v')
    })

    it('removeItem clears the stored value', () => {
      safeLocalStorage.setItem('k', 'v')
      safeLocalStorage.removeItem('k')
      expect(safeLocalStorage.getItem('k')).toBeNull()
    })

    it('getItem returns null for missing keys', () => {
      expect(safeLocalStorage.getItem('missing')).toBeNull()
    })
  })

  describe('when localStorage access throws', () => {
    beforeEach(() => {
      // 模拟隐私模式 / SSR：访问 localStorage 抛错
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() {
          throw new Error('localStorage is blocked')
        },
      })
    })

    it('getItem returns null instead of throwing', () => {
      expect(safeLocalStorage.getItem('k')).toBeNull()
    })

    it('setItem returns false instead of throwing', () => {
      expect(safeLocalStorage.setItem('k', 'v')).toBe(false)
    })

    it('removeItem does not throw', () => {
      expect(() => safeLocalStorage.removeItem('k')).not.toThrow()
    })
  })

  describe('when localStorage is undefined', () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: undefined,
      })
    })

    it('getItem returns null', () => {
      expect(safeLocalStorage.getItem('k')).toBeNull()
    })

    it('setItem returns false', () => {
      expect(safeLocalStorage.setItem('k', 'v')).toBe(false)
    })
  })
})

// 防 vi 未使用警告（保留 vitest 全局 API 兼容）
void vi

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createId } from './createId'

describe('createId', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('调用 crypto.randomUUID 分支时直接返回该值', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      'fixed-uuid-1234' as `${string}-${string}-${string}-${string}-${string}`,
    )

    expect(createId()).toBe('fixed-uuid-1234')
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
  })

  it('降级分支返回 id-<时间戳>-<随机串> 格式', () => {
    const originalCrypto = globalThis.crypto
    vi.stubGlobal('crypto', {
      getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto),
    })

    const id = createId()

    expect(id).toMatch(/^id-\d+-[0-9a-f]+$/)
  })
})

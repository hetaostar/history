import { describe, expect, it } from 'vitest'
import { router } from './index'

describe('router', () => {
  it('将中国历史长河静态路径解析到专用页面', () => {
    const resolved = router.resolve('/timelines/china-river')

    expect(resolved.name).toBe('china-history-river')
    expect(resolved.params).not.toHaveProperty('timelineId')
    expect(resolved.matched[resolved.matched.length - 1]?.path).toBe(
      '/timelines/china-river',
    )
  })
})

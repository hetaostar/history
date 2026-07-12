import { describe, expect, it } from 'vitest'
import { router } from './index'

describe('router', () => {
  it('将事件与中国历史长河解析到独立页面', () => {
    const events = router.resolve('/events')
    const river = router.resolve('/china-river')

    expect(events.matched[events.matched.length - 1]?.path).toBe('/events')
    expect(river.name).toBe('china-history-river')
    expect(river.matched[river.matched.length - 1]?.path).toBe('/china-river')
  })

  it('将旧时间线路径重定向到事件页', async () => {
    expect(router.resolve('/timelines').redirectedFrom).toBeUndefined()
    const timelines = router.resolve('/timelines')
    const timelineDetail = router.resolve('/timelines/legacy')
    expect(timelines.matched[timelines.matched.length - 1]?.redirect).toBe(
      '/events',
    )
    expect(
      timelineDetail.matched[timelineDetail.matched.length - 1]?.redirect,
    ).toBe('/events')

    await router.push('/timelines/legacy?event=event-1#detail')
    expect(router.currentRoute.value.fullPath).toBe(
      '/events?event=event-1#detail',
    )

    await router.push('/timelines')
    expect(router.currentRoute.value.fullPath).toBe('/events')

    await router.push('/timelines/china-river')
    expect(router.currentRoute.value.fullPath).toBe('/china-river')
  }, 10_000)

  it('不再提供导入导出路由', () => {
    expect(router.resolve('/data').matched).toHaveLength(0)
  })
})

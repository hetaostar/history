import { describe, expect, it } from 'vitest'
import { router, scrollBehavior } from './index'
import type { RouteLocationNormalized } from 'vue-router'

function routeAt(path: string, hash = ''): RouteLocationNormalized {
  return {
    path,
    hash,
    fullPath: `${path}${hash}`,
    name: undefined,
    params: {},
    query: {},
    matched: [],
    meta: {},
    redirectedFrom: undefined,
  }
}

describe('router', () => {
  it('路由切换时回到页面顶部，保留后退位置与 hash 定位', async () => {
    await expect(
      scrollBehavior(routeAt('/people'), routeAt('/'), null),
    ).resolves.toEqual({
      top: 0,
      left: 0,
    })
    await expect(
      scrollBehavior(routeAt('/events'), routeAt('/'), null),
    ).resolves.toEqual({
      top: 0,
      left: 0,
    })
    expect(
      scrollBehavior(routeAt('/people'), routeAt('/'), { left: 0, top: 420 }),
    ).toEqual({ left: 0, top: 420 })
    await expect(
      scrollBehavior(
        routeAt('/people', '#period-tang'),
        routeAt('/'),
        null,
      ),
    ).resolves.toEqual({ el: '#period-tang' })
  })

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

  it('注册教材与课程详情懒加载路由并可导航', async () => {
    const textbook = router.resolve('/textbooks/grade-7-up')
    const lesson = router.resolve(
      '/textbooks/grade-7-up/lessons/g7u-lesson-04',
    )

    expect(textbook.matched[textbook.matched.length - 1]?.path).toBe(
      '/textbooks/:textbookId',
    )
    expect(lesson.matched[lesson.matched.length - 1]?.path).toBe(
      '/textbooks/:textbookId/lessons/:lessonId',
    )

    await router.push('/textbooks/grade-7-up')
    expect(router.currentRoute.value.params.textbookId).toBe('grade-7-up')
    await router.push('/textbooks/grade-7-up/lessons/g7u-lesson-04')
    expect(router.currentRoute.value.params.lessonId).toBe('g7u-lesson-04')
  })

  it('教材路由加入后原有页面仍可解析', () => {
    const legacyPaths = [
      '/',
      '/events',
      '/china-river',
      '/people',
      '/cards',
      '/search',
    ]

    legacyPaths.forEach((path) => {
      expect(router.resolve(path).matched).not.toHaveLength(0)
    })
  })

  it('人物详情改用列表 query 且不再提供独立详情路由', () => {
    const personList = router.resolve(
      '/people?person=g7u-confucius#period-spring-autumn',
    )

    expect(personList.matched[personList.matched.length - 1]?.path).toBe(
      '/people',
    )
    expect(personList.query.person).toBe('g7u-confucius')
    expect(personList.hash).toBe('#period-spring-autumn')
    expect(router.resolve('/people/g7u-confucius').matched).toHaveLength(0)
  })
})

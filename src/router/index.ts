import { createRouter, createWebHistory } from 'vue-router'
import type { RouterScrollBehavior } from 'vue-router'

export const scrollBehavior: RouterScrollBehavior = (
  to,
  _from,
  savedPosition,
) => {
  if (savedPosition) {
    return savedPosition
  }

  // 等下一帧再滚动，避免懒加载页面尚未完成布局时沿用上一页滚动位置
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      if (to.hash) {
        resolve({ el: to.hash })
        return
      }

      resolve({ top: 0, left: 0 })
    })
  })
}

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior,
  routes: [
    {
      path: '/',
      component: () => import('@/pages/HomePage.vue'),
    },
    {
      path: '/textbooks/:textbookId',
      component: () => import('@/pages/TextbookPage.vue'),
    },
    {
      path: '/textbooks/:textbookId/lessons/:lessonId',
      component: () => import('@/pages/TextbookLessonPage.vue'),
    },
    {
      path: '/events',
      component: () => import('@/pages/EventListPage.vue'),
    },
    {
      path: '/china-river',
      name: 'china-history-river',
      component: () => import('@/pages/ChinaHistoryRiverPage.vue'),
    },
    {
      path: '/timelines/china-river',
      redirect: '/china-river',
    },
    {
      path: '/timelines',
      redirect: '/events',
    },
    {
      path: '/timelines/:timelineId',
      redirect: '/events',
    },
    {
      path: '/people',
      component: () => import('@/pages/PersonListPage.vue'),
    },
    {
      path: '/cards',
      component: () => import('@/pages/FlashcardPage.vue'),
    },
    {
      path: '/search',
      component: () => import('@/pages/SearchPage.vue'),
    },
  ],
})

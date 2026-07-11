import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/pages/HomePage.vue'),
    },
    {
      path: '/timelines',
      component: () => import('@/pages/TimelineListPage.vue'),
    },
    {
      path: '/timelines/china-river',
      name: 'china-history-river',
      component: () => import('@/pages/ChinaHistoryRiverPage.vue'),
    },
    {
      path: '/timelines/:timelineId',
      component: () => import('@/pages/TimelineDetailPage.vue'),
    },
    {
      path: '/people',
      component: () => import('@/pages/PersonListPage.vue'),
    },
    {
      path: '/people/:personId',
      component: () => import('@/pages/PersonDetailPage.vue'),
    },
    {
      path: '/cards',
      component: () => import('@/pages/FlashcardPage.vue'),
    },
    {
      path: '/search',
      component: () => import('@/pages/SearchPage.vue'),
    },
    {
      path: '/data',
      component: () => import('@/pages/ImportExportPage.vue'),
    },
  ],
})

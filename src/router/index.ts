import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/pages/HomePage.vue'),
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
  ],
})

import { createRouter, createWebHistory } from 'vue-router'
import FlashcardPage from '@/pages/FlashcardPage.vue'
import HomePage from '@/pages/HomePage.vue'
import ImportExportPage from '@/pages/ImportExportPage.vue'
import PersonDetailPage from '@/pages/PersonDetailPage.vue'
import PersonListPage from '@/pages/PersonListPage.vue'
import SearchPage from '@/pages/SearchPage.vue'
import TimelineDetailPage from '@/pages/TimelineDetailPage.vue'
import TimelineListPage from '@/pages/TimelineListPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/timelines', component: TimelineListPage },
    { path: '/timelines/:timelineId', component: TimelineDetailPage },
    { path: '/people', component: PersonListPage },
    { path: '/people/:personId', component: PersonDetailPage },
    { path: '/cards', component: FlashcardPage },
    { path: '/search', component: SearchPage },
    { path: '/data', component: ImportExportPage },
  ],
})

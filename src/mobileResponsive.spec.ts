import { describe, expect, it } from 'vitest'
import appSource from './App.vue?raw'
import homePageSource from './pages/HomePage.vue?raw'
import textbookPageSource from './pages/TextbookPage.vue?raw'
import textbookLessonPageSource from './pages/TextbookLessonPage.vue?raw'
import eventListPageSource from './pages/EventListPage.vue?raw'
import personListPageSource from './pages/PersonListPage.vue?raw'
import flashcardPageSource from './pages/FlashcardPage.vue?raw'
import searchPageSource from './pages/SearchPage.vue?raw'
import chinaHistoryRiverPageSource from './pages/ChinaHistoryRiverPage.vue?raw'
import textbookRiverTimelineSource from './components/TextbookRiverTimeline.vue?raw'
import confirmActionModalSource from './components/ConfirmActionModal.vue?raw'

describe('全站移动端样式基线', () => {
  it('全站外壳保留移动端可换行的导航结构', () => {
    expect(appSource).toContain('class="app-header"')
    expect(appSource).toContain('class="nav-links"')
    expect(appSource).toContain('to="/china-river"')
  })

  it('主要页面提供窄屏断点，避免宽网格和大块固定高度', () => {
    ;[
      homePageSource,
      textbookPageSource,
      textbookLessonPageSource,
      eventListPageSource,
      personListPageSource,
      flashcardPageSource,
      searchPageSource,
    ].forEach((source) => {
      expect(source).toContain('@media (max-width:')
      expect(source).toMatch(/grid-template-columns:\s*1fr/)
    })
  })

  it('表单、弹窗和搜索结果在手机端切为单列触控布局', () => {
    expect(flashcardPageSource).toMatch(
      /@media \(max-width:\s*620px\)[\s\S]*\.card-modal\s*\{[^}]*padding:\s*10px/,
    )
    expect(flashcardPageSource).toMatch(
      /\.primary-button,[\s\S]*\.action-row button\s*\{[^}]*width:\s*100%/,
    )
    expect(searchPageSource).toMatch(
      /@media \(max-width:\s*620px\)[\s\S]*\.result-layout\s*\{[^}]*grid-template-columns:\s*1fr/,
    )
    expect(confirmActionModalSource).toMatch(
      /@media \(max-width:\s*520px\)[\s\S]*\.confirm-actions\s*\{[^}]*flex-direction:\s*column/,
    )
  })

  it('历史长河入口在手机端降低画布最小高度', () => {
    expect(homePageSource).toContain('--river-canvas-min-height: 400px')
    expect(chinaHistoryRiverPageSource).toContain(
      '--river-canvas-min-height: 420px',
    )
    expect(textbookRiverTimelineSource).toContain('min-height: 400px')
  })
})

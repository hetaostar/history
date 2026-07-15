<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  onUnmounted,
  ref,
} from 'vue'
import RiverAsyncStatus from '@/components/RiverAsyncStatus.vue'
import TextbookShelf from '@/components/TextbookShelf.vue'
import { TEXTBOOKS } from '@/data/textbooks'
import {
  getAllTextbookEvents,
  getAllTextbookPeople,
} from '@/domain/textbookSelectors'
import { useHistoryStore } from '@/stores/historyStore'

const store = useHistoryStore()
const HomeRiverExplorer = defineAsyncComponent({
  loader: () => import('@/components/ChinaRiverExplorer.vue'),
  loadingComponent: RiverAsyncStatus,
  errorComponent: RiverAsyncStatus,
  delay: 0,
  timeout: 15_000,
})
const homeRiverSection = ref<HTMLElement | null>(null)
const shouldLoadRiver = ref(false)
let riverIntersectionObserver: IntersectionObserver | null = null
const textbookPeopleCount = new Set(
  getAllTextbookPeople().map((person) => person.id),
).size
const textbookEventCount = getAllTextbookEvents().length

const featureEntries = computed(() => [
  {
    title: '人物',
    route: '/people',
    label: '人物索引',
    count: textbookPeopleCount,
    copy: '按教材浏览人物的生平、主张、贡献和关键词。',
    action: '浏览教材人物',
  },
  {
    title: '事件',
    route: '/events',
    label: '历史事件',
    count: textbookEventCount,
    copy: '按时间整理具体历史事件，形成可背诵的顺序。',
    action: '查看事件',
  },
  {
    title: '卡片背诵',
    route: '/cards',
    label: '记忆卡',
    count: store.cards.length,
    copy: '把易混点拆成正反面，用翻卡判断是否真正记住。',
    action: '开始背诵',
  },
  {
    title: '搜索',
    route: '/search',
    label: '全库检索',
    count: totalItems.value,
    copy: '从人物、事件、关键词和卡片内容中迅速定位线索。',
    action: '立即搜索',
  },
])

const totalItems = computed(
  () =>
    textbookPeopleCount + textbookEventCount + store.cards.length,
)

onMounted(() => {
  const section = homeRiverSection.value

  if (typeof IntersectionObserver === 'undefined' || !section) {
    shouldLoadRiver.value = true
    return
  }

  riverIntersectionObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return

      shouldLoadRiver.value = true
      riverIntersectionObserver?.disconnect()
      riverIntersectionObserver = null
    },
    { rootMargin: '240px 0px' },
  )
  riverIntersectionObserver.observe(section)
})

onUnmounted(() => {
  riverIntersectionObserver?.disconnect()
})
</script>

<template>
  <section class="home-page">
    <section class="hero-panel" aria-labelledby="home-title">
      <div class="hero-copy">
        <p class="eyebrow">History memory desk</p>
        <h1 id="home-title">把零散史料，收成可背诵的秩序。</h1>
        <p>
          用人物作锚点，用事件搭骨架，再把高频考点拆成卡片。首页已经把
          “人物”“事件”“卡片背诵”“搜索” 放在同一个学习入口里。
        </p>
        <div class="hero-actions" aria-label="首页主操作">
          <RouterLink class="primary-link" to="/cards">抽一张卡片</RouterLink>
          <RouterLink class="secondary-link" to="/search">搜索史料</RouterLink>
        </div>
      </div>

      <aside class="archive-slip" aria-label="资料概览">
        <span class="slip-kicker">馆藏</span>
        <strong>{{ totalItems }}</strong>
        <span>条学习材料</span>
        <div class="slip-grid">
          <span>{{ textbookPeopleCount }} 人物</span>
          <span>{{ textbookEventCount }} 事件</span>
          <span>{{ store.cards.length }} 卡片</span>
        </div>
      </aside>
    </section>

    <section
      ref="homeRiverSection"
      class="home-river-section"
      aria-labelledby="home-river-title"
    >
      <header class="home-river-heading">
        <div>
          <p class="river-kicker">Civilization in motion</p>
          <h2 id="home-river-title">中华历史长河</h2>
          <p class="river-description">
            以朝代兴衰为河床，沿时间脉络浏览教材中的重要事件。
          </p>
        </div>
        <div class="river-controls">
          <p class="river-guide">拖动浏览 · 滚轮缩放 · 点击事件查看详情</p>
          <RouterLink class="river-immersive-link" to="/china-river">
            打开沉浸模式
          </RouterLink>
        </div>
      </header>

      <div
        v-if="shouldLoadRiver"
        class="home-river-explorer"
        data-test="home-river-explorer"
      >
        <HomeRiverExplorer />
      </div>
      <RiverAsyncStatus v-else />
    </section>

    <TextbookShelf :textbooks="TEXTBOOKS" />

    <section class="feature-rail" aria-label="核心功能">
      <RouterLink
        v-for="entry in featureEntries"
        :key="entry.title"
        class="feature-card"
        :to="entry.route"
      >
        <span class="feature-label">{{ entry.label }}</span>
        <strong>{{ entry.title }}</strong>
        <p>{{ entry.copy }}</p>
        <span class="feature-count">{{ entry.count }} 项</span>
        <span class="feature-action">{{ entry.action }}</span>
      </RouterLink>
    </section>
  </section>
</template>

<style scoped>
.home-page {
  display: grid;
  gap: 28px;
}

.hero-panel {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
  gap: 28px;
  min-height: 430px;
  padding: clamp(28px, 5vw, 58px);
  overflow: hidden;
  color: var(--ink);
  background:
    radial-gradient(circle at 82% 18%, rgb(184 62 44 / 20%), transparent 28%),
    linear-gradient(135deg, rgb(245 232 199 / 96%), rgb(218 196 153 / 88%));
  border: 1px solid rgb(74 50 35 / 20%);
  border-radius: 34px;
  box-shadow: 0 28px 70px rgb(36 27 20 / 18%);
}

.hero-panel::before {
  position: absolute;
  inset: 22px;
  pointer-events: none;
  content: '';
  background:
    linear-gradient(90deg, rgb(43 54 42 / 14%) 1px, transparent 1px) 0 0 / 64px
      100%,
    linear-gradient(rgb(43 54 42 / 9%) 1px, transparent 1px) 0 0 / 100% 42px;
  border: 1px solid rgb(43 54 42 / 14%);
  border-radius: 26px;
  mask-image: linear-gradient(90deg, #000, transparent 75%);
}

.hero-copy {
  position: relative;
  z-index: 1;
  align-self: center;
  max-width: 760px;
}

.eyebrow,
.slip-kicker,
.feature-label {
  color: var(--cinnabar);
  font-family: var(--font-utility);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.hero-copy h1 {
  max-width: 12em;
  margin: 10px 0 18px;
  font-family: var(--font-display);
  font-size: clamp(42px, 8vw, 86px);
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -0.08em;
}

.hero-copy p:not(.eyebrow) {
  max-width: 620px;
  margin: 0;
  color: var(--muted-ink);
  font-size: 18px;
  line-height: 1.9;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}

.primary-link,
.secondary-link,
.feature-action {
  text-decoration: none;
}

.primary-link,
.secondary-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 20px;
  font-weight: 800;
  border-radius: 999px;
}

.primary-link {
  color: var(--paper);
  background: var(--ink);
}

.secondary-link {
  color: var(--ink);
  background: rgb(255 248 229 / 46%);
  border: 1px solid rgb(43 54 42 / 18%);
}

.archive-slip {
  position: relative;
  z-index: 1;
  align-self: end;
  display: grid;
  gap: 12px;
  padding: 26px;
  background: rgb(255 248 229 / 78%);
  border: 1px solid rgb(74 50 35 / 20%);
  border-radius: 24px;
  box-shadow: inset 7px 0 0 var(--bronze);
}

.archive-slip strong {
  color: var(--cinnabar);
  font-family: var(--font-display);
  font-size: 76px;
  line-height: 0.9;
}

.archive-slip > span:last-of-type {
  color: var(--muted-ink);
  font-weight: 800;
}

.slip-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding-top: 10px;
  color: var(--muted-ink);
  font-size: 14px;
}

.feature-rail {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.feature-card {
  position: relative;
  display: grid;
  gap: 12px;
  min-height: 250px;
  padding: 24px;
  overflow: hidden;
  color: inherit;
  text-decoration: none;
  background: var(--paper);
  border: 1px solid rgb(74 50 35 / 16%);
  border-radius: 28px;
  box-shadow: 0 18px 45px rgb(36 27 20 / 10%);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease;
}

.feature-card::after {
  position: absolute;
  right: -36px;
  bottom: -52px;
  width: 126px;
  height: 126px;
  content: '';
  background: var(--aged-gold);
  border-radius: 999px;
  opacity: 0.26;
}

.feature-card:hover,
.feature-card:focus-visible {
  border-color: rgb(184 62 44 / 45%);
  box-shadow: 0 24px 55px rgb(36 27 20 / 16%);
  transform: translateY(-4px);
}

.feature-card strong {
  font-family: var(--font-display);
  font-size: 32px;
  line-height: 1;
}

.feature-card p {
  margin: 0;
  color: var(--muted-ink);
  line-height: 1.8;
}

.feature-count {
  width: fit-content;
  padding: 6px 10px;
  color: var(--bronze);
  font-weight: 900;
  background: rgb(54 91 76 / 10%);
  border-radius: 999px;
}

.feature-action {
  align-self: end;
  color: var(--cinnabar);
  font-weight: 900;
}

.home-river-section {
  /* 深色变量仅供画布 / 加载态子组件继承，外壳自身用浅色纸质风格 */
  --river-page-background: #071e2e;
  --river-page-surface: #0b2a3f;
  --river-page-ink: #fff8df;
  --river-page-muted: #b8c1bc;
  --river-page-gold: #d8be7b;
  --river-page-paper: #f7f0d5;
  --river-canvas-height: 480px;
  --river-canvas-min-height: 480px;

  position: relative;
  display: grid;
  gap: 22px;
  padding: clamp(22px, 4vw, 36px);
  overflow: hidden;
  color: var(--ink);
  background:
    linear-gradient(90deg, rgb(54 91 76 / 7%) 1px, transparent 1px) 0 0 / 38px
      100%,
    color-mix(in srgb, var(--paper) 88%, white);
  border: 1px solid rgb(74 50 35 / 16%);
  border-radius: 30px;
  box-shadow: 0 18px 45px rgb(36 27 20 / 10%);
}

.home-river-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
}

.river-kicker,
.river-description,
.river-guide {
  margin: 0;
}

.river-kicker {
  margin: 0 0 5px;
  color: var(--cinnabar);
  font-family: var(--font-utility);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.home-river-heading h2 {
  margin: 0 0 9px;
  font-family: var(--font-display);
  font-size: clamp(28px, 5vw, 42px);
  line-height: 1.1;
}

.river-description {
  max-width: 480px;
  color: var(--muted-ink);
  line-height: 1.7;
}

.river-controls {
  display: grid;
  flex: 0 0 auto;
  justify-items: end;
  gap: 10px;
}

.river-guide {
  color: var(--muted-ink);
  font-family: var(--font-utility);
  font-size: 13px;
  font-weight: 800;
}

.river-immersive-link {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 16px;
  color: var(--ink);
  font-family: var(--font-utility);
  font-size: 13px;
  font-weight: 900;
  text-decoration: none;
  background: rgb(255 248 229 / 46%);
  border: 1px solid rgb(43 54 42 / 18%);
  border-radius: 999px;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.river-immersive-link:hover,
.river-immersive-link:focus-visible {
  box-shadow: 0 8px 24px rgb(36 27 20 / 12%);
  transform: translateY(-2px);
}

.river-immersive-link:focus-visible {
  outline: 3px solid var(--cinnabar);
  outline-offset: 3px;
}

.home-river-explorer {
  min-width: 0;
  min-height: var(--river-canvas-height);
}

@media (prefers-reduced-motion: reduce) {
  .feature-card,
  .river-immersive-link {
    transition: none;
  }
}

@media (max-width: 920px) {
  .hero-panel {
    grid-template-columns: 1fr;
  }

  .feature-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .home-river-heading {
    align-items: start;
    flex-direction: column;
    gap: 18px;
  }

  .river-controls {
    justify-items: start;
  }
}

@media (max-width: 620px) {
  .hero-panel {
    padding: 26px;
    border-radius: 26px;
  }

  .feature-rail {
    grid-template-columns: 1fr;
  }

  .home-river-section {
    --river-canvas-height: 520px;
    --river-canvas-min-height: 520px;
  }

  .river-guide {
    line-height: 1.6;
  }
}
</style>

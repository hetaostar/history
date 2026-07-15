<script setup lang="ts">
import { RouterLink } from 'vue-router'
import ChinaRiverExplorer from '@/components/ChinaRiverExplorer.vue'
import { getAllTextbookEvents } from '@/domain/textbookSelectors'

const textbookEvents = getAllTextbookEvents()
</script>

<template>
  <section class="china-river-page">
    <header class="river-heading">
      <div>
        <RouterLink class="back-link" to="/">返回主页</RouterLink>
        <p class="eyebrow">教材 · 只读 · {{ textbookEvents.length }} 个事件</p>
        <h1>中华历史长河</h1>
        <p class="description">
          以朝代兴衰为河床，沿时间脉络浏览中华文明的重要事件。
        </p>
      </div>
      <p class="desktop-guide">
        桌面端浏览：拖动浏览、滚轮缩放、点击事件查看详情
      </p>
    </header>

    <ChinaRiverExplorer />
  </section>
</template>

<style scoped>
.china-river-page {
  /* 深色变量仅供画布 / 加载态子组件继承，外壳自身用浅色纸质风格 */
  --river-page-background: #071e2e;
  --river-page-surface: #0b2a3f;
  --river-page-ink: #fff8df;
  --river-page-muted: #b8c1bc;
  --river-page-gold: #d8be7b;
  --river-page-paper: #f7f0d5;
  --river-canvas-height: max(560px, calc(100vh - 260px));
  --river-canvas-min-height: 560px;

  display: grid;
  gap: clamp(16px, 2vw, 24px);
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

.river-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
}

.back-link {
  display: inline-block;
  margin-bottom: 14px;
  color: var(--cinnabar);
  font-family: var(--font-utility);
  font-size: 14px;
  font-weight: 800;
  text-decoration-color: color-mix(in srgb, var(--cinnabar) 42%, transparent);
}

.eyebrow,
.description,
.desktop-guide {
  margin: 0;
}

.eyebrow {
  color: var(--cinnabar);
  font-family: var(--font-utility);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 9px;
  font-family: var(--font-display);
  font-size: clamp(28px, 5vw, 42px);
  line-height: 1.1;
}

.description {
  max-width: 480px;
  color: var(--muted-ink);
  line-height: 1.7;
}

.desktop-guide {
  flex: 0 0 auto;
  padding: 10px 14px;
  color: var(--ink);
  background: rgb(255 248 229 / 46%);
  border: 1px solid rgb(43 54 42 / 18%);
  border-radius: 999px;
  font-family: var(--font-utility);
  font-size: 13px;
  font-weight: 800;
}

@media (max-width: 760px) {
  .china-river-page {
    --river-canvas-height: max(560px, calc(100vh - 300px));
  }

  .river-heading {
    align-items: start;
    flex-direction: column;
    gap: 16px;
  }

  .desktop-guide {
    flex: 1;
    white-space: normal;
  }
}
</style>

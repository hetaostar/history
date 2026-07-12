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
  padding: clamp(18px, 3vw, 34px);
  color: var(--river-page-ink);
  background:
    radial-gradient(
      circle at 16% 0%,
      color-mix(in srgb, var(--river-page-gold) 12%, transparent),
      transparent 28rem
    ),
    linear-gradient(
      145deg,
      var(--river-page-surface),
      var(--river-page-background) 46%
    );
  border: 1px solid color-mix(in srgb, var(--river-page-gold) 26%, transparent);
  border-radius: 24px;
  box-shadow: 0 30px 80px color-mix(in srgb, var(--ink) 28%, transparent);
}

.river-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  padding: 2px 4px 0;
}

.back-link {
  display: inline-block;
  margin-bottom: 14px;
  color: var(--river-page-gold);
  font-family: var(--font-utility);
  font-size: 14px;
  font-weight: 800;
  text-decoration-color: color-mix(
    in srgb,
    var(--river-page-gold) 42%,
    transparent
  );
}

.eyebrow,
.description,
.desktop-guide {
  margin: 0;
}

.eyebrow {
  color: var(--river-page-gold);
  font-family: var(--font-utility);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.16em;
}

h1 {
  margin: 6px 0 9px;
  font-family: var(--font-display);
  font-size: clamp(34px, 4vw, 52px);
  line-height: 1.04;
  letter-spacing: -0.045em;
  text-shadow: 0 4px 18px color-mix(in srgb, var(--ink) 30%, transparent);
}

.description {
  max-width: 46rem;
  color: var(--river-page-muted);
  line-height: 1.7;
}

.desktop-guide {
  flex: 0 0 auto;
  padding: 10px 14px;
  color: var(--river-page-paper);
  background: color-mix(in srgb, var(--river-page-surface) 82%, transparent);
  border: 1px solid color-mix(in srgb, var(--river-page-gold) 58%, transparent);
  border-radius: 999px;
  font-family: var(--font-utility);
  font-size: 13px;
  font-weight: 800;
}

@media (max-width: 760px) {
  .china-river-page {
    --river-canvas-height: max(560px, calc(100vh - 300px));

    padding: 16px;
    border-radius: 18px;
  }

  .river-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }

  .desktop-guide {
    flex: 1;
    white-space: normal;
  }
}
</style>

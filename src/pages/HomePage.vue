<script setup lang="ts">
import { computed } from 'vue'
import { useHistoryStore } from '@/stores/historyStore'

const store = useHistoryStore()

const featureEntries = computed(() => [
  {
    title: '人物',
    route: '/people',
    label: '人物索引',
    count: store.people.length,
    copy: '把生平、主张、贡献和关键词收进同一张人物档案。',
    action: '整理人物',
  },
  {
    title: '时间线',
    route: '/timelines',
    label: '事件脉络',
    count: store.timelines.length,
    copy: '按朝代、专题或考试范围串联事件，形成可背诵的顺序。',
    action: '查看时间线',
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
  () => store.people.length + store.timelines.length + store.events.length + store.cards.length,
)

const latestEvents = computed(() =>
  [...store.events]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3),
)

const latestPeople = computed(() =>
  [...store.people]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3),
)
</script>

<template>
  <section class="home-page">
    <section class="hero-panel" aria-labelledby="home-title">
      <div class="hero-copy">
        <p class="eyebrow">History memory desk</p>
        <h1 id="home-title">把零散史料，收成可背诵的秩序。</h1>
        <p>
          用人物作锚点，用时间线搭骨架，再把高频考点拆成卡片。首页已经把
          “人物”“时间线”“卡片背诵”“搜索” 放在同一个学习入口里。
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
          <span>{{ store.people.length }} 人物</span>
          <span>{{ store.events.length }} 事件</span>
          <span>{{ store.timelines.length }} 时间线</span>
          <span>{{ store.cards.length }} 卡片</span>
        </div>
      </aside>
    </section>

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

    <section class="desk-layout">
      <article class="desk-panel">
        <div class="section-heading">
          <span>最近事件</span>
          <RouterLink to="/timelines">进入时间线</RouterLink>
        </div>
        <p v-if="latestEvents.length === 0" class="empty-note">
          还没有事件。先创建一条时间线，再补充需要背诵的节点。
        </p>
        <ol v-else class="recent-list">
          <li v-for="event in latestEvents" :key="event.id">
            <span>{{ event.timeLabel || '未标时间' }}</span>
            <strong>{{ event.title }}</strong>
            <p v-if="event.summary">{{ event.summary }}</p>
          </li>
        </ol>
      </article>

      <article class="desk-panel people-panel">
        <div class="section-heading">
          <span>人物抽屉</span>
          <RouterLink to="/people">整理人物</RouterLink>
        </div>
        <p v-if="latestPeople.length === 0" class="empty-note">
          还没有人物。把重要人物的生平、主张和关键词先归档。
        </p>
        <div v-else class="person-strip">
          <RouterLink
            v-for="person in latestPeople"
            :key="person.id"
            class="person-chip"
            :to="`/people/${person.id}`"
          >
            <strong>{{ person.name }}</strong>
            <span>{{ person.lifeTime || '待补充时间' }}</span>
          </RouterLink>
        </div>
      </article>
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
  content: "";
  background:
    linear-gradient(90deg, rgb(43 54 42 / 14%) 1px, transparent 1px) 0 0 / 64px 100%,
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
.feature-label,
.section-heading {
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
.feature-action,
.section-heading a {
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
  content: "";
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

.desk-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  gap: 18px;
}

.desk-panel {
  display: grid;
  gap: 18px;
  padding: 24px;
  background: rgb(255 248 229 / 76%);
  border: 1px solid rgb(74 50 35 / 14%);
  border-radius: 28px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-heading a {
  color: var(--bronze);
}

.empty-note {
  margin: 0;
  color: var(--muted-ink);
}

.recent-list {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.recent-list li {
  display: grid;
  gap: 6px;
  padding: 16px;
  background: var(--paper);
  border: 1px solid rgb(74 50 35 / 12%);
  border-radius: 18px;
}

.recent-list span {
  color: var(--cinnabar);
  font-family: var(--font-utility);
  font-size: 12px;
  font-weight: 900;
}

.recent-list strong,
.person-chip strong {
  color: var(--ink);
}

.recent-list p {
  margin: 0;
  color: var(--muted-ink);
}

.person-strip {
  display: grid;
  gap: 12px;
}

.person-chip {
  display: grid;
  gap: 4px;
  padding: 18px;
  color: inherit;
  text-decoration: none;
  background:
    linear-gradient(90deg, rgb(184 62 44 / 14%), transparent 3px),
    var(--paper);
  border: 1px solid rgb(74 50 35 / 12%);
  border-radius: 18px;
}

.person-chip span {
  color: var(--muted-ink);
}

@media (prefers-reduced-motion: reduce) {
  .feature-card {
    transition: none;
  }
}

@media (max-width: 920px) {
  .hero-panel,
  .desk-layout {
    grid-template-columns: 1fr;
  }

  .feature-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
}
</style>

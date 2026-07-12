<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { formatHistoricalYear } from '@/domain/chinaRiverLayout'
import { useHistoryStore } from '@/stores/historyStore'

const store = useHistoryStore()
const { value: query, debounced: debouncedQuery } = useDebouncedRef('', 200)

const results = computed(() => store.search(debouncedQuery.value))
const normalizedQuery = computed(() => query.value.trim().toLowerCase())
const normalizedDebouncedQuery = computed(() =>
  debouncedQuery.value.trim().toLowerCase(),
)
const hasQuery = computed(() => normalizedQuery.value.length > 0)
const isSearchPending = computed(
  () => normalizedQuery.value !== normalizedDebouncedQuery.value,
)
const hasResults = computed(() => {
  return (
    results.value.people.length > 0 ||
    results.value.events.length > 0 ||
    results.value.cards.length > 0
  )
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>搜索</h1>
      <p>检索人物、历史事件和背诵卡片。</p>
    </header>

    <section class="panel search-panel">
      <label>
        搜索关键词
        <input
          v-model="query"
          type="search"
          placeholder="输入人物、事件、关键词或卡片内容"
          autofocus
        />
      </label>
    </section>

    <p
      v-if="isSearchPending"
      class="empty-message"
      role="status"
      aria-live="polite"
    >
      正在搜索…
    </p>
    <p v-else-if="!hasQuery" class="empty-message">请输入关键词开始搜索。</p>
    <p v-else-if="!hasResults" class="empty-message">没有找到匹配结果。</p>

    <section
      v-if="hasQuery && !isSearchPending && hasResults"
      class="result-layout"
      aria-label="搜索结果"
    >
      <section class="result-group">
        <h2>人物</h2>
        <p v-if="results.people.length === 0" class="empty-message">
          没有匹配人物。
        </p>
        <RouterLink
          v-for="person in results.people"
          :key="person.id"
          class="result-card result-link"
          :to="`/people?person=${person.id}`"
        >
          <strong>{{ person.name }}</strong>
          <span v-if="person.lifeTime">{{ person.lifeTime }}</span>
          <span v-if="person.summary">{{ person.summary }}</span>
        </RouterLink>
      </section>

      <section class="result-group">
        <h2>历史事件</h2>
        <p v-if="results.events.length === 0" class="empty-message">
          没有匹配事件。
        </p>
        <RouterLink
          v-for="event in results.events"
          :key="event.id"
          class="result-card result-link"
          :to="`/events?event=${event.id}`"
        >
          <strong>{{ formatHistoricalYear(event.year) }}：{{ event.title }}</strong>
          <p v-if="event.description">{{ event.description }}</p>
          <span class="tag-list">
            <span class="tag">{{ event.type }}</span>
          </span>
        </RouterLink>
      </section>

      <section class="result-group">
        <h2>背诵卡片</h2>
        <p v-if="results.cards.length === 0" class="empty-message">
          没有匹配卡片。
        </p>
        <article
          v-for="card in results.cards"
          :key="card.id"
          class="result-card"
        >
          <strong>正面：{{ card.front }}</strong>
          <p>背面：{{ card.back }}</p>
          <span v-if="card.keywords.length" class="tag-list">
            <span v-for="keyword in card.keywords" :key="keyword" class="tag">
              {{ keyword }}
            </span>
          </span>
        </article>
      </section>
    </section>
  </section>
</template>

<style scoped>
.page {
  display: grid;
  gap: 24px;
}

.page-header,
.panel,
.result-group,
.result-card {
  display: grid;
  gap: 16px;
}

.page-header p,
.empty-message,
.result-card p {
  margin: 0;
  color: #64708a;
}

.panel,
.result-card {
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e6f2;
  border-radius: 18px;
}

.search-panel label {
  display: grid;
  gap: 8px;
  color: #405173;
  font-weight: 700;
}

.search-panel input {
  width: 100%;
  padding: 10px 12px;
  color: #172033;
  border: 1px solid #cfd6e6;
  border-radius: 12px;
}

.result-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}

.result-group {
  align-content: start;
}

.result-group h2 {
  margin: 0;
}

.result-card {
  box-shadow: 0 8px 24px rgb(35 45 90 / 8%);
}

.result-card strong {
  color: #172033;
  font-size: 18px;
}

.result-card span {
  color: #405173;
}

.result-link {
  color: inherit;
  text-decoration: none;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 4px 10px;
  color: #445ce3;
  background: #eef1ff;
  border-radius: 999px;
}
</style>

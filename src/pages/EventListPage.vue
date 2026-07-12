<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EntityCard from '@/components/EntityCard.vue'
import RiverEventDetail from '@/components/RiverEventDetail.vue'
import { KEY_EVENTS } from '@/data/chinaHistoryRiver'
import { formatHistoricalYear } from '@/domain/chinaRiverLayout'

const route = useRoute()
const router = useRouter()

const events = computed(() => [...KEY_EVENTS].sort((a, b) => a.year - b.year))

const selectedEvent = computed(
  () =>
    events.value.find(
      (event) => event.id === String(route.query.event ?? ''),
    ) ?? null,
)

function closeEventDetail(): void {
  const query = { ...route.query }
  delete query.event
  void router.replace({ query })
}
</script>

<template>
  <section class="event-page">
    <header class="page-header">
      <p class="eyebrow">China history archive</p>
      <h1>事件</h1>
      <p class="page-intro">
        依年代浏览中华历史长河中的关键事件，点击任一卡片查看详情并记录背诵结果。
      </p>
    </header>

    <section class="event-catalog" aria-labelledby="event-catalog-title">
      <div class="catalog-heading">
        <div>
          <p class="catalog-meta">
            内置 · 只读 · {{ events.length }} 个事件
          </p>
          <h2 id="event-catalog-title">中华历史事件卡片</h2>
        </div>
        <span class="year-range">前2070年—2020年</span>
      </div>

      <div class="event-grid">
        <RouterLink
          v-for="event in events"
          :key="event.id"
          class="event-card-link"
          :data-test="`event-card-${event.id}`"
          :to="{ query: { ...route.query, event: event.id } }"
          replace
          :aria-label="`查看${event.title}详情`"
        >
          <EntityCard
            :title="event.title"
            :subtitle="formatHistoricalYear(event.year)"
            :summary="event.description"
          />
        </RouterLink>
      </div>
    </section>

    <RiverEventDetail
      v-if="selectedEvent"
      :key="selectedEvent.id"
      :event="selectedEvent"
      @close="closeEventDetail"
    />
  </section>
</template>

<style scoped>
.event-page {
  display: grid;
  gap: 28px;
}

.page-header {
  display: grid;
  gap: 10px;
  max-width: 780px;
}

.eyebrow,
.catalog-meta,
.year-range {
  color: var(--cinnabar);
  font-family: var(--font-utility);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.eyebrow,
.catalog-meta,
.page-intro {
  margin: 0;
}

.page-header h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(44px, 7vw, 74px);
  line-height: 1;
  letter-spacing: -0.06em;
}

.page-intro {
  color: var(--muted-ink);
  font-size: 17px;
  line-height: 1.8;
}

.event-catalog {
  display: grid;
  gap: 22px;
  padding: clamp(20px, 4vw, 34px);
  background: color-mix(in srgb, var(--paper) 84%, transparent);
  border: 1px solid color-mix(in srgb, var(--muted-ink) 18%, transparent);
  border-radius: 28px;
  box-shadow: 0 22px 54px color-mix(in srgb, var(--ink) 10%, transparent);
}

.catalog-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 18px;
  border-bottom: 1px solid
    color-mix(in srgb, var(--muted-ink) 18%, transparent);
}

.catalog-heading h2 {
  margin: 6px 0 0;
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.1;
}

.year-range {
  flex: 0 0 auto;
  color: var(--bronze);
  letter-spacing: 0.06em;
}

.event-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.event-card-link {
  display: block;
  min-width: 0;
  padding: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 16px;
  text-decoration: none;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.event-card-link :deep(.entity-card) {
  height: 100%;
}

.event-card-link:hover {
  box-shadow: 0 18px 36px color-mix(in srgb, var(--ink) 14%, transparent);
  transform: translateY(-3px);
}

.event-card-link:focus-visible {
  outline: 3px solid var(--cinnabar);
  outline-offset: 4px;
}

@media (max-width: 620px) {
  .event-page {
    gap: 22px;
  }

  .event-catalog {
    padding: 18px;
    border-radius: 22px;
  }

  .catalog-heading {
    align-items: start;
    flex-direction: column;
  }

  .event-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .event-card-link {
    transition: none;
  }
}
</style>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  summary?: string
}>()
</script>

<template>
  <article class="entity-card">
    <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    <h3>{{ title }}</h3>
    <p v-if="summary">{{ summary }}</p>
  </article>
</template>

<style scoped>
.entity-card {
  padding: 18px;
  color: var(--ink);
  background:
    linear-gradient(90deg, rgb(184 62 44 / 12%), transparent 4px), var(--paper);
  border: 1px solid rgb(74 50 35 / 14%);
  border-radius: 16px;
  box-shadow: 0 12px 30px rgb(36 27 20 / 10%);
}

.entity-card h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 22px;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.entity-card p:last-child {
  margin: 10px 0 0;
  color: var(--muted-ink);
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.subtitle {
  margin: 0 0 8px;
  color: var(--cinnabar);
  font-family: var(--font-utility);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
}
</style>

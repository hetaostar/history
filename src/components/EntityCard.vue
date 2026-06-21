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
  background: #fff;
  border: 1px solid #e2e6f2;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgb(35 45 90 / 8%);
}

.subtitle {
  margin: 0 0 8px;
  color: #5867e8;
  font-weight: 700;
}
</style>

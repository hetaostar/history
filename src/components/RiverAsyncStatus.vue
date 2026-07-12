<script setup lang="ts">
defineProps<{
  error?: Error
}>()
</script>

<template>
  <p
    class="river-async-status"
    :class="{ 'river-async-status--error': error }"
    :role="error ? 'alert' : 'status'"
  >
    {{
      error
        ? '中华历史长河加载失败，请刷新页面后重试。'
        : '历史长河正在汇入视野…'
    }}
  </p>
</template>

<style scoped>
.river-async-status {
  display: grid;
  min-height: var(--river-canvas-height);
  margin: 0;
  color: var(--river-page-muted);
  background: var(--river-page-background);
  border: 1px solid color-mix(in srgb, var(--river-page-gold) 32%, transparent);
  border-radius: 18px;
  font-family: var(--font-utility);
  font-weight: 800;
  text-align: center;
  place-items: center;
}

.river-async-status--error {
  color: color-mix(in srgb, var(--river-page-paper) 72%, var(--cinnabar));
}
</style>

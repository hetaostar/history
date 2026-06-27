<script setup lang="ts">
defineProps<{
  message: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div
    class="confirm-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="确认操作"
    @click.self="emit('cancel')"
  >
    <section class="confirm-modal">
      <h2>确认操作</h2>
      <p>{{ message }}</p>
      <div class="confirm-actions">
        <button class="danger-button" type="button" @click="emit('confirm')">
          确认
        </button>
        <button class="secondary-button" type="button" @click="emit('cancel')">
          取消
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(15 23 42 / 60%);
}

.confirm-modal {
  display: grid;
  width: min(420px, 100%);
  gap: 16px;
  padding: 24px;
  background: #fff;
  border: 1px solid #e2e6f2;
  border-radius: 20px;
  box-shadow: 0 24px 60px rgb(15 23 42 / 24%);
}

.confirm-modal h2,
.confirm-modal p {
  margin: 0;
}

.confirm-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.confirm-actions button {
  width: fit-content;
  padding: 10px 16px;
  color: #fff;
  cursor: pointer;
  border: 0;
  border-radius: 999px;
}

.danger-button {
  background: #c03535;
}

.secondary-button {
  background: #445ce3;
}
</style>

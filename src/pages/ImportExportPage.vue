<script setup lang="ts">
import { ref } from 'vue'
import { useHistoryStore } from '@/stores/historyStore'

const EXPORT_FILE_NAME = 'history-memorization-export.json'
const IMPORT_CONFIRM_MESSAGE = '导入会覆盖当前本地数据，确定继续吗？'
const IMPORT_FORMAT_ERROR = '导入文件格式不正确'

const store = useHistoryStore()
const fileInput = ref<HTMLInputElement | null>(null)
const errorMessage = ref('')
const successMessage = ref('')

function exportData() {
  const json = JSON.stringify(store.$state, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = EXPORT_FILE_NAME
  link.click()
  URL.revokeObjectURL(url)

  errorMessage.value = ''
  successMessage.value = '导出文件已生成。'
}

async function importData(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  errorMessage.value = ''
  successMessage.value = ''

  if (!file) {
    return
  }

  try {
    const parsed = JSON.parse(await file.text())

    if (!window.confirm(IMPORT_CONFIRM_MESSAGE)) {
      successMessage.value = '已取消导入。'
      return
    }

    store.replaceAll(parsed)
    successMessage.value = '导入成功。'
  } catch {
    errorMessage.value = IMPORT_FORMAT_ERROR
  } finally {
    input.value = ''
  }
}
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>导入导出</h1>
      <p>导出本地历史资料，或用 JSON 文件覆盖恢复当前数据。</p>
    </header>

    <section class="panel">
      <h2>导出数据</h2>
      <p>会下载当前全部本地数据，文件名为 {{ EXPORT_FILE_NAME }}。</p>
      <button type="button" @click="exportData">导出 JSON 文件</button>
    </section>

    <section class="panel">
      <h2>导入数据</h2>
      <p>请选择之前导出的 JSON 文件。导入前会再次确认，确认后覆盖当前数据。</p>
      <input
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        @change="importData"
      />
    </section>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
  </section>
</template>

<style scoped>
.page {
  display: grid;
  gap: 24px;
}

.page-header,
.panel {
  display: grid;
  gap: 16px;
}

.page-header p,
.panel p,
.error-message,
.success-message {
  margin: 0;
}

.page-header p,
.panel p {
  color: #64708a;
}

.panel {
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e6f2;
  border-radius: 18px;
}

.panel h2 {
  margin: 0;
}

.panel button {
  width: fit-content;
  padding: 10px 16px;
  color: #fff;
  cursor: pointer;
  background: #445ce3;
  border: 0;
  border-radius: 999px;
}

.panel input {
  width: 100%;
  padding: 10px 12px;
  color: #172033;
  border: 1px solid #cfd6e6;
  border-radius: 12px;
}

.error-message {
  color: #c03535;
}

.success-message {
  color: #247a45;
}
</style>

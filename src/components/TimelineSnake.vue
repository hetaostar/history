<script setup lang="ts">
import { computed } from 'vue'
import { createSnakeRows } from '@/domain/timelineLayout'
import type { IHistoryEvent, StudyResult } from '@/domain/historyTypes'

const props = defineProps<{
  events: IHistoryEvent[]
  studyResults?: Record<string, StudyResult | undefined>
  isBatchDeleteVisible?: boolean
  selectedEventIds?: string[]
}>()

const emit = defineEmits<{
  select: [event: IHistoryEvent]
  edit: [event: IHistoryEvent]
  toggleSelect: [eventId: string]
}>()

const rows = computed(() => createSnakeRows(props.events, 3))

function selectEvent(event: IHistoryEvent) {
  if (props.isBatchDeleteVisible) {
    emit('toggleSelect', event.id)
    return
  }

  emit('select', event)
}
</script>

<template>
  <div class="timeline-snake" aria-label="连续蛇形时间线">
    <div
      v-for="(row, rowIndex) in rows"
      :key="rowIndex"
      class="snake-row"
      :class="`snake-row--${row.direction}`"
    >
      <article
        v-for="event in row.items"
        :key="event.id"
        class="event-node"
        role="button"
        tabindex="0"
        @click="selectEvent(event)"
        @keydown.enter.prevent="selectEvent(event)"
        @keydown.space.prevent="selectEvent(event)"
      >
        <input
          v-if="props.isBatchDeleteVisible"
          class="select-event-checkbox"
          type="checkbox"
          :checked="props.selectedEventIds?.includes(event.id)"
          aria-label="选择事件"
          @click.stop="emit('toggleSelect', event.id)"
          @keydown.stop
        />
        <span
          class="edit-event-button"
          data-test="edit-event"
          role="button"
          tabindex="0"
          aria-label="编辑事件"
          @click.stop="emit('edit', event)"
          @keydown.enter.stop.prevent="emit('edit', event)"
          @keydown.space.stop.prevent="emit('edit', event)"
        >
          ✎
        </span>
        <span class="event-time">{{ event.timeLabel }}</span>
        <strong>{{ event.title }}</strong>
        <span>{{ event.summary }}</span>
        <span
          class="study-status"
          :class="`study-status--${props.studyResults?.[event.id] ?? 'forgotten'}`"
        >
          {{ props.studyResults?.[event.id] === 'remembered' ? '已背过' : '未背过' }}
        </span>
      </article>
    </div>
  </div>
</template>

<style scoped>
.timeline-snake {
  display: grid;
  gap: 56px;
  padding: 32px 24px;
}

.snake-row {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 24px;
}

.snake-row::before {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 8px;
  content: "";
  background: #5867e8;
  border-radius: 999px;
  transform: translateY(-50%);
}

.snake-row:not(:last-child)::after {
  position: absolute;
  top: 50%;
  width: 48px;
  height: 72px;
  content: "";
  border: 8px solid #5867e8;
}

.snake-row--ltr:not(:last-child)::after {
  right: -24px;
  border-left: 0;
  border-radius: 0 999px 999px 0;
}

.snake-row--rtl:not(:last-child)::after {
  left: -24px;
  border-right: 0;
  border-radius: 999px 0 0 999px;
}

.event-node {
  position: relative;
  z-index: 1;
  display: grid;
  width: 30%;
  min-height: 128px;
  gap: 8px;
  padding: 18px 52px 18px 18px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 3px solid #5867e8;
  border-radius: 18px;
  box-shadow: 0 12px 30px rgb(45 55 120 / 12%);
}

.event-node:focus-visible {
  outline: 3px solid #9aa8ff;
  outline-offset: 4px;
}

.select-event-checkbox {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.edit-event-button {
  position: absolute;
  top: 10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: #445ce3;
  background: #eef1ff;
  border-radius: 999px;
}

.event-time {
  color: #5867e8;
  font-weight: 700;
}

.event-node strong,
.event-node span {
  overflow-wrap: anywhere;
}

.study-status {
  width: fit-content;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
}

.study-status--remembered {
  color: #237a48;
  background: #e8f7ee;
}

.study-status--forgotten {
  color: #a9471b;
  background: #fff1e8;
}
</style>

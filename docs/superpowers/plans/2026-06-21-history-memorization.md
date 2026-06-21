# History Memorization MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个电脑浏览器网页版历史背诵辅助软件，支持人物线索、连续蛇形时间线、卡片背诵、关键词搜索、本地保存和 JSON 导入导出。

**Architecture:** 使用 Vue 3 单页应用。业务数据集中在 Pinia store 中，数据结构放在 `src/domain/`，页面放在 `src/pages/`，可复用交互组件放在 `src/components/`。第一版没有后端，数据通过浏览器 `localStorage` 持久化，并通过 JSON 文件导入导出。

**Tech Stack:** Vue 3、Vite、TypeScript、vue-router、pinia、axios、Vitest、@vue/test-utils、happy-dom。第一版不引入 UI 组件库，使用原生 HTML 与 scoped CSS；不引入被禁止的 `nanoid`，ID 使用 `crypto.randomUUID()` 并提供降级实现。

---

## Scope Check

本计划只覆盖第一版 MVP。第二版 AI 解析、账号系统、云端同步、错题本、熟练度算法和复习计划不进入本计划。

## File Structure

- `package.json`：项目脚本和依赖。
- `index.html`：Vite 入口 HTML。
- `vite.config.ts`：Vue 与 Vitest 配置。
- `tsconfig.json`、`tsconfig.node.json`：TypeScript 配置。
- `src/main.ts`：创建 Vue 应用、注册 router 和 Pinia。
- `src/App.vue`：应用壳，包含顶部导航和路由出口。
- `src/router/index.ts`：页面路由。
- `src/domain/historyTypes.ts`：时间线、历史事件、人物、背诵卡片、背诵记录类型。
- `src/domain/createId.ts`：ID 生成。
- `src/domain/historySchema.ts`：导入数据校验与默认数据结构。
- `src/domain/timelineLayout.ts`：连续蛇形时间线布局分行算法。
- `src/stores/historyStore.ts`：Pinia store，负责 CRUD、搜索、背诵记录、导入导出。
- `src/components/EntityCard.vue`：通用预览卡片。
- `src/components/StudyRevealCard.vue`：遮挡、展开、标记“记住了 / 没记住”的通用背诵卡片。
- `src/components/TimelineSnake.vue`：连续蛇形时间线展示。
- `src/pages/HomePage.vue`：首页。
- `src/pages/TimelineListPage.vue`：时间线主页。
- `src/pages/TimelineDetailPage.vue`：时间线详情页。
- `src/pages/PersonListPage.vue`：人物主页。
- `src/pages/PersonDetailPage.vue`：人物详情页。
- `src/pages/FlashcardPage.vue`：卡片背诵页。
- `src/pages/SearchPage.vue`：搜索页。
- `src/pages/ImportExportPage.vue`：导入导出页。
- `src/styles/base.css`：全局样式。
- `src/**/*.spec.ts`：单元测试与组件测试。

## Task 1: Initialize Vue Project

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `src/main.ts`
- Create: `src/App.vue`
- Create: `src/styles/base.css`

- [ ] **Step 1: Write project manifest**

Create `package.json`:

```json
{
  "name": "history-memorization",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@vitejs/plugin-vue": "latest",
    "axios": "latest",
    "pinia": "latest",
    "vue": "latest",
    "vue-router": "latest"
  },
  "devDependencies": {
    "@vue/test-utils": "latest",
    "happy-dom": "latest",
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest",
    "vue-tsc": "latest"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` is created and install finishes without errors.

- [ ] **Step 3: Add Vite and TypeScript config**

Create `vite.config.ts`:

```ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
})
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Add app shell**

Create `index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>历史背诵助手</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Create `src/main.ts`:

```ts
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './styles/base.css'

createApp(App).use(createPinia()).use(router).mount('#app')
```

Create `src/App.vue`:

```vue
<template>
  <div class="app-shell">
    <header class="app-header">
      <RouterLink to="/" class="brand">历史背诵助手</RouterLink>
      <nav class="nav-links">
        <RouterLink to="/people">人物</RouterLink>
        <RouterLink to="/timelines">时间线</RouterLink>
        <RouterLink to="/cards">卡片背诵</RouterLink>
        <RouterLink to="/search">搜索</RouterLink>
        <RouterLink to="/data">导入导出</RouterLink>
      </nav>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
```

Create `src/styles/base.css`:

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  color: #172033;
  background: #f6f7fb;
  font-family:
    Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button,
input,
textarea,
select {
  font: inherit;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 32px;
  background: #fff;
  border-bottom: 1px solid #e7eaf3;
}

.brand {
  color: #172033;
  font-weight: 700;
  text-decoration: none;
}

.nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.nav-links a {
  color: #405173;
  text-decoration: none;
}

.nav-links a.router-link-active {
  color: #445ce3;
  font-weight: 700;
}

.app-main {
  width: min(1180px, calc(100vw - 48px));
  margin: 0 auto;
  padding: 32px 0 56px;
}
```

- [ ] **Step 5: Run build**

Run:

```bash
pnpm build
```

Expected: build fails only because `src/router` does not exist yet. This confirms the toolchain is installed.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml index.html vite.config.ts tsconfig.json tsconfig.node.json src
git commit -m "chore(app): initialize vue history memorization app"
```

## Task 2: Add Routing and Placeholder Pages

**Files:**
- Create: `src/router/index.ts`
- Create: `src/pages/HomePage.vue`
- Create: `src/pages/TimelineListPage.vue`
- Create: `src/pages/TimelineDetailPage.vue`
- Create: `src/pages/PersonListPage.vue`
- Create: `src/pages/PersonDetailPage.vue`
- Create: `src/pages/FlashcardPage.vue`
- Create: `src/pages/SearchPage.vue`
- Create: `src/pages/ImportExportPage.vue`

- [ ] **Step 1: Create router**

Create `src/router/index.ts`:

```ts
import { createRouter, createWebHistory } from 'vue-router'
import FlashcardPage from '@/pages/FlashcardPage.vue'
import HomePage from '@/pages/HomePage.vue'
import ImportExportPage from '@/pages/ImportExportPage.vue'
import PersonDetailPage from '@/pages/PersonDetailPage.vue'
import PersonListPage from '@/pages/PersonListPage.vue'
import SearchPage from '@/pages/SearchPage.vue'
import TimelineDetailPage from '@/pages/TimelineDetailPage.vue'
import TimelineListPage from '@/pages/TimelineListPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/timelines', component: TimelineListPage },
    { path: '/timelines/:timelineId', component: TimelineDetailPage },
    { path: '/people', component: PersonListPage },
    { path: '/people/:personId', component: PersonDetailPage },
    { path: '/cards', component: FlashcardPage },
    { path: '/search', component: SearchPage },
    { path: '/data', component: ImportExportPage },
  ],
})
```

- [ ] **Step 2: Create placeholder pages**

Each page should compile and expose a stable heading.

Example for `src/pages/HomePage.vue`:

```vue
<template>
  <section class="page">
    <h1>首页</h1>
    <p>从人物、时间线或卡片背诵开始。</p>
  </section>
</template>
```

Create the other pages with these headings:

- `TimelineListPage.vue`：`时间线主页`
- `TimelineDetailPage.vue`：`时间线详情`
- `PersonListPage.vue`：`人物主页`
- `PersonDetailPage.vue`：`人物详情`
- `FlashcardPage.vue`：`卡片背诵`
- `SearchPage.vue`：`搜索`
- `ImportExportPage.vue`：`导入导出`

- [ ] **Step 3: Run build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/router src/pages
git commit -m "feat(router): add primary history app routes"
```

## Task 3: Define Domain Types and Import Schema

**Files:**
- Create: `src/domain/historyTypes.ts`
- Create: `src/domain/createId.ts`
- Create: `src/domain/historySchema.ts`
- Test: `src/domain/historySchema.spec.ts`

- [ ] **Step 1: Write failing schema tests**

Create `src/domain/historySchema.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createEmptyHistoryData, parseHistoryData } from './historySchema'

describe('historySchema', () => {
  it('creates empty data with every collection', () => {
    expect(createEmptyHistoryData()).toEqual({
      timelines: [],
      events: [],
      people: [],
      cards: [],
      studyRecords: [],
    })
  })

  it('accepts valid exported data', () => {
    const data = createEmptyHistoryData()
    expect(parseHistoryData(data)).toEqual(data)
  })

  it('rejects objects missing required collections', () => {
    expect(() => parseHistoryData({ timelines: [] })).toThrow(
      '导入文件格式不正确',
    )
  })
})
```

- [ ] **Step 2: Run failing test**

Run:

```bash
pnpm test src/domain/historySchema.spec.ts
```

Expected: FAIL because `historySchema.ts` does not exist.

- [ ] **Step 3: Add domain types**

Create `src/domain/historyTypes.ts`:

```ts
export type StudyTargetType = 'person' | 'event' | 'card'
export type StudyResult = 'remembered' | 'forgotten'

export interface ITimeline {
  id: string
  name: string
  description: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface IHistoryEvent {
  id: string
  timelineId: string
  timeLabel: string
  sortValue: number
  title: string
  hint: string
  summary: string
  detail: string
  keywords: string[]
  personIds: string[]
  createdAt: string
  updatedAt: string
}

export interface IPerson {
  id: string
  name: string
  lifeTime: string
  summary: string
  biography: string
  achievements: string
  keywords: string[]
  createdAt: string
  updatedAt: string
}

export interface IStudyCard {
  id: string
  front: string
  back: string
  keywords: string[]
  personIds: string[]
  eventIds: string[]
  createdAt: string
  updatedAt: string
}

export interface IStudyRecord {
  id: string
  targetType: StudyTargetType
  targetId: string
  result: StudyResult
  createdAt: string
}

export interface IHistoryData {
  timelines: ITimeline[]
  events: IHistoryEvent[]
  people: IPerson[]
  cards: IStudyCard[]
  studyRecords: IStudyRecord[]
}
```

Create `src/domain/createId.ts`:

```ts
export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
```

- [ ] **Step 4: Add schema parser**

Create `src/domain/historySchema.ts`:

```ts
import type { IHistoryData } from './historyTypes'

const REQUIRED_COLLECTIONS: Array<keyof IHistoryData> = [
  'timelines',
  'events',
  'people',
  'cards',
  'studyRecords',
]

export function createEmptyHistoryData(): IHistoryData {
  return {
    timelines: [],
    events: [],
    people: [],
    cards: [],
    studyRecords: [],
  }
}

export function parseHistoryData(value: unknown): IHistoryData {
  if (!isRecord(value)) {
    throw new Error('导入文件格式不正确')
  }

  for (const key of REQUIRED_COLLECTIONS) {
    if (!Array.isArray(value[key])) {
      throw new Error('导入文件格式不正确')
    }
  }

  return {
    timelines: value.timelines,
    events: value.events,
    people: value.people,
    cards: value.cards,
    studyRecords: value.studyRecords,
  } as IHistoryData
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm test src/domain/historySchema.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain
git commit -m "feat(domain): define history memorization data model"
```

## Task 4: Implement Pinia Store and Persistence

**Files:**
- Create: `src/stores/historyStore.ts`
- Test: `src/stores/historyStore.spec.ts`

- [ ] **Step 1: Write failing store tests**

Create `src/stores/historyStore.spec.ts`:

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHistoryStore } from './historyStore'

describe('historyStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('creates a timeline and an event without requiring people', () => {
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '中国古代史',
      description: '先秦到明清',
      tags: ['中国史'],
    })

    const event = store.createEvent({
      timelineId: timeline.id,
      timeLabel: '前221年',
      sortValue: -221,
      title: '秦统一六国',
      hint: '秦、统一、中央集权',
      summary: '秦完成统一，建立中央集权国家。',
      detail: '秦王嬴政灭六国，建立统一多民族国家。',
      keywords: ['秦', '统一'],
      personIds: [],
    })

    expect(event.personIds).toEqual([])
    expect(store.eventsByTimeline(timeline.id)).toHaveLength(1)
  })

  it('searches people, events, timelines and cards', () => {
    const store = useHistoryStore()
    const timeline = store.createTimeline({
      name: '世界近代史',
      description: '近代世界发展',
      tags: [],
    })
    store.createEvent({
      timelineId: timeline.id,
      timeLabel: '1789年',
      sortValue: 1789,
      title: '法国大革命',
      hint: '法国',
      summary: '法国大革命爆发。',
      detail: '法国大革命冲击欧洲封建秩序。',
      keywords: ['革命'],
      personIds: [],
    })
    store.createCard({
      front: '法国大革命爆发于哪一年？',
      back: '1789年',
      keywords: ['法国'],
      personIds: [],
      eventIds: [],
    })

    const result = store.search('法国')
    expect(result.events).toHaveLength(1)
    expect(result.cards).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run failing test**

Run:

```bash
pnpm test src/stores/historyStore.spec.ts
```

Expected: FAIL because `historyStore.ts` does not exist.

- [ ] **Step 3: Implement store**

Create `src/stores/historyStore.ts` with these public actions and getters:

```ts
import { defineStore } from 'pinia'
import { createId } from '@/domain/createId'
import {
  createEmptyHistoryData,
  parseHistoryData,
} from '@/domain/historySchema'
import type {
  IHistoryData,
  IHistoryEvent,
  IPerson,
  IStudyCard,
  IStudyRecord,
  ITimeline,
  StudyResult,
  StudyTargetType,
} from '@/domain/historyTypes'

const STORAGE_KEY = 'history-memorization:data'

type TimelineInput = Pick<ITimeline, 'name' | 'description' | 'tags'>
type EventInput = Omit<IHistoryEvent, 'id' | 'createdAt' | 'updatedAt'>
type PersonInput = Omit<IPerson, 'id' | 'createdAt' | 'updatedAt'>
type CardInput = Omit<IStudyCard, 'id' | 'createdAt' | 'updatedAt'>

export const useHistoryStore = defineStore('history', {
  state: (): IHistoryData => loadHistoryData(),
  actions: {
    createTimeline(input: TimelineInput): ITimeline {
      const timeline: ITimeline = {
        id: createId(),
        ...input,
        createdAt: now(),
        updatedAt: now(),
      }
      this.timelines.push(timeline)
      this.persist()
      return timeline
    },
    createEvent(input: EventInput): IHistoryEvent {
      const event: IHistoryEvent = {
        id: createId(),
        ...input,
        personIds: input.personIds ?? [],
        createdAt: now(),
        updatedAt: now(),
      }
      this.events.push(event)
      this.persist()
      return event
    },
    createPerson(input: PersonInput): IPerson {
      const person: IPerson = {
        id: createId(),
        ...input,
        createdAt: now(),
        updatedAt: now(),
      }
      this.people.push(person)
      this.persist()
      return person
    },
    createCard(input: CardInput): IStudyCard {
      const card: IStudyCard = {
        id: createId(),
        ...input,
        personIds: input.personIds ?? [],
        eventIds: input.eventIds ?? [],
        createdAt: now(),
        updatedAt: now(),
      }
      this.cards.push(card)
      this.persist()
      return card
    },
    recordStudy(
      targetType: StudyTargetType,
      targetId: string,
      result: StudyResult,
    ): IStudyRecord {
      const record: IStudyRecord = {
        id: createId(),
        targetType,
        targetId,
        result,
        createdAt: now(),
      }
      this.studyRecords.push(record)
      this.persist()
      return record
    },
    replaceAll(data: unknown): void {
      const parsed = parseHistoryData(data)
      this.timelines = parsed.timelines
      this.events = parsed.events
      this.people = parsed.people
      this.cards = parsed.cards
      this.studyRecords = parsed.studyRecords
      this.persist()
    },
    persist(): void {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          timelines: this.timelines,
          events: this.events,
          people: this.people,
          cards: this.cards,
          studyRecords: this.studyRecords,
        }),
      )
    },
    eventsByTimeline(timelineId: string): IHistoryEvent[] {
      return this.events
        .filter((event) => event.timelineId === timelineId)
        .sort((a, b) => a.sortValue - b.sortValue)
    },
    eventsByPerson(personId: string): IHistoryEvent[] {
      return this.events.filter((event) => event.personIds.includes(personId))
    },
    search(query: string) {
      const keyword = query.trim().toLowerCase()
      const includes = (values: string[]) =>
        values.some((value) => value.toLowerCase().includes(keyword))

      if (!keyword) {
        return { timelines: [], events: [], people: [], cards: [] }
      }

      return {
        timelines: this.timelines.filter((timeline) =>
          includes([timeline.name, timeline.description, ...timeline.tags]),
        ),
        events: this.events.filter((event) =>
          includes([
            event.timeLabel,
            event.title,
            event.hint,
            event.summary,
            event.detail,
            ...event.keywords,
          ]),
        ),
        people: this.people.filter((person) =>
          includes([
            person.name,
            person.lifeTime,
            person.summary,
            person.biography,
            person.achievements,
            ...person.keywords,
          ]),
        ),
        cards: this.cards.filter((card) =>
          includes([card.front, card.back, ...card.keywords]),
        ),
      }
    },
  },
})

function loadHistoryData(): IHistoryData {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return createEmptyHistoryData()
  }

  try {
    return parseHistoryData(JSON.parse(raw))
  } catch {
    return createEmptyHistoryData()
  }
}

function now(): string {
  return new Date().toISOString()
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
pnpm test src/stores/historyStore.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores
git commit -m "feat(store): add local history data store"
```

## Task 5: Implement Continuous Snake Timeline Layout

**Files:**
- Create: `src/domain/timelineLayout.ts`
- Test: `src/domain/timelineLayout.spec.ts`
- Create: `src/components/TimelineSnake.vue`
- Test: `src/components/TimelineSnake.spec.ts`

- [ ] **Step 1: Write layout tests**

Create `src/domain/timelineLayout.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createSnakeRows } from './timelineLayout'

describe('createSnakeRows', () => {
  it('chunks events and reverses every second row', () => {
    const rows = createSnakeRows(['a', 'b', 'c', 'd', 'e'], 3)

    expect(rows).toEqual([
      { direction: 'ltr', items: ['a', 'b', 'c'] },
      { direction: 'rtl', items: ['e', 'd'] },
    ])
  })
})
```

- [ ] **Step 2: Implement layout helper**

Create `src/domain/timelineLayout.ts`:

```ts
export interface ISnakeRow<Item> {
  direction: 'ltr' | 'rtl'
  items: Item[]
}

export function createSnakeRows<Item>(
  items: Item[],
  itemsPerRow: number,
): Array<ISnakeRow<Item>> {
  const rows: Array<ISnakeRow<Item>> = []

  for (let index = 0; index < items.length; index += itemsPerRow) {
    const rowIndex = rows.length
    const direction = rowIndex % 2 === 0 ? 'ltr' : 'rtl'
    const chunk = items.slice(index, index + itemsPerRow)
    rows.push({
      direction,
      items: direction === 'ltr' ? chunk : [...chunk].reverse(),
    })
  }

  return rows
}
```

- [ ] **Step 3: Add timeline component**

Create `src/components/TimelineSnake.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { createSnakeRows } from '@/domain/timelineLayout'
import type { IHistoryEvent } from '@/domain/historyTypes'

const props = defineProps<{
  events: IHistoryEvent[]
}>()

const emit = defineEmits<{
  select: [event: IHistoryEvent]
}>()

const rows = computed(() => createSnakeRows(props.events, 3))
</script>

<template>
  <div class="timeline-snake" aria-label="连续蛇形时间线">
    <div
      v-for="(row, rowIndex) in rows"
      :key="rowIndex"
      class="snake-row"
      :class="`snake-row--${row.direction}`"
    >
      <button
        v-for="event in row.items"
        :key="event.id"
        class="event-node"
        type="button"
        @click="emit('select', event)"
      >
        <span class="event-time">{{ event.timeLabel }}</span>
        <strong>{{ event.title }}</strong>
        <span>{{ event.summary }}</span>
      </button>
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
  padding: 16px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 3px solid #5867e8;
  border-radius: 18px;
  box-shadow: 0 12px 30px rgb(45 55 120 / 12%);
}

.event-time {
  color: #5867e8;
  font-weight: 700;
}
```

- [ ] **Step 4: Run tests and build**

Run:

```bash
pnpm test src/domain/timelineLayout.spec.ts && pnpm build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/timelineLayout.ts src/domain/timelineLayout.spec.ts src/components/TimelineSnake.vue
git commit -m "feat(timeline): add continuous snake timeline layout"
```

## Task 6: Implement Reusable Cards and Study Reveal

**Files:**
- Create: `src/components/EntityCard.vue`
- Create: `src/components/StudyRevealCard.vue`
- Test: `src/components/StudyRevealCard.spec.ts`

- [ ] **Step 1: Write reveal component test**

Create `src/components/StudyRevealCard.spec.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StudyRevealCard from './StudyRevealCard.vue'

describe('StudyRevealCard', () => {
  it('hides answer before reveal and emits result after reveal', async () => {
    const wrapper = mount(StudyRevealCard, {
      props: {
        prompt: '秦统一六国是哪一年？',
        answer: '前221年',
      },
    })

    expect(wrapper.text()).not.toContain('前221年')
    await wrapper.get('[data-test="reveal"]').trigger('click')
    expect(wrapper.text()).toContain('前221年')
    await wrapper.get('[data-test="remembered"]').trigger('click')
    expect(wrapper.emitted('mark')?.[0]).toEqual(['remembered'])
  })
})
```

- [ ] **Step 2: Add components**

Create `src/components/EntityCard.vue`:

```vue
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
```

Create `src/components/StudyRevealCard.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { StudyResult } from '@/domain/historyTypes'

defineProps<{
  prompt: string
  answer: string
}>()

const emit = defineEmits<{
  mark: [result: StudyResult]
}>()

const revealed = ref(false)
</script>

<template>
  <article class="study-card">
    <h3>{{ prompt }}</h3>
    <div v-if="revealed" class="answer">{{ answer }}</div>
    <div v-else class="covered">答案已遮挡，请先回忆。</div>

    <div class="actions">
      <button data-test="reveal" type="button" @click="revealed = true">
        展开答案
      </button>
      <button
        v-if="revealed"
        data-test="remembered"
        type="button"
        @click="emit('mark', 'remembered')"
      >
        记住了
      </button>
      <button
        v-if="revealed"
        type="button"
        @click="emit('mark', 'forgotten')"
      >
        没记住
      </button>
    </div>
  </article>
</template>

<style scoped>
.study-card {
  display: grid;
  gap: 16px;
  padding: 24px;
  background: #fff;
  border: 1px solid #e2e6f2;
  border-radius: 18px;
}

.covered {
  padding: 24px;
  color: #6d7892;
  text-align: center;
  background: repeating-linear-gradient(
    -45deg,
    #f0f2fa,
    #f0f2fa 12px,
    #e6e9f5 12px,
    #e6e9f5 24px
  );
  border-radius: 14px;
}

.answer {
  white-space: pre-wrap;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
```

- [ ] **Step 3: Run component test**

Run:

```bash
pnpm test src/components/StudyRevealCard.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components
git commit -m "feat(study): add reusable reveal study card"
```

## Task 7: Implement Timeline Pages

**Files:**
- Modify: `src/pages/TimelineListPage.vue`
- Modify: `src/pages/TimelineDetailPage.vue`

- [ ] **Step 1: Implement timeline list page**

`TimelineListPage.vue` should:

- Show all timelines.
- Create a new timeline using name, description and tags.
- Link each timeline to `/timelines/:timelineId`.

Use `store.createTimeline({ name, description, tags })` and validate `name.trim()` before saving.

- [ ] **Step 2: Implement timeline detail page**

`TimelineDetailPage.vue` should:

- Load `timelineId` from route params.
- Show sorted events using `store.eventsByTimeline(timelineId)`.
- Render events with `TimelineSnake`.
- Provide a form for time, sort value, title, hint, summary, detail, keywords and optional person IDs.
- Open selected event details in an inline detail panel.
- Provide a study section using `StudyRevealCard`, where prompt is `${event.timeLabel}：${event.hint}` and answer is `${event.title}\n\n${event.detail}`.

- [ ] **Step 3: Run build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Manual check**

Run:

```bash
pnpm dev
```

Expected:

- `/timelines` can create a timeline.
- `/timelines/:timelineId` can create an event without selecting a person.
- The event appears on a continuous snake timeline.
- Clicking the event shows details.

- [ ] **Step 5: Commit**

```bash
git add src/pages/TimelineListPage.vue src/pages/TimelineDetailPage.vue
git commit -m "feat(timeline): implement timeline browsing and study flow"
```

## Task 8: Implement Person Pages

**Files:**
- Modify: `src/pages/PersonListPage.vue`
- Modify: `src/pages/PersonDetailPage.vue`

- [ ] **Step 1: Implement person list page**

`PersonListPage.vue` should:

- Show all people.
- Create a person with name, life time, summary, biography, achievements and keywords.
- Link each person to `/people/:personId`.
- Validate `name.trim()` before saving.

- [ ] **Step 2: Implement person detail page**

`PersonDetailPage.vue` should:

- Load `personId` from route params.
- Show name, life time, summary, biography and achievements.
- Show related events from `store.eventsByPerson(personId)`.
- Open event details when a related event card is clicked.
- Provide person study with prompt as the person name and answer as biography, achievements and related event titles.

- [ ] **Step 3: Run build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PersonListPage.vue src/pages/PersonDetailPage.vue
git commit -m "feat(people): implement person browsing and study flow"
```

## Task 9: Implement Flashcard Page

**Files:**
- Modify: `src/pages/FlashcardPage.vue`

- [ ] **Step 1: Implement card CRUD and study**

`FlashcardPage.vue` should:

- Show all study cards.
- Create a card with front, back, keywords, optional person IDs and optional event IDs.
- Validate `front.trim()` and `back.trim()` before saving.
- Show card detail when selected.
- Use `StudyRevealCard` to hide the back until reveal.
- Call `store.recordStudy('card', card.id, result)` after marking.

- [ ] **Step 2: Run build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 3: Manual check**

Expected:

- A standalone card can be created without people or events.
- A card can be studied and marked.
- A study record is added.

- [ ] **Step 4: Commit**

```bash
git add src/pages/FlashcardPage.vue
git commit -m "feat(cards): add standalone flashcard study mode"
```

## Task 10: Implement Search and Import/Export

**Files:**
- Modify: `src/pages/SearchPage.vue`
- Modify: `src/pages/ImportExportPage.vue`

- [ ] **Step 1: Implement search page**

`SearchPage.vue` should:

- Bind a search input to `store.search(query)`.
- Show grouped results for people, timelines, events and cards.
- Link people and timelines to their detail pages.
- For events and cards, show inline detail because events belong inside timeline pages and cards live on `/cards`.

- [ ] **Step 2: Implement import/export page**

`ImportExportPage.vue` should:

- Export `store.$state` as a JSON file named `history-memorization-export.json`.
- Import a selected JSON file.
- Parse it with `JSON.parse`.
- Call `store.replaceAll(parsed)` only after `window.confirm('导入会覆盖当前本地数据，确定继续吗？')`.
- Show `导入文件格式不正确` when parsing or schema validation fails.

- [ ] **Step 3: Run build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Manual check**

Expected:

- Searching a keyword can find people, timelines, events and cards.
- Export downloads a JSON file.
- Importing that JSON restores data.
- Importing an invalid JSON file does not overwrite current data.

- [ ] **Step 5: Commit**

```bash
git add src/pages/SearchPage.vue src/pages/ImportExportPage.vue
git commit -m "feat(data): add search and json import export"
```

## Task 11: Final Verification

**Files:**
- Modify only files required to fix verification failures.

- [ ] **Step 1: Run full test suite**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 3: Manual MVP walkthrough**

Run:

```bash
pnpm dev
```

Verify:

- Create a timeline.
- Create a timeline event without a person.
- See the event on the continuous snake timeline.
- Click the event and see its full details.
- Create a person.
- Associate an event with the person by adding the person ID to that event.
- Open the person page and see related events.
- Create a standalone flashcard.
- Study person, timeline event and flashcard cards.
- Mark “记住了” and “没记住”.
- Search finds people, timelines, events and flashcards.
- Export data.
- Clear local storage in DevTools.
- Import the exported JSON and see data restored.

- [ ] **Step 4: Commit fixes**

If verification required fixes:

```bash
git add src
git commit -m "fix(app): resolve history memorization mvp verification issues"
```

If no fixes were required, do not create an empty commit.

## Self-Review

- Spec coverage: the plan covers timeline CRUD, person CRUD, event CRUD, optional event-person relation, continuous snake timeline, card details, standalone and associated flashcards, three study modes, study records, search, local storage, JSON import/export, and invalid import protection.
- Placeholder scan: each task names concrete files, commands, expected results and implementation details.
- Type consistency: `ITimeline`, `IHistoryEvent`, `IPerson`, `IStudyCard`, `IStudyRecord`, `personIds`, `eventIds`, `StudyTargetType` and store method names are consistent across tasks.
- Scope: AI parsing, cloud sync, account system and advanced spaced repetition remain out of scope for this MVP.

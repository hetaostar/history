# 历史背诵助手 - 全量问题修复与测试补强计划

## Summary

把上一轮代码审查列出的 P0/P1/P2 共 14 项问题全部修复，并补齐对应的测试用例用于验收。同时按用户确认范围，加入三项工具/文档补强：调查并修复 `tsconfig.json` 的 `ignoreDeprecations`、引入 ESLint + Prettier、补一份 README.md。**P3 架构级改动（IndexedDB、倒排索引、BulkDeleteController composable 抽取）按用户决定不在本次范围内**，留待后续单独立项。

最终交付：所有原有测试通过、新增测试通过、`npm run build` 通过、`npm test` 通过、lint 无 error。

## Current State Analysis

项目是一个 Vue 3 + TypeScript + Pinia + Vite 的浏览器端单页应用，本地 `localStorage` 持久化，无后端。代码结构清晰（`src/domain`、`src/stores`、`src/pages`、`src/components`），现有测试 6 个 spec 文件 / 32 个用例 / 1 个失败。

已经验证的当前状态：
- `npm run build` 通过（vue-tsc + vite build 都过）。
- `npm test` 1 个失败：`src/components/TimelineSnake.spec.ts:33` 用 `findAll('button')[0]` 但组件渲染的是 `<article role="button">`，找不到 `<button>` 元素。
- 实际安装版本：`vite@8.1.3`、`vitest@4.1.10`、`vue@3.x`、`pinia@2.x` 等，但 `package.json` 全部写 `"latest"`，不可重现。
- 设计文档（`docs/superpowers/specs/2026-06-21-history-memorization-design.md`）已明确"第一版"范围，本次修复不偏离该范围。
- 项目无 ESLint/Prettier 配置，无 README。

上一轮已逐项核实的问题清单（共 14 项代码问题 + 3 项工具/文档）：
1. **测试失败**：`TimelineSnake.spec.ts` 选择器与组件实现不符。
2. **依赖版本**：`package.json` 全部用 `"latest"`。
3. **导出污染**：`ImportExportPage.vue:15` 用 `JSON.stringify(store.$state)` 会把 `lastError` 写进导出文件。
4. **`sortValue` 是僵尸字段**：`IHistoryEvent.sortValue` 由 store 内部派生覆盖，调用方都传 `0`。
5. **空时间线被算成"未背过"**：`TimelineListPage.vue:228-235` `isTimelineRemembered` 在无事件时返回 `false`。
6. **`getLatestCardStudyResult` 性能**：每张卡片 reverse 全量 `studyRecords`，`O(cards × records)`。
7. **缺 schema 版本号与迁移机制**：`historySchema.ts` 只做结构校验，老数据无法迁移。
8. **删除确认 UX 不统一**：单条删除用 `window.confirm`，批量删除用 `ConfirmActionModal`。
9. **`SearchPage` 无防抖**：每次按键全量扫描。
10. **路由全部 eager import**：`router/index.ts` 同步引入 8 个页面。
11. **模态无 ESC 关闭、无 focus trap**：`role="dialog"` 多处但 a11y 不完整。
12. **`localStorage` 调用未防御**：`historyStore.ts:294` 直接访问 `localStorage`。
13. **`getTimeSortValue` 对模糊时间不稳健**：`/\d+/` 抓第一个数字串，"10月革命"→10。
14. **测试覆盖缺口**：`createId.ts`、`EntityCard.vue`、`ConfirmActionModal.vue`、`HomePage.vue`、`ImportExportPage.vue`、`PersonListPage.vue`、`PersonDetailPage.vue`、`SearchPage.vue`、`TimelineListPage.vue`、`TimelineDetailPage.vue` 均无 spec。
15. **`tsconfig.json:15` 有 `ignoreDeprecations: "6.0"`**：未明确抑制了什么。
16. **无 ESLint / Prettier 配置**。
17. **无 README.md**。

## Assumptions & Decisions

- **测试框架**：继续用 vitest + @vue/test-utils + happy-dom，不引入新框架。
- **schema 版本策略**：在 `IHistoryData` 新增可选 `version?: number`，导出时写入 `version: 1`；`parseHistoryData` / `loadHistoryData` 把无 `version` 字段的数据视为 `v0`（legacy），按需迁移到 v1。本次不实际改 schema 形状，只搭好迁移骨架与一个 v0→v1 的 no-op 迁移函数，后续真要改字段时再填迁移逻辑。
- **删除确认统一方向**：把所有 `window.confirm` 替换为 `ConfirmActionModal`（已有组件），通过新增一个 `useConfirmModal` composable 复用模态状态机，避免在每个页面里复制 `pendingAction / isVisible / confirm / cancel` 四件套。
- **focus trap 实现**：不引入 `@vueuse/core`，自写一个最小 `useFocusTrap` composable（监听 Tab/Shift+Tab，焦点循环在模态内），保持依赖零增长。
- **防抖**：自写 `useDebounceRef`（约 10 行），不引入 lodash。
- **`sortValue` 删除范围**：从 `IHistoryEvent`、`EventInput`、所有调用点删除；保留 `getTimeSortValue` 作为 store 内部排序依据。`historySchema.ts` 的 `isHistoryEvent` 不再校验 `sortValue`，对老数据中存在的 `sortValue` 字段忽略（不报错）。
- **`getTimeSortValue` 改进**：优先匹配 `公元前\d+` / `前\d+` → 负数；其次 `^\d+年` → 正数；否则返回 `Number.MAX_SAFE_INTEGER`。匹配失败时不再用第一个数字串。
- **ESLint/Prettier**：用 `eslint-plugin-vue` + `@vue/eslint-config-typescript` + `prettier`，配置走 Vue 官方推荐 + 简体中文注释约定。pre-commit hook 不强制加。
- **README**：放在项目根目录 `README.md`，包含项目简介、运行命令、数据格式说明、目录结构、测试命令。不写长篇架构文档。
- **lint 规则**：不开启会改动大量现有代码的规则（如强制 JSDoc、强制函数返回类型），只开 error 级的安全规则 + 风格类规则用 prettier 兜底。
- **commit 风格**：遵循 `.cursor/rules/chinese-git-commits.mdc`，简体中文标题，按 task 分批提交。
- **git 操作**：本次只 add/commit，不 push。

## Proposed Changes

每个任务都包含「修改内容」「为什么」「怎么做」「对应测试」。文件路径全部基于实际探索。

---

### Task 1: 修复 TimelineSnake 测试失败

**文件：**
- 修改：`src/components/TimelineSnake.spec.ts`
- 修改：`src/components/TimelineSnake.vue`（给 article 加 `data-test`）

**What/Why：** `TimelineSnake.spec.ts:33` 用 `wrapper.findAll('button')[0]`，但组件渲染 `<article role="button">`，结果空数组。这是 P0 阻塞测试用例。

**How：**
1. 给 `TimelineSnake.vue` 第 39 行的 `<article>` 加 `:data-test="`event-node-${event.id}`"`，并在 article 内已有的 `data-test="edit-event"` 上保持不变。
2. 修改 `TimelineSnake.spec.ts:33`：把 `wrapper.findAll('button')[0]` 改成 `wrapper.findAll('[data-test^="event-node-"]')[0]`。
3. 保留另外两个测试用例（"shows study result on matching event nodes"、"emits edit when clicking the edit button"）。

**Tests：** `npm test src/components/TimelineSnake.spec.ts` 全部 3 个用例通过。

---

### Task 2: 固化依赖版本

**文件：**
- 修改：`package.json`

**What/Why：** 所有依赖写 `"latest"`，任何 `npm install` 都可能拉到不兼容版本导致构建随机失败。当前实际装到 `vite@8.1.3`、`vitest@4.1.10`，应固化。

**How：**
1. 运行 `npm ls --depth=0` 拿到当前实际安装版本。
2. 把 `dependencies` 和 `devDependencies` 里所有 `"latest"` 改成实际安装版本（用 `^` 范围，允许 patch/minor 升级）。
3. 同时删掉 `dependencies` 里没用的 `axios`（搜索全代码无 `import axios`，是僵尸依赖）。
4. 跑一次 `npm install` 验证 lockfile 更新正常。

**Tests：** `npm install` 无报错；`npm run build` 通过；`npm test` 通过（除已修复的 TimelineSnake 外无新增失败）。

---

### Task 3: 修复导出污染 + 引入 schema 版本号

**文件：**
- 修改：`src/domain/historyTypes.ts`
- 修改：`src/domain/historySchema.ts`
- 修改：`src/stores/historyStore.ts`
- 修改：`src/pages/ImportExportPage.vue`
- 修改：`src/domain/historySchema.spec.ts`（新增版本相关用例）

**What/Why：**
- `ImportExportPage.vue:15` `JSON.stringify(store.$state)` 会把 `lastError` 写进导出文件，污染数据格式。
- 缺 schema 版本号，未来字段变更无法迁移老数据。

**How：**
1. 在 `historyTypes.ts` 的 `IHistoryData` 末尾加 `version: number`（必填，写入时为 `1`）。
2. 在 `historySchema.ts`：
   - 新增 `export const CURRENT_SCHEMA_VERSION = 1`。
   - `createEmptyHistoryData()` 返回值加 `version: CURRENT_SCHEMA_VERSION`。
   - `parseHistoryData(value)` 校验：若 `version` 不存在视为 `0`（legacy），调用 `migrateFromV0(data)` 转 v1（no-op：仅注入 `version: 1`，忽略多余字段）；若 `version` 是数字且 ≤ `CURRENT_SCHEMA_VERSION`，按版本号分派迁移；若 `version` > `CURRENT_SCHEMA_VERSION`，抛 `'导入文件版本过高，请升级应用'`。
   - 新增内部函数 `migrateFromV0(raw: Record<string, unknown>): IHistoryData`，仅做字段提取 + 注入 version。
3. 在 `historyStore.ts`：
   - `persist()` 写入时带上 `version: CURRENT_SCHEMA_VERSION`。
   - `loadHistoryData()` 在 `parseHistoryData` 抛错时记录 `lastError` 而不是静默丢弃（仅 console.warn + 返回空数据 + 把错误信息塞到 `lastError`）。
4. 在 `ImportExportPage.vue:15`：
   - 把 `JSON.stringify(store.$state, null, 2)` 改成 `JSON.stringify(store.exportSnapshot(), null, 2)`。
   - 在 store 加 `exportSnapshot()` action：返回 `{ version, timelines, events, people, cards, studyRecords }` 五+一字段，不含 `lastError`。
5. `historySchema.spec.ts` 新增用例：
   - `accepts v1 data with version field`
   - `migrates legacy data without version field to v1`
   - `rejects data with future schema version`
   - `createEmptyHistoryData includes version: 1`
6. `historyStore.spec.ts` 新增用例：
   - `exportSnapshot excludes lastError and includes version`
   - `loadHistoryData migrates legacy data without version`

**Tests：** `npm test src/domain/historySchema.spec.ts src/stores/historyStore.spec.ts` 全过。

---

### Task 4: 删除 `sortValue` 僵尸字段

**文件：**
- 修改：`src/domain/historyTypes.ts`
- 修改：`src/domain/historySchema.ts`
- 修改：`src/stores/historyStore.ts`
- 修改：`src/pages/PersonDetailPage.vue`
- 修改：`src/pages/TimelineDetailPage.vue`
- 修改：`src/stores/historyStore.spec.ts`（清理 `sortValue: ...` 入参）
- 修改：`src/pages/FlashcardPage.spec.ts`（清理 `sortValue: 1898` 入参）
- 修改：`src/domain/historySchema.spec.ts`（移除 `sortValue` 出现的断言）

**What/Why：** `IHistoryEvent.sortValue` 由 store 内部 `getTimeSortValue(timeLabel)` 派生覆盖，所有调用方都传 `0`，是僵尸字段。删除后类型更干净，调用方少传一个无用参数。

**How：**
1. `historyTypes.ts`：从 `IHistoryEvent` 删 `sortValue: number`。
2. `historyStore.ts`：
   - `EventInput` 类型现在变成 `Omit<IHistoryEvent, 'id' | 'createdAt' | 'updatedAt'>`（自动不含 sortValue）。
   - `createEvent` 内部计算 `sortValue: getTimeSortValue(input.timeLabel)` 写入事件对象（**保留 store 内部的 sortValue 字段，但从公共类型中隐藏**）。

   **决策修正**：仔细看 `eventsByTimeline` 排序用的是 `getTimeSortValue(a.timeLabel) - getTimeSortValue(b.timeLabel)`（[historyStore.ts:247](file:///Users/by/Documents/project/history/src/stores/historyStore.ts#L247)），并不依赖存储的 `sortValue`。所以可以直接从 `IHistoryEvent` 删除 `sortValue` 字段，store 也不必再写入。简化方案：
   - `IHistoryEvent` 删 `sortValue`。
   - `createEvent` / `updateEvent` 不再写 `sortValue`。
   - `eventsByTimeline` 排序保持按 `timeLabel` 派生（已经是这样）。
3. `historySchema.ts`：`isHistoryEvent` 删 `isFiniteNumber(value.sortValue)` 校验；接受老数据里的 `sortValue` 字段但不保留（用对象解构剔除）。
4. `PersonDetailPage.vue:58` 和 `TimelineDetailPage.vue:106`：删 `sortValue: 0` 入参。
5. 修测试：`historyStore.spec.ts` 第 23、47、58、68、95 行等所有 `sortValue: ...` 入参删除；`FlashcardPage.spec.ts:174` 删 `sortValue: 1898`；`historySchema.spec.ts:48` 删 `sortValue: -221`。
6. 新增测试：在 `historyStore.spec.ts` 加 `creates an event without sortValue input and sorts by time label`，验证不传 `sortValue` 也能正常创建并按 `timeLabel` 排序。

**Tests：** `npm test` 全过；`npm run build` 通过（vue-tsc 应无报错）。

---

### Task 5: 修复空时间线被算成"未背过"

**文件：**
- 修改：`src/pages/TimelineListPage.vue`
- 新增：`src/pages/TimelineListPage.spec.ts`

**What/Why：** `isTimelineRemembered` ([TimelineListPage.vue:228-235](file:///Users/by/Documents/project/history/src/pages/TimelineListPage.vue#L228-L235)) 在 `timelineEvents.length === 0` 时返回 `false`，空时间线被归为"未背过"，"删除未背过"会误删所有空时间线。

**How：**
1. 引入三态枚举：`type TimelineStudyStatus = 'empty' | 'remembered' | 'forgotten'`。
2. 改 `isTimelineRemembered` → 新函数 `getTimelineStudyStatus(timeline): TimelineStudyStatus`：
   - `events.length === 0` → `'empty'`
   - 所有事件 `eventStudyResults[event.id] === 'remembered'` → `'remembered'`
   - 否则 → `'forgotten'`
3. 模板里的 `study-status` class 和文案：
   - `empty` → 显示"未开始"，灰色样式 `study-status--empty`
   - `remembered` → 显示"已背过"
   - `forgotten` → 显示"未背过"
4. `deleteTimelinesByStudyStatus`：
   - `result === 'remembered'` → 只删 `status === 'remembered'` 的时间线
   - `result === 'forgotten'` → 只删 `status === 'forgotten'` 的时间线，**不删 empty**
   - 错误信息："没有已背过的时间线。" / "没有未背过的时间线。" 保持不变
5. 新增 `TimelineListPage.spec.ts`，覆盖：
   - 空时间线显示"未开始"
   - "删除未背过"不删空时间线
   - "删除已背过"只删全部事件都已背过的时间线
   - 创建时间线 + 在列表中展示

**Tests：** `npm test src/pages/TimelineListPage.spec.ts` 全过。

---

### Task 6: 统一删除确认到 ConfirmActionModal

**文件：**
- 新增：`src/composables/useConfirmModal.ts`
- 修改：`src/pages/FlashcardPage.vue`
- 修改：`src/pages/PersonListPage.vue`
- 修改：`src/pages/TimelineListPage.vue`
- 修改：`src/pages/TimelineDetailPage.vue`
- 新增：`src/composables/useConfirmModal.spec.ts`

**What/Why：** 单条删除用 `window.confirm`（[FlashcardPage.vue:325](file:///Users/by/Documents/project/history/src/pages/FlashcardPage.vue#L325)、[PersonListPage.vue:134](file:///Users/by/Documents/project/history/src/pages/PersonListPage.vue#L134)、[TimelineListPage.vue:91](file:///Users/by/Documents/project/history/src/pages/TimelineListPage.vue#L91)、[TimelineDetailPage.vue:159](file:///Users/by/Documents/project/history/src/pages/TimelineDetailPage.vue#L159)），与批量删除的 `ConfirmActionModal` 风格不一致，且原生 confirm 风格突兀、不可定制。

**How：**
1. 新增 `src/composables/useConfirmModal.ts`：
   ```ts
   export function useConfirmModal() {
     const isVisible = ref(false)
     const message = ref('')
     let pendingAction: (() => void) | null = null
     function request(messageText: string, action: () => void) {
       message.value = messageText
       pendingAction = action
       isVisible.value = true
     }
     function confirm() {
       const action = pendingAction
       pendingAction = null
       isVisible.value = false
       action?.()
     }
     function cancel() {
       pendingAction = null
       isVisible.value = false
     }
     return { isVisible, message, request, confirm, cancel }
   }
   ```
2. 在四个页面用 `useConfirmModal()` 替换现有的 `pendingBulkDeleteAction / isBulkDeleteConfirmVisible / requestBulkDeleteConfirmation / confirmBulkDelete / cancelBulkDelete` 五件套，同时把单条删除的 `window.confirm(...)` 也走 `request()`。
3. 模板末尾统一放 `<ConfirmActionModal v-if="modal.isVisible" :message="modal.message" @confirm="modal.confirm" @cancel="modal.cancel" />`。
4. 旧的批量删除 / 单条删除两条路径共用同一个模态。
5. 新增 `useConfirmModal.spec.ts` 测试：
   - `request` 设置 message 并显示
   - `confirm` 执行 pending action 并隐藏
   - `cancel` 清空 pending action 并隐藏
   - 连续 `request` 后第一次 `confirm` 只执行最后一次的 action

**Tests：** `npm test src/composables/useConfirmModal.spec.ts` 全过；四个页面原有测试不破。

---

### Task 7: 优化 study results 查询性能

**文件：**
- 修改：`src/pages/FlashcardPage.vue`
- 修改：`src/pages/TimelineDetailPage.vue`
- 修改：`src/pages/PersonListPage.vue`

**What/Why：** `FlashcardPage.vue:437-442` `getLatestCardStudyResult` 每张卡片都 `[...store.studyRecords].reverse().find(...)`，`O(cards × records)`。`cardStudyResults` computed 又遍历一遍但只用最后一条（依赖数组顺序=时间顺序的隐式假设）。三个页面都有类似模式。

**How：**
1. 在每个页面（或抽到 `src/composables/useStudyResults.ts`，但根据用户决定不抽 composable，所以放页面内）新增一个 `latestResultByTarget` computed：
   ```ts
   const latestResultByTarget = computed(() => {
     const map = new Map<string, StudyResult>()
     // studyRecords 按 createdAt 升序遍历，后写的覆盖前面的，保证 map 里是最新
     const sorted = [...store.studyRecords].sort((a, b) =>
       a.createdAt.localeCompare(b.createdAt),
     )
     for (const record of sorted) {
       if (record.targetType === 'card') {  // 各页面换成对应 targetType
         map.set(record.targetId, record.result)
       }
     }
     return map
   })
   ```
2. `FlashcardPage`：
   - 删 `getLatestCardStudyResult` 函数。
   - `cardStudyResults` 改为 `latestResultByTarget`。
   - `getDrawCandidateCards` 里 `getLatestCardStudyResult(card.id)` 改成 `latestResultByTarget.value.get(card.id)`。
   - 模板里 `cardStudyResults[card.id]` 改成 `latestResultByTarget.get(card.id)`。
3. `TimelineDetailPage`：`eventStudyResults` computed 改用相同模式。
4. `PersonListPage`：`personStudyResults` 同上。
5. 性能从 `O(N×M)` 降到 `O(M log M + N)`。

**Tests：** 新增测试覆盖"多次标记同一卡片后取最新结果"（在 `FlashcardPage.spec.ts` 加用例）；现有 FlashcardPage 测试不破。

---

### Task 8: SearchPage 加防抖

**文件：**
- 新增：`src/composables/useDebouncedRef.ts`
- 修改：`src/pages/SearchPage.vue`
- 新增：`src/pages/SearchPage.spec.ts`

**What/Why：** `SearchPage.vue:9` `computed(() => store.search(query.value))` 每次按键全量扫描所有集合，数据量上来后输入会卡。

**How：**
1. 新增 `src/composables/useDebouncedRef.ts`：
   ```ts
   export function useDebouncedRef<T>(initial: T, delayMs = 200) {
     const value = ref(initial)
     const debounced = ref(initial)
     let timer: ReturnType<typeof setTimeout> | null = null
     watch(value, (next) => {
       if (timer) clearTimeout(timer)
       timer = setTimeout(() => { debounced.value = next }, delayMs)
     })
     return { value, debounced }
   }
   ```
2. `SearchPage.vue`：
   - 把 `const query = ref('')` 改为 `const { value: query, debounced: debouncedQuery } = useDebouncedRef('', 200)`。
   - `results` 改为 `computed(() => store.search(debouncedQuery.value))`。
   - `hasQuery` 改为基于 `query.value`（实时反馈"请输入关键词"消失），但结果基于 `debouncedQuery`。
3. 新增 `SearchPage.spec.ts`：
   - 输入后立即检查结果区为空或旧结果
   - 用 `vi.useFakeTimers()` + `vi.advanceTimersByTime(200)` 后检查结果更新
   - 空查询不触发搜索
   - 找到匹配的人物、时间线、事件、卡片分别显示在对应分组

**Tests：** `npm test src/pages/SearchPage.spec.ts` 全过。

---

### Task 9: 路由懒加载

**文件：**
- 修改：`src/router/index.ts`

**What/Why：** `router/index.ts:1-9` 同步引入 8 个页面，首屏 bundle 168KB。懒加载后可按需拆分。

**How：**
1. 把 8 个 `import XxxPage from '@/pages/XxxPage.vue'` 改成在 `routes` 数组里写 `component: () => import('@/pages/XxxPage.vue')`。
2. 删掉顶部 8 行 import。
3. 验证 `npm run build` 后 `dist/assets/` 出现多个按页面拆分的 chunk。

**Tests：** `npm run build` 通过；产物里 `dist/assets/` 出现多个 `*.js` chunk（除 `index-*.js` 外至少 8 个页面 chunk）。无新增测试（路由懒加载是构建期行为，单测难覆盖且收益低）。

---

### Task 10: 模态 ESC 关闭 + focus trap

**文件：**
- 新增：`src/composables/useModalBehavior.ts`
- 修改：`src/components/ConfirmActionModal.vue`
- 修改：`src/pages/FlashcardPage.vue`（4 处模态）
- 修改：`src/pages/PersonListPage.vue`（2 处模态）
- 修改：`src/pages/TimelineListPage.vue`（1 处模态）
- 修改：`src/pages/TimelineDetailPage.vue`（3 处模态）
- 修改：`src/pages/PersonDetailPage.vue`（0 处原生模态，但需检查）
- 新增：`src/composables/useModalBehavior.spec.ts`

**What/Why：** 所有 `role="dialog"` 模态只有 `@click.self` 关闭，没有 ESC 键监听，也没有 focus trap，Tab 会跑到背景。a11y 不达标。

**How：**
1. 新增 `src/composables/useModalBehavior.ts`：
   ```ts
   export function useModalBehavior(
     isActive: Ref<boolean>,
     onClose: () => void,
     options?: { trapFocus?: boolean },
   ) {
     const containerRef = ref<HTMLElement | null>(null)
     let lastFocused: HTMLElement | null = null

     function onKeydown(event: KeyboardEvent) {
       if (!isActive.value) return
       if (event.key === 'Escape') {
         event.preventDefault()
         onClose()
         return
       }
       if (options?.trapFocus !== false && event.key === 'Tab') {
         const root = containerRef.value
         if (!root) return
         const focusable = root.querySelectorAll<HTMLElement>(
           'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
         )
         if (focusable.length === 0) return
         const first = focusable[0]
         const last = focusable[focusable.length - 1]
         if (event.shiftKey && document.activeElement === first) {
           event.preventDefault()
           last.focus()
         } else if (!event.shiftKey && document.activeElement === last) {
           event.preventDefault()
           first.focus()
         }
       }
     }

     watch(isActive, (active) => {
       if (active) {
         lastFocused = document.activeElement as HTMLElement
         document.addEventListener('keydown', onKeydown)
         document.body.style.overflow = 'hidden'
         nextTick(() => {
           const first = containerRef.value?.querySelector<HTMLElement>(
             'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
           )
           first?.focus()
         })
       } else {
         document.removeEventListener('keydown', onKeydown)
         document.body.style.overflow = ''
         lastFocused?.focus()
       }
     })

     onUnmounted(() => {
       document.removeEventListener('keydown', onKeydown)
       document.body.style.overflow = ''
     })

     return { containerRef }
   }
   ```
2. 在每个含模态的页面：对每个模态的可见性 ref 调用 `useModalBehavior`，把返回的 `containerRef` 绑到模态根 `<div class="...-modal" :ref="el => xxxContainerRef = el">`。
3. `ConfirmActionModal.vue` 内部也用 `useModalBehavior`，把 ESC + focus trap 内置。
4. 不引入 `@vueuse/core`，零新依赖。
5. 新增 `useModalBehavior.spec.ts` 覆盖：
   - ESC 触发 onClose
   - Tab 在容器内循环
   - 显示时 body overflow 被 hidden，隐藏时还原
   - 显示时焦点进入容器，隐藏时还原到原焦点

**Tests：** `npm test src/composables/useModalBehavior.spec.ts` 全过；现有页面测试不破。

---

### Task 11: 安全 localStorage + 稳健 getTimeSortValue

**文件：**
- 新增：`src/domain/safeLocalStorage.ts`
- 修改：`src/stores/historyStore.ts`
- 修改：`src/domain/historySchema.ts`（仅迁移函数涉及，无大改）
- 新增：`src/domain/safeLocalStorage.spec.ts`
- 新增：`src/domain/historyStore.getTimeSortValue.spec.ts`（或合并到 historyStore.spec.ts）

**What/Why：**
- `historyStore.ts:294` `localStorage.getItem` 直接调用，SSR / Node 环境会崩。
- `getTimeSortValue` ([historyStore.ts:310-319](file:///Users/by/Documents/project/history/src/stores/historyStore.ts#L310-L319)) 用 `/\d+/` 抓第一个数字串，对"10月革命"、"民国19年"等抓错。

**How：**
1. 新增 `src/domain/safeLocalStorage.ts`：
   ```ts
   export const safeLocalStorage = {
     getItem(key: string): string | null {
       try {
         return globalThis.localStorage?.getItem(key) ?? null
       } catch {
         return null
       }
     },
     setItem(key: string, value: string): boolean {
       try {
         globalThis.localStorage?.setItem(key, value)
         return true
       } catch {
         return false
       }
     },
     removeItem(key: string): void {
       try {
         globalThis.localStorage?.removeItem(key)
       } catch {
         /* noop */
       }
     },
   }
   ```
2. `historyStore.ts` 把 `localStorage.getItem` / `setItem` 替换为 `safeLocalStorage.getItem` / `safeLocalStorage.setItem`。
3. `getTimeSortValue` 重写：
   ```ts
   function getTimeSortValue(timeLabel: string): number {
     if (!timeLabel) return Number.MAX_SAFE_INTEGER
     const bceMatch = timeLabel.match(/(?:公元前|前)\s*(\d+)/)
     if (bceMatch) return -Number(bceMatch[1])
     const yearMatch = timeLabel.match(/^\s*(\d+)\s*年/)
     if (yearMatch) return Number(yearMatch[1])
     const anyYearMatch = timeLabel.match(/(\d{3,4})\s*年/)
     if (anyYearMatch) return Number(anyYearMatch[1])
     return Number.MAX_SAFE_INTEGER
   }
   ```
   优先级：BCE → 行首 `数字年` → 任意 `3-4位数字年` → 兜底最大值。
4. 新增 `safeLocalStorage.spec.ts`：mock `globalThis.localStorage` 抛错时三个方法都不崩。
5. 在 `historyStore.spec.ts` 加 `getTimeSortValue` 相关用例（导出测试或通过 `eventsByTimeline` 间接测）：
   - `'前221年'` → -221
   - `'公元前221年'` → -221
   - `'1840年'` → 1840
   - `'1911年10月'` → 1911
   - `'10月革命'` → MAX_SAFE_INTEGER（不再误返回 10）
   - `''` → MAX_SAFE_INTEGER

**Tests：** `npm test src/domain/safeLocalStorage.spec.ts src/stores/historyStore.spec.ts` 全过。

---

### Task 12: 调查并修复 tsconfig `ignoreDeprecations`

**文件：**
- 修改：`tsconfig.json`（视调查结果）
- 可能修改：`tsconfig.node.json`

**What/Why：** `tsconfig.json:15` 有 `"ignoreDeprecations": "6.0"`，未明确抑制了什么。

**How：**
1. 先调查：删除 `"ignoreDeprecations": "6.0"`，运行 `npm run build`（会触发 `vue-tsc --noEmit`）。
2. 观察是否出现 `error TSXXXX: 'option' has been deprecated...` 警告。
3. 三种可能结果：
   - **结果 A**：无任何 deprecation 警告 → 直接删掉该行，无需其他改动。
   - **结果 B**：有具体 deprecation 警告 → 修对应的过期选项（常见情况：`importsNotUsedAsValues` → 改用 `verbatimModuleSyntax`；`keyofStringsOnly`、`noImplicitUseStrict` 等已弃用 → 删除）。
   - **结果 C**：警告来自 `@vue/tsconfig` 或插件配置而非本项目选项 → 在 plan 中记录来源，保留 `ignoreDeprecations` 但加注释说明原因。
4. 把调查结论写入本次提交的 commit message。

**Tests：** `npm run build` 通过；`npm test` 通过。无新增 spec（配置项调查不写单测）。

---

### Task 13: 引入 ESLint + Prettier

**文件：**
- 新增：`.eslintrc.cjs`
- 新增：`.prettierrc.json`
- 新增：`.eslintignore`
- 修改：`package.json`（加 devDeps + scripts）
- 可能修改：现有源文件（仅修复 lint error，不主动改风格类 warning）

**What/Why：** 项目无 lint 配置，代码风格统一只能靠人肉。

**How：**
1. `package.json` devDependencies 加：
   - `eslint`
   - `@vue/eslint-config-typescript`
   - `eslint-plugin-vue`
   - `prettier`
   - `@vue/eslint-config-prettier`
2. `package.json` scripts 加：
   - `"lint": "eslint src --ext .ts,.vue --max-warnings 0"`
   - `"lint:fix": "eslint src --ext .ts,.vue --fix"`
   - `"format": "prettier --write src"`
3. `.eslintrc.cjs`：
   ```js
   module.exports = {
     root: true,
     extends: [
       'plugin:vue/vue3-recommended',
       '@vue/eslint-config-typescript',
       '@vue/eslint-config-prettier',
     ],
     parserOptions: {
       ecmaVersion: 'latest',
     },
     rules: {
       'vue/multi-word-component-names': 'off',
       '@typescript-eslint/no-explicit-any': 'warn',
       '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
     },
   }
   ```
4. `.prettierrc.json`：
   ```json
   {
     "semi": false,
     "singleQuote": true,
     "trailingComma": "all",
     "printWidth": 80,
     "tabWidth": 2,
     "vueIndentScriptAndStyle": false
   }
   ```
5. `.eslintignore`：`dist/`、`node_modules/`、`coverage/`、`*.config.ts`（暂时，避免 vite.config.ts 的 node 类型问题）。
6. 跑一次 `npm run lint:fix` 和 `npm run format`，把现有代码规整一遍（**这一步会产生较大 diff，单独一个 commit**）。
7. 验证 `npm run build` + `npm test` 仍通过。

**Tests：** `npm run lint` 退出码 0；`npm run build` 通过；`npm test` 通过。无新增单测。

---

### Task 14: 补 README.md

**文件：**
- 新增：`README.md`

**What/Why：** 项目根目录无 README，新成员上手成本高。用户在选项中明确要求补上。

**How：** README 包含以下章节（用简体中文）：
1. **项目简介**：一段话说明这是浏览器端历史背诵辅助软件，本地存储，无后端。
2. **功能特性**：人物 / 时间线 / 事件 / 卡片四类数据，关键词搜索，三种背诵模式，导入导出。
3. **技术栈**：Vue 3、Vite、TypeScript、Pinia、vue-router、Vitest、happy-dom。
4. **目录结构**：列出 `src/domain`、`src/stores`、`src/pages`、`src/components`、`src/composables`、`src/router`、`src/styles` 各自职责。
5. **运行命令**：
   - `npm install`
   - `npm run dev`：启动开发服务器
   - `npm run build`：类型检查 + 生产构建
   - `npm test`：跑测试
   - `npm run test:watch`：监听模式
   - `npm run lint` / `npm run lint:fix` / `npm run format`
6. **数据格式**：说明 `localStorage` 的 key 是 `history-memorization:data`，导出 JSON 的字段（`version`、`timelines`、`events`、`people`、`cards`、`studyRecords`），引用 `src/domain/historyTypes.ts` 看完整定义。
7. **设计文档**：指向 `docs/superpowers/specs/2026-06-21-history-memorization-design.md` 和 `docs/superpowers/plans/` 下的实施计划。
8. **License**：参考根目录 `LICENSE` 文件。

**Tests：** 文件存在 + 包含上述章节标题。无单测。

---

### Task 15: 补齐测试覆盖

**文件（按优先级）：**
- 新增：`src/domain/createId.spec.ts`
- 新增：`src/components/EntityCard.spec.ts`
- 新增：`src/components/ConfirmActionModal.spec.ts`
- 新增：`src/pages/HomePage.spec.ts`
- 新增：`src/pages/ImportExportPage.spec.ts`
- 新增：`src/pages/PersonDetailPage.spec.ts`
- 新增：`src/pages/PersonListPage.spec.ts`（Task 5 已建，本任务补 CRUD 用例）
- 新增：`src/pages/TimelineDetailPage.spec.ts`

**What/Why：** 当前只 6 个 spec，多个核心文件零覆盖。

**How：** 每个文件至少覆盖以下路径：

#### `createId.spec.ts`
- 调用 `crypto.randomUUID` 分支（mock crypto.randomUUID 返回固定值，断言 createId 返回该值）
- 降级分支（删除 `crypto.randomUUID` 后返回 `id-${Date.now()}-${...}` 格式，用正则匹配 `^id-\d+-[0-9a-f]+$`）

#### `EntityCard.spec.ts`
- 渲染 title / subtitle / summary
- 不传 subtitle / summary 时不渲染对应元素

#### `ConfirmActionModal.spec.ts`
- 点击确认 emit `confirm`
- 点击取消 emit `cancel`
- 点击 overlay（self）emit `cancel`
- ESC 关闭（依赖 useModalBehavior，验证集成）

#### `HomePage.spec.ts`
- 空数据时显示"还没有事件"和"还没有人物"提示
- 有数据时显示最近 3 条事件和最近 3 个人物
- feature-rail 的 RouterLink 跳转目标正确

#### `ImportExportPage.spec.ts`
- 导出按钮触发后生成了 `<a download="history-memorization-export.json">`（mock URL.createObjectURL）
- 导出 JSON 不含 `lastError` 字段（**验证 Task 3 修复**）
- 导出 JSON 含 `version: 1`（**验证 Task 3 修复**）
- 导入合法 JSON 后调用 `store.replaceAll`
- 导入非法 JSON 后显示"导入文件格式不正确"且不调用 `store.replaceAll`
- 导入合法 JSON 但用户取消确认时不覆盖数据

#### `PersonDetailPage.spec.ts`
- 加载不存在的 personId 显示"没有找到这位人物"
- 加载存在的人物显示姓名 / 生平 / 成就 / 关键词
- 关联事件列表来自 `store.eventsByPerson`
- 新建相关事件时自动绑定当前 personId
- 表单校验：未选时间线时显示错误

#### `PersonListPage.spec.ts`（在 Task 5 基础上补）
- 创建人物：必填姓名校验
- 编辑人物：保存后 store.people 更新
- 单条删除：弹出 ConfirmActionModal（验证 Task 6 修复）
- 批量删除已背过：只删已背过的人物
- 批量删除未背过：只删未背过的人物，不删未开始的（这里没有"未开始"概念，所有人物都有 status）

#### `TimelineDetailPage.spec.ts`
- 加载不存在的时间线显示"没有找到这条时间线"
- 事件列表按 timeLabel 排序展示
- 创建事件：必填 timeLabel 和 title
- 编辑事件：保存后 store.events 更新
- 删除事件：弹出 ConfirmActionModal
- 背诵模式：点击事件打开 StudyRevealCard，标记后写入 studyRecords
- 批量删除已背过 / 未背过

**Tests：** 所有新增 spec 全过；总用例数从 32 → 60+。

---

## Verification Steps

按以下顺序在执行阶段依次验证：

1. **Task 1 完成后**：`npm test src/components/TimelineSnake.spec.ts` → 3/3 通过。
2. **Task 2 完成后**：`rm -rf node_modules && npm install` → 无报错；`npm run build` 通过。
3. **Task 3 完成后**：`npm test src/domain/historySchema.spec.ts src/stores/historyStore.spec.ts` 全过；手工检查导出 JSON 不含 `lastError`、含 `version: 1`。
4. **Task 4 完成后**：`npm run build` 通过（vue-tsc 不报 sortValue 缺失）；`npm test` 全过。
5. **Task 5 完成后**：`npm test src/pages/TimelineListPage.spec.ts` 全过。
6. **Task 6 完成后**：`npm test src/composables/useConfirmModal.spec.ts` 全过；四个页面原有测试不破。
7. **Task 7 完成后**：`npm test src/pages/FlashcardPage.spec.ts` 全过；新增"多次标记取最新"用例通过。
8. **Task 8 完成后**：`npm test src/pages/SearchPage.spec.ts` 全过。
9. **Task 9 完成后**：`npm run build` 通过；`ls dist/assets/*.js` 出现多个 chunk。
10. **Task 10 完成后**：`npm test src/composables/useModalBehavior.spec.ts` 全过；所有页面测试不破。
11. **Task 11 完成后**：`npm test src/domain/safeLocalStorage.spec.ts src/stores/historyStore.spec.ts` 全过。
12. **Task 12 完成后**：`npm run build` 通过；tsconfig 调查结论写入 commit。
13. **Task 13 完成后**：`npm run lint` 退出码 0；`npm run build` + `npm test` 通过。
14. **Task 14 完成后**：`README.md` 存在且包含 8 个章节标题。
15. **Task 15 完成后**：`npm test` 全过，总用例数 ≥ 60。

**最终全量验收**：
- `npm install` 无报错
- `npm run build` 通过
- `npm test` 全过（≥ 60 用例）
- `npm run lint` 退出码 0
- 手动 `npm run dev` 走一遍 MVP 路径（创建时间线 → 加事件 → 看蛇形时间线 → 创建人物 → 关联事件 → 创建卡片 → 背诵 → 搜索 → 导出 → 清 localStorage → 导入恢复）

**Commit 拆分建议**（遵循 `.cursor/rules/chinese-git-commits.mdc` 简体中文规则）：
- `修复 TimelineSnake 测试选择器与组件实现不一致`
- `固化依赖版本并移除未使用的 axios`
- `引入 schema 版本号并修复导出数据污染`
- `移除 IHistoryEvent 的僵尸 sortValue 字段`
- `修复空时间线被误判为未背过的问题`
- `新增 useConfirmModal 并统一所有删除确认流程`
- `优化背诵结果查询为 Map 一次构建`
- `为 SearchPage 输入加防抖`
- `路由改为懒加载以拆分首屏 bundle`
- `新增模态 ESC 关闭与焦点陷阱`
- `封装 safeLocalStorage 并加固 getTimeSortValue 解析`
- `调查并处理 tsconfig 的 ignoreDeprecations 配置`
- `引入 ESLint 与 Prettier 并格式化全量代码`
- `新增项目 README`
- `补齐 createId / EntityCard / ConfirmActionModal / HomePage / ImportExportPage / PersonDetailPage / PersonListPage / TimelineDetailPage 测试`

---

## Out of Scope（本次明确不做）

- IndexedDB 替换 localStorage（架构级，单独立项）
- 给 store 建倒排索引（性能优化，目前数据量不需要）
- 抽出 BulkDeleteController composable（Task 6 的 `useConfirmModal` 已部分去重，更重的 composable 抽取留待后续）
- 第二版 AI 解析能力、账号系统、云端同步（设计文档已明确不进第一版）
- pre-commit hook 强制 lint
- CI 配置
- 国际化（i18n）
- 暗色主题

# 历史背诵助手 - 剩余问题修复与测试补强（续作计划）

## Summary

承接上一轮已批准的 [fix-all-issues-and-add-tests.md](file:///Users/by/Documents/project/history/.trae/documents/fix-all-issues-and-add-tests.md)，本计划只覆盖**剩余未完成**的工作：Task 6 的 4 个页面模板改造收尾、Task 7-15 全部 9 个任务。Task 1-5 已完成且通过验收（32→49 用例全过，build 通过），Task 6 的 composable + spec 已建好（5/5 通过），但 4 个页面的脚本/模板改造只完成了一半。

最终交付：所有原有测试通过、新增测试通过、`npm run build` 通过、`npm test` 通过（≥60 用例）、`npm run lint` 退出码 0、README.md 存在。

## Current State Analysis

### 已完成（无需重复）

- **Task 1**：`TimelineSnake.spec.ts` 选择器改 `[data-test^="event-node-"]`，`TimelineSnake.vue` 加 `data-test`。✅
- **Task 2**：`package.json` 固化为 `^x.y.z`，移除 axios。当前依赖：vite@^8.1.3、vitest@^4.1.10、vue@^3.5.39、pinia@^3.0.4、vue-router@^5.1.0、typescript@^6.0.3、vue-tsc@^3.3.6。✅
- **Task 3**：`IHistoryData.version` 已加、`CURRENT_SCHEMA_VERSION = 1` 导出、`parseHistoryData` 处理 v0/v1、`exportSnapshot()` action 已加、`ImportExportPage.vue:15` 改用 `store.exportSnapshot()`。✅
- **Task 4**：`IHistoryEvent.sortValue` 已删、所有调用点不再传 sortValue、`stripLegacySortValue` 在 schema 解析时剔除老数据、`isFiniteNumber` 死代码已删。✅
- **Task 5**：`TimelineStudyStatus` 三态枚举已加、`getTimelineStudyStatus` 已替换 `isTimelineRemembered`、`TimelineListPage.spec.ts` 7 用例全过、空时间线显示"未开始"。✅
- **Task 6（部分）**：`src/composables/useConfirmModal.ts` 已建（5 用例全过）；`PersonListPage.vue` 的 `<script setup>` 已改完（import useConfirmModal、`const modal = useConfirmModal()`、`deletePerson` / `deleteSelectedPeople` / `deletePeopleByStudyResult` 都用 `modal.request`、三件套已删）。✅

### 剩余工作（本计划范围）

#### Task 6 收尾：4 个页面模板与剩余 3 个页面脚本

**当前状态确认（已通过 Read 验证）：**

1. `src/pages/PersonListPage.vue` — 脚本已改完，但第 573-578 行模板仍是旧绑定：
   ```html
   <ConfirmActionModal
     v-if="isBulkDeleteConfirmVisible"        <!-- 不存在 -->
     :message="BULK_DELETE_CONFIRM_MESSAGE"   <!-- 不存在 -->
     @confirm="confirmBulkDelete"             <!-- 不存在 -->
     @cancel="cancelBulkDelete"               <!-- 不存在 -->
   />
   ```
   当前 4 个 TS 诊断错误。

2. `src/pages/TimelineListPage.vue` — 完全未改。残留：第 16 行 `BULK_DELETE_CONFIRM_MESSAGE`、第 23 行 `isBulkDeleteConfirmVisible`、第 34 行 `pendingBulkDeleteAction`、第 99 行 `window.confirm`、第 190-206 行三件套、第 475-480 行模板。

3. `src/pages/TimelineDetailPage.vue` — 完全未改。残留：第 10 行 `BULK_DELETE_CONFIRM_MESSAGE`、第 22 行 `isBulkDeleteConfirmVisible`、第 48 行 `pendingBulkDeleteAction`、第 157 行 `window.confirm`、第 275-291 行三件套、第 692-697 行模板。

4. `src/pages/FlashcardPage.vue` — 完全未改。残留：第 25 行 `BULK_DELETE_CONFIRM_MESSAGE`、第 36 行 `isBulkDeleteConfirmVisible`、第 53 行 `pendingBulkDeleteAction`、第 325 行 `window.confirm`、第 407-423 行三件套、第 1088-1093 行模板。

#### Task 7-15 全部未做

- **Task 7**：`FlashcardPage.vue` 第 437-442 行 `getLatestCardStudyResult` 仍是 `O(N×M)` 反向遍历；3 个页面的 `eventStudyResults` / `personStudyResults` / `cardStudyResults` 都是 forEach 覆盖写法（依赖数组顺序=时间顺序的隐式假设）。
- **Task 8**：`src/composables/useDebouncedRef.ts` 不存在；`SearchPage.vue` 无防抖。
- **Task 9**：`src/router/index.ts` 第 2-9 行仍是 8 个 eager import。
- **Task 10**：`src/composables/useModalBehavior.ts` 不存在；所有 `role="dialog"` 模态只有 `@click.self` 关闭，无 ESC、无 focus trap。
- **Task 11**：`src/domain/safeLocalStorage.ts` 不存在；`historyStore.ts` 直接调 `localStorage`；`getTimeSortValue` 仍是 `/\d+/` 抓第一个数字串。
- **Task 12**：`tsconfig.json:15` 仍有 `"ignoreDeprecations": "6.0"`。
- **Task 13**：`package.json` 无 `lint` / `lint:fix` / `format` scripts，无 eslint/prettier 依赖；根目录无 `.eslintrc.cjs` / `.prettierrc.json` / `.eslintignore`。
- **Task 14**：根目录无 `README.md`。
- **Task 15**：现有 8 个 spec（TimelineSnake / StudyRevealCard / timelineLayout / historySchema / historyStore / FlashcardPage / TimelineListPage / useConfirmModal）。仍缺：`createId.spec.ts`、`EntityCard.spec.ts`、`ConfirmActionModal.spec.ts`、`HomePage.spec.ts`、`ImportExportPage.spec.ts`、`PersonDetailPage.spec.ts`、`PersonListPage.spec.ts`、`TimelineDetailPage.spec.ts` 共 8 个。

## Assumptions & Decisions

继承原计划全部决策，无新增决策：

- 测试栈：vitest + @vue/test-utils + happy-dom，不引入新框架。
- 防抖、focus trap、confirm modal 都自写 composable，零新依赖。
- ESLint：`eslint-plugin-vue` + `@vue/eslint-config-typescript` + `@vue/eslint-config-prettier`，规则只开 error 级安全规则 + prettier 兜底，不强制 JSDoc/返回类型。
- Prettier：`semi: false`、`singleQuote: true`、`trailingComma: 'all'`、`printWidth: 80`、`tabWidth: 2`。
- README 用简体中文，8 个章节，不长篇架构文档。
- `getTimeSortValue` 优先级：BCE → 行首 `数字年` → 任意 `3-4位数字年` → 兜底 `Number.MAX_SAFE_INTEGER`。
- `safeLocalStorage` 用 try/catch 包裹 + `globalThis.localStorage?.` 可选链。
- `useModalBehavior` 内置 ESC + Tab 循环 + body overflow hidden + 焦点还原，零新依赖。
- 路由懒加载改为 `component: () => import('@/pages/XxxPage.vue')`。
- commit 遵循 `.cursor/rules/chinese-git-commits.mdc` 简体中文规则，按 task 分批提交，本次只 add/commit 不 push。
- P3 架构改动（IndexedDB、倒排索引、BulkDeleteController）明确不在本次范围。

## Proposed Changes

每个任务只列「修改内容」「怎么做」「对应测试」。详细背景与原计划相同，不重复。

---

### Task 6 收尾：4 个页面 useConfirmModal 改造

**文件：**
- 修改：`src/pages/PersonListPage.vue`（仅模板末尾 4 行绑定）
- 修改：`src/pages/TimelineListPage.vue`（脚本 + 模板）
- 修改：`src/pages/TimelineDetailPage.vue`（脚本 + 模板）
- 修改：`src/pages/FlashcardPage.vue`（脚本 + 模板）

**怎么做：**

1. **PersonListPage.vue** 第 573-578 行模板改为：
   ```html
   <ConfirmActionModal
     v-if="modal.isVisible.value"
     :message="modal.message.value"
     @confirm="modal.confirm"
     @cancel="modal.cancel"
   />
   ```

2. **TimelineListPage.vue / TimelineDetailPage.vue / FlashcardPage.vue** 按统一模式改造：
   - import `useConfirmModal`。
   - 删除 `BULK_DELETE_CONFIRM_MESSAGE` 常量、`isBulkDeleteConfirmVisible` ref、`pendingBulkDeleteAction` 变量、`requestBulkDeleteConfirmation` / `confirmBulkDelete` / `cancelBulkDelete` 三件套。
   - 新增 `const modal = useConfirmModal()`。
   - 单条删除（`deleteTimeline` / `deleteEvent` / `deleteCard`）把 `window.confirm(...)` 改为 `modal.request(\`确认删除XX“${name}”吗？\`, () => { ...删除逻辑... })`，把 if-return 逻辑收敛到 action 内部。
   - 批量删除（`deleteSelectedXxx` / `deleteXxxByStudyResult`）把 `requestBulkDeleteConfirmation(action)` 改为 `modal.request(SINGLE_DELETE_CONFIRM_MESSAGE, action)`。
   - 保留常量 `const SINGLE_DELETE_CONFIRM_MESSAGE = '是否执行该操作？该操作执行后无法恢复。'`（与 PersonListPage 一致）。
   - 模板末尾 `<ConfirmActionModal>` 改为 `v-if="modal.isVisible.value" :message="modal.message.value" @confirm="modal.confirm" @cancel="modal.cancel"`。

3. **FlashcardPage.vue** 额外注意：`deleteCard` 第 325 行原 `window.confirm('确认删除这张背诵卡片吗？')` 改为 `modal.request('确认删除这张背诵卡片吗？', () => { ... })`。

**测试：** `npx vitest run` 全过（49 用例不破）。无需新增测试（useConfirmModal 自身已有 5 用例）。手动检查 4 个页面单条删除与批量删除都弹同一个 `ConfirmActionModal`。

---

### Task 7: 优化 study results 查询为 Map 一次构建

**文件：**
- 修改：`src/pages/FlashcardPage.vue`
- 修改：`src/pages/TimelineDetailPage.vue`
- 修改：`src/pages/PersonListPage.vue`
- 修改：`src/pages/FlashcardPage.spec.ts`（新增"多次标记取最新"用例）

**怎么做：**

1. 每个页面把 `xxxStudyResults` computed 改为返回 `Map<string, StudyResult>`：
   ```ts
   const latestResultByTarget = computed(() => {
     const map = new Map<string, StudyResult>()
     const sorted = [...store.studyRecords].sort((a, b) =>
       a.createdAt.localeCompare(b.createdAt),
     )
     for (const record of sorted) {
       if (record.targetType === 'card') { // 各页面换成对应 targetType
         map.set(record.targetId, record.result)
       }
     }
     return map
   })
   ```
2. **FlashcardPage.vue**：
   - 删 `getLatestCardStudyResult` 函数（第 437-442 行）。
   - `getDrawCandidateCards` 内 `getLatestCardStudyResult(card.id)` 改为 `latestResultByTarget.value.get(card.id)`。
   - `deleteCardsByStudyResult` 内同样替换。
   - 模板 `cardStudyResults[card.id]` 改为 `latestResultByTarget.get(card.id)`（共 4 处：drawn-card-list 与全部卡片列表各 2 处）。
3. **TimelineDetailPage.vue**：`eventStudyResults` 改为 Map；模板 `eventStudyResults[event.id]` 改为 `.get(event.id)`；传给 `<TimelineSnake :study-results="...">` 的 prop 类型需相应改为 `Map<string, StudyResult>`（同步检查 `TimelineSnake.vue` 内 `props.studyResults` 用法，若用 `props.studyResults[id]` 则改为 `.get(id)`，并更新类型声明）。
4. **PersonListPage.vue**：`personStudyResults` 改为 Map；模板 `personStudyResults[person.id]` 改为 `.get(person.id)`（共 2 处）；`deletePeopleByStudyResult` 内同样替换。
5. **FlashcardPage.spec.ts** 新增用例：标记同一卡片为 forgotten 再标记 remembered，验证 `getDrawCandidateCards` 在 'remembered' 范围下包含该卡片。

**测试：** `npx vitest run src/pages/FlashcardPage.spec.ts` 全过（含新增用例）；其余页面测试不破。

**注意：** `TimelineSnake.vue` 是子组件，若其 props 类型从 `Record<string, StudyResult>` 变为 `Map<string, StudyResult>`，需同步修改并跑 `TimelineSnake.spec.ts` 确认不破。如果改动过大，可退一步：在 `TimelineDetailPage.vue` 内部用一个 `Record` computed 包装 Map 给 TimelineSnake（保持子组件接口不变），仅在父组件内部用 Map 做查询。**优先采用包装方案以减小 blast radius。**

---

### Task 8: SearchPage 加防抖

**文件：**
- 新增：`src/composables/useDebouncedRef.ts`
- 修改：`src/pages/SearchPage.vue`
- 新增：`src/pages/SearchPage.spec.ts`
- 新增：`src/composables/useDebouncedRef.spec.ts`

**怎么做：**

1. 新增 `useDebouncedRef.ts`：
   ```ts
   import { ref, watch } from 'vue'
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
2. `SearchPage.vue`：把 `const query = ref('')` 改为 `const { value: query, debounced: debouncedQuery } = useDebouncedRef('', 200)`；`results` 改为 `computed(() => store.search(debouncedQuery.value))`；`hasQuery` 仍基于 `query.value`。
3. `useDebouncedRef.spec.ts`：用 `vi.useFakeTimers()` 覆盖：值变化后立即 debounced 不变、`advanceTimersByTime(200)` 后 debounced 更新、连续变化只取最后一次、组件卸载时清 timer（可选）。
4. `SearchPage.spec.ts`：覆盖输入后立即检查结果区为旧/空、`advanceTimersByTime(200)` 后结果更新、空查询不触发搜索、找到匹配的人物/时间线/事件/卡片分别显示。

**测试：** `npx vitest run src/composables/useDebouncedRef.spec.ts src/pages/SearchPage.spec.ts` 全过。

---

### Task 9: 路由懒加载

**文件：**
- 修改：`src/router/index.ts`

**怎么做：**
1. 删除第 2-9 行 8 个 `import XxxPage from '@/pages/XxxPage.vue'`。
2. `routes` 数组里每个 `component: XxxPage` 改为 `component: () => import('@/pages/XxxPage.vue')`。
3. 跑 `npm run build`，确认 `dist/assets/` 出现多个按页面拆分的 chunk（除 `index-*.js` 外至少 8 个页面 chunk）。

**测试：** `npm run build` 通过；`ls dist/assets/*.js` 出现多个 chunk。无新增单测（构建期行为）。

---

### Task 10: 模态 ESC 关闭 + focus trap

**文件：**
- 新增：`src/composables/useModalBehavior.ts`
- 新增：`src/composables/useModalBehavior.spec.ts`
- 修改：`src/components/ConfirmActionModal.vue`（内置 useModalBehavior）
- 修改：`src/pages/FlashcardPage.vue`（4 处模态：create / draw / detail / study / edit 共 5 处 `role="dialog"`）
- 修改：`src/pages/PersonListPage.vue`（create / study 2 处模态）
- 修改：`src/pages/TimelineListPage.vue`（create 1 处模态）
- 修改：`src/pages/TimelineDetailPage.vue`（create / detail / study / edit 4 处模态）

**怎么做：**

1. 新增 `useModalBehavior.ts`，签名：
   ```ts
   export function useModalBehavior(
     isActive: Ref<boolean>,
     onClose: () => void,
     options?: { trapFocus?: boolean },
   ): { containerRef: Ref<HTMLElement | null> }
   ```
   实现细节同原计划：监听 ESC 触发 onClose；Tab/Shift+Tab 在 containerRef 内循环；isActive 变 true 时记录 lastFocused、`document.body.style.overflow = 'hidden'`、nextTick 后焦点进容器；变 false 时还原 overflow 与焦点；`onUnmounted` 清理。

2. `ConfirmActionModal.vue` 内部调用 `useModalBehavior`，把 ESC + focus trap 内置，外部不再需要手动绑 keydown。模板根 `<div class="confirm-overlay">` 加 `:ref="el => containerRef = el"`（或用 `ref="containerRef"` 模板 ref）。

3. 每个页面对每个模态可见性 ref 调用 `useModalBehavior`：
   ```ts
   const createModal = useModalBehavior(isCreateFormVisible, () => { isCreateFormVisible.value = false })
   ```
   模态根 `<div class="...-modal" :ref="el => createModal.containerRef.value = el">`。
   注意一个页面可能有多个模态，每个都需要独立的 `useModalBehavior` 实例。

4. `useModalBehavior.spec.ts` 覆盖：ESC 触发 onClose、Tab 在容器内循环、显示时 body overflow hidden 隐藏时还原、显示时焦点进入容器隐藏时还原到原焦点、isActive 为 false 时不响应键盘。

**测试：** `npx vitest run src/composables/useModalBehavior.spec.ts` 全过；所有页面测试不破。

**注意：** Task 6 已让 ConfirmActionModal 通过 useConfirmModal 控制 visible；本任务的 useModalBehavior 是在 ConfirmActionModal 内部独立工作，与 useConfirmModal 不冲突。需检查两者协作：useConfirmModal 提供 `isVisible`，ConfirmActionModal 内部 `useModalBehavior(isVisible-from-props, () => emit('cancel'))`。具体做法：把 ConfirmActionModal 的 `isVisible` 改为基于 `v-if` 外部控制（保持现状），内部用一个 always-true 的本地 ref 喂给 useModalBehavior（因为组件挂载即表示可见），onClose 调 `emit('cancel')`。

---

### Task 11: safeLocalStorage + 加固 getTimeSortValue

**文件：**
- 新增：`src/domain/safeLocalStorage.ts`
- 新增：`src/domain/safeLocalStorage.spec.ts`
- 修改：`src/stores/historyStore.ts`（替换 localStorage 调用、重写 getTimeSortValue）
- 修改：`src/stores/historyStore.spec.ts`（新增 getTimeSortValue 用例）

**怎么做：**

1. 新增 `safeLocalStorage.ts`，导出 `safeLocalStorage` 对象，`getItem` / `setItem` / `removeItem` 三方法均 try/catch + `globalThis.localStorage?.` 可选链。`setItem` 返回 boolean 表示是否写入成功。

2. `historyStore.ts`：
   - import `safeLocalStorage`。
   - `persist()` 内 `localStorage.setItem` 改为 `safeLocalStorage.setItem`，若返回 false 则设 `lastError = '本地存储不可用或已满，数据未能保存。'`。
   - state 初始化时 `localStorage.getItem` 改为 `safeLocalStorage.getItem`。

3. 重写 `getTimeSortValue`：
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
   若函数当前未导出，在 `historyStore.spec.ts` 中通过 `eventsByTimeline` 间接验证排序结果，或在测试里通过 `vi.mock` / 重新导出方式测。**优先间接测**：创建多条事件（前221年 / 公元前221年 / 1840年 / 1911年10月 / 10月革命 / 空），断言 `eventsByTimeline` 返回顺序为 [-221, -221, 1840, 1911, MAX, MAX]（后两个顺序不固定，可用 `toEqual` 比较前 4 个 + 后 2 个的集合）。

4. `safeLocalStorage.spec.ts`：mock `globalThis.localStorage` 抛错（`Object.defineProperty(globalThis, 'localStorage', { get() { throw new Error('blocked') } })`），三个方法都不崩且返回 null/false/void。

**测试：** `npx vitest run src/domain/safeLocalStorage.spec.ts src/stores/historyStore.spec.ts` 全过。

---

### Task 12: 调查并修复 tsconfig ignoreDeprecations

**文件：**
- 修改：`tsconfig.json`（视调查结果）
- 可能修改：`tsconfig.node.json`

**怎么做：**
1. 先删 `tsconfig.json:15` 的 `"ignoreDeprecations": "6.0"`。
2. 跑 `npm run build`（触发 `vue-tsc --noEmit`）。
3. 三种可能结果：
   - **A**：无任何 deprecation 警告 → 删掉该行，无其他改动。
   - **B**：有具体 deprecation 警告 → 修对应选项（常见：`importsNotUsedAsValues` → `verbatimModuleSyntax`；`keyofStringsOnly` / `noImplicitUseStrict` 等已弃用 → 删）。
   - **C**：警告来自 `@vue/tsconfig` 或插件 → 保留 `ignoreDeprecations` 但加注释说明来源。
4. 调查结论写入 commit message。

**测试：** `npm run build` 通过；`npm test` 通过。无新增单测。

---

### Task 13: 引入 ESLint + Prettier 并格式化全量代码

**文件：**
- 新增：`.eslintrc.cjs`
- 新增：`.prettierrc.json`
- 新增：`.eslintignore`
- 修改：`package.json`（加 devDeps + scripts）
- 可能修改：现有源文件（仅修复 lint error）

**怎么做：**

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
     parserOptions: { ecmaVersion: 'latest' },
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
5. `.eslintignore`：`dist/`、`node_modules/`、`coverage/`、`*.config.ts`。
6. 跑 `npm install` 安装新依赖（会更新 lockfile）。
7. 跑 `npm run lint:fix` 和 `npm run format` 规整现有代码（**单独一个 commit**）。
8. 跑 `npm run lint` 确认退出码 0；若有不可自动修的 error，手动修。
9. 跑 `npm run build` + `npm test` 确认未破坏。

**测试：** `npm run lint` 退出码 0；`npm run build` 通过；`npm test` 通过。无新增单测。

**注意：** 本任务会产生较大 diff，建议作为最后一个代码改动 commit，避免与其他 task 冲突。但需在 Task 14/15 之前做，以便 README 和新 spec 也被格式化。

---

### Task 14: 补 README.md

**文件：**
- 新增：`README.md`

**怎么做：** 用简体中文写 8 个章节：
1. **项目简介**：浏览器端历史背诵辅助软件，本地 localStorage 持久化，无后端。
2. **功能特性**：人物 / 时间线 / 事件 / 卡片四类数据，关键词搜索，三种背诵模式，导入导出。
3. **技术栈**：Vue 3、Vite、TypeScript、Pinia、vue-router、Vitest、happy-dom。
4. **目录结构**：列出 `src/domain`、`src/stores`、`src/pages`、`src/components`、`src/composables`、`src/router`、`src/styles` 各自职责。
5. **运行命令**：`npm install` / `npm run dev` / `npm run build` / `npm test` / `npm run test:watch` / `npm run lint` / `npm run lint:fix` / `npm run format`。
6. **数据格式**：localStorage key 是 `history-memorization:data`，导出 JSON 字段（`version`、`timelines`、`events`、`people`、`cards`、`studyRecords`），指向 `src/domain/historyTypes.ts`。
7. **设计文档**：指向 `docs/superpowers/specs/2026-06-21-history-memorization-design.md` 和 `docs/superpowers/plans/`。
8. **License**：参考根目录 `LICENSE` 文件。

**测试：** 文件存在 + 包含 8 个章节标题。无单测。

---

### Task 15: 补齐测试覆盖

**文件（按优先级）：**
- 新增：`src/domain/createId.spec.ts`
- 新增：`src/components/EntityCard.spec.ts`
- 新增：`src/components/ConfirmActionModal.spec.ts`
- 新增：`src/pages/HomePage.spec.ts`
- 新增：`src/pages/ImportExportPage.spec.ts`
- 新增：`src/pages/PersonDetailPage.spec.ts`
- 新增：`src/pages/PersonListPage.spec.ts`（CRUD 用例，与 Task 5 已建的 TimelineListPage.spec.ts 模式一致）
- 新增：`src/pages/TimelineDetailPage.spec.ts`

**怎么做：** 每个文件至少覆盖以下路径（详细用例清单见原计划 Task 15）：

- **createId.spec.ts**：crypto.randomUUID 分支（mock 返回固定值）+ 降级分支（删 crypto.randomUUID 后匹配 `^id-\d+-[0-9a-f]+$`）。
- **EntityCard.spec.ts**：渲染 title/subtitle/summary；不传可选 prop 时不渲染对应元素。
- **ConfirmActionModal.spec.ts**：点击确认 emit confirm、点击取消 emit cancel、点击 overlay self emit cancel、ESC 关闭（依赖 Task 10 的 useModalBehavior 集成）。
- **HomePage.spec.ts**：空数据提示、有数据显示最近 3 条事件 + 最近 3 个人物、feature-rail RouterLink 跳转目标正确（需 createMemoryHistory 测试 router，与 TimelineListPage.spec.ts 一致）。
- **ImportExportPage.spec.ts**：导出生成 `<a download="history-memorization-export.json">`（mock URL.createObjectURL）、导出 JSON 不含 `lastError`、含 `version: 1`（验证 Task 3）、导入合法 JSON 调 `store.replaceAll`、导入非法 JSON 显示错误且不调 replaceAll。
- **PersonDetailPage.spec.ts**：不存在 personId 显示 not-found、存在显示姓名/生平/成就/关键词、关联事件来自 `store.eventsByPerson`、新建事件自动绑定 personId、未选时间线显示错误。
- **PersonListPage.spec.ts**：创建人物必填姓名、编辑保存后 store 更新、单条删除弹 ConfirmActionModal（验证 Task 6）、批量删除已背过/未背过。
- **TimelineDetailPage.spec.ts**：不存在 timelineId 显示 not-found、事件按 timeLabel 排序、创建事件必填 timeLabel+title、编辑保存后 store 更新、删除事件弹 ConfirmActionModal、背诵模式标记写入 studyRecords、批量删除已背过/未背过。

**测试：** `npx vitest run` 全过，总用例数 ≥ 60。

---

## Verification Steps

按以下顺序在执行阶段依次验证：

1. **Task 6 收尾后**：`npx vitest run` 全过（49 用例不破）；手动检查 4 个页面单条/批量删除都弹同一 ConfirmActionModal。
2. **Task 7 后**：`npx vitest run src/pages/FlashcardPage.spec.ts` 全过（含新增"多次标记取最新"用例）。
3. **Task 8 后**：`npx vitest run src/composables/useDebouncedRef.spec.ts src/pages/SearchPage.spec.ts` 全过。
4. **Task 9 后**：`npm run build` 通过；`ls dist/assets/*.js` 出现多个 chunk。
5. **Task 10 后**：`npx vitest run src/composables/useModalBehavior.spec.ts` 全过；所有页面测试不破。
6. **Task 11 后**：`npx vitest run src/domain/safeLocalStorage.spec.ts src/stores/historyStore.spec.ts` 全过。
7. **Task 12 后**：`npm run build` 通过；调查结论写入 commit。
8. **Task 13 后**：`npm run lint` 退出码 0；`npm run build` + `npm test` 通过。
9. **Task 14 后**：`README.md` 存在且包含 8 个章节标题。
10. **Task 15 后**：`npx vitest run` 全过，总用例数 ≥ 60。

**最终全量验收**：
- `npm install` 无报错
- `npm run build` 通过
- `npx vitest run` 全过（≥ 60 用例）
- `npm run lint` 退出码 0
- 手动 `npm run dev` 走一遍 MVP 路径（创建时间线 → 加事件 → 看蛇形时间线 → 创建人物 → 关联事件 → 创建卡片 → 背诵 → 搜索 → 导出 → 清 localStorage → 导入恢复）

**Commit 拆分建议**（遵循 `.cursor/rules/chinese-git-commits.mdc` 简体中文规则，本次只 add/commit 不 push）：
1. `完成 useConfirmModal 在四个页面的统一改造`（Task 6 收尾）
2. `优化背诵结果查询为 Map 一次构建`（Task 7）
3. `为 SearchPage 输入加防抖`（Task 8）
4. `路由改为懒加载以拆分首屏 bundle`（Task 9）
5. `新增模态 ESC 关闭与焦点陷阱`（Task 10）
6. `封装 safeLocalStorage 并加固 getTimeSortValue 解析`（Task 11）
7. `调查并处理 tsconfig 的 ignoreDeprecations 配置`（Task 12）
8. `引入 ESLint 与 Prettier 并格式化全量代码`（Task 13）
9. `新增项目 README`（Task 14）
10. `补齐 createId / EntityCard / ConfirmActionModal / HomePage / ImportExportPage / PersonDetailPage / PersonListPage / TimelineDetailPage 测试`（Task 15）

---

## Out of Scope（本次明确不做，与原计划一致）

- IndexedDB 替换 localStorage（架构级，单独立项）
- 给 store 建倒排索引（性能优化，目前数据量不需要）
- 抽出 BulkDeleteController composable（Task 6 的 useConfirmModal 已部分去重）
- 第二版 AI 解析、账号系统、云端同步（设计文档明确不进第一版）
- pre-commit hook 强制 lint
- CI 配置
- 国际化（i18n）
- 暗色主题

## Execution Order

按 Task 6 收尾 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 顺序执行。Task 13（lint+format）放在 Task 14/15 之前，确保 README 和新 spec 也被格式化；但 Task 13 的格式化 commit 应独立，不与其他 task 混在一起。每个 task 完成后立即跑相关测试验收，全部完成后跑全量验收。

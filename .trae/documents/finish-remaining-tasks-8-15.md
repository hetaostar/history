# 历史背诵助手 - 收尾 Task 8 并完成 Task 9-15

## Summary

承接已批准的 [fix-remaining-issues-and-add-tests.md](file:///Users/by/Documents/project/history/.trae/documents/fix-remaining-issues-and-add-tests.md)，本计划只覆盖**剩余未完成**的工作：Task 8 防抖修复验证、Task 9-15 共 7 个任务。

Task 1-7 已完成且通过验收（55 用例全过、build 通过）。Task 8 的 `useDebouncedRef.ts` / `SearchPage.vue` / `useDebouncedRef.spec.ts` / `SearchPage.spec.ts` 文件已写入磁盘，但 `useDebouncedRef.spec.ts` 刚修复 fake timers + watch async 问题（加 `await nextTick()`）尚未跑测试验证。

最终交付：所有原有测试通过、新增测试通过、`npm run build` 通过、`npm test` 通过（≥60 用例）、`npm run lint` 退出码 0、README.md 存在。

## Current State Analysis

### 已完成（无需重复）

- **Task 1-5**：TimelineSnake 测试选择器、依赖固化、schema 版本号、删除 sortValue、空时间线三态。✅
- **Task 6**：4 个页面（PersonListPage / TimelineListPage / TimelineDetailPage / FlashcardPage）全部完成 useConfirmModal 改造；`useConfirmModal.ts` + spec 已建（5/5 通过）。✅
- **Task 7**：3 个页面 latestResultByTarget 改为 Map + createdAt 排序覆盖；TimelineDetailPage 保留 eventStudyResults Record 包装给 TimelineSnake；FlashcardPage 新增多次标记取最新用例。✅

### Task 8 待验证

- `src/composables/useDebouncedRef.ts` 已建（最终版本，含 `as Ref<T>` 类型断言）。
- `src/pages/SearchPage.vue` 已用 `useDebouncedRef('', 200)` 替换 `ref('')`，`results` 基于 `debouncedQuery.value`，`hasQuery` 基于 `query.value`。
- `src/composables/useDebouncedRef.spec.ts` 已修复——原 3 个用例失败因为 vue `watch` 是异步 microtask，`vi.advanceTimersByTime` 不会 flush microtask；修复方案是每次 `value.value = ...` 后加 `await nextTick()`。文件已写入但**未跑测试验证**。
- `src/pages/SearchPage.spec.ts` 已建（4 用例：空查询提示、防抖前不更新、防抖后更新、多类型匹配），使用 `createMemoryHistory` + `createRouter` 测试 RouterLink。

### 剩余工作（Task 9-15 全部未做）

- **Task 9**：`src/router/index.ts:2-9` 仍是 8 个 eager import（HomePage / TimelineListPage / TimelineDetailPage / PersonListPage / PersonDetailPage / FlashcardPage / SearchPage / ImportExportPage）。
- **Task 10**：`src/composables/useModalBehavior.ts` 不存在；`ConfirmActionModal.vue` 仅有 `@click.self="emit('cancel')"`，无 ESC、无 focus trap；4 个页面所有 `role="dialog"` 模态同样缺 a11y。
- **Task 11**：`src/domain/safeLocalStorage.ts` 不存在；`historyStore.ts:35` `localStorage.getItem` 与 `:250` `localStorage.setItem` 直接调用未防御；`getTimeSortValue` (:321-331) 仍是 `/\d+/` 抓第一个数字串（"10月革命"→10）。
- **Task 12**：`tsconfig.json:15` 仍有 `"ignoreDeprecations": "6.0"`。
- **Task 13**：`package.json` 无 `lint` / `lint:fix` / `format` scripts，无 eslint/prettier 依赖；根目录无 `.eslintrc.cjs` / `.prettierrc.json` / `.eslintignore`。
- **Task 14**：根目录无 `README.md`。
- **Task 15**：仍缺 8 个 spec：`createId.spec.ts`、`EntityCard.spec.ts`、`ConfirmActionModal.spec.ts`、`HomePage.spec.ts`、`ImportExportPage.spec.ts`、`PersonDetailPage.spec.ts`、`PersonListPage.spec.ts`、`TimelineDetailPage.spec.ts`。

### 额外发现

`ImportExportPage.vue:43` 的 `window.confirm(IMPORT_CONFIRM_MESSAGE)` 仍是原生 confirm（导入覆盖确认）。原计划 Task 6 范围只覆盖删除确认，不包含此处。**本计划保持原范围，不改 ImportExportPage 的 confirm**，留待后续 UX 统一。

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

### Task 8: 验证 SearchPage 防抖修复

**文件：** 无需新增修改，仅验证已写入的文件。

**怎么做：**

1. 跑 `npx vitest run src/composables/useDebouncedRef.spec.ts src/pages/SearchPage.spec.ts`，确认 9 个用例全过（useDebouncedRef 5 个 + SearchPage 4 个）。
2. 若 `useDebouncedRef.spec.ts` 仍有失败：检查 `value.value = ...` 后是否都有 `await nextTick()`；检查 `vi.advanceTimersByTime` 调用顺序。
3. 若 `SearchPage.spec.ts` 失败：检查 `await wrapper.vm.$nextTick()` 是否在 `vi.advanceTimersByTime(200)` 之后调用（防抖 timer 触发后需要 microtask flush 让 computed 重算）。
4. 跑全量 `npx vitest run`，确认 55 用例不破。

**测试：** `npx vitest run` 全过（≥55 用例）。

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
- 修改：`src/pages/FlashcardPage.vue`（5 处模态：create / draw / detail / study / edit 的 `role="dialog"`）
- 修改：`src/pages/PersonListPage.vue`（2 处模态：create / study）
- 修改：`src/pages/TimelineListPage.vue`（1 处模态：create）
- 修改：`src/pages/TimelineDetailPage.vue`（4 处模态：create / detail / study / edit）

**怎么做：**

1. 新增 `src/composables/useModalBehavior.ts`，签名：
   ```ts
   export function useModalBehavior(
     isActive: Ref<boolean>,
     onClose: () => void,
   ): { containerRef: Ref<HTMLElement | null> }
   ```
   实现细节：
   - 监听 ESC 触发 `onClose`。
   - 监听 Tab / Shift+Tab 在 `containerRef` 内循环（聚焦第一个/最后一个可聚焦元素）。
   - `isActive` 变 true 时记录 `lastFocused = document.activeElement`、`document.body.style.overflow = 'hidden'`、`nextTick` 后焦点进容器内第一个可聚焦元素。
   - 变 false 时还原 `overflow` 与焦点。
   - `onUnmounted` 清理 listener 与 overflow。

2. `ConfirmActionModal.vue` 内部调用 `useModalBehavior`，把 ESC + focus trap 内置。具体做法：组件挂载即表示可见，用一个 always-true 的本地 ref 喂给 `useModalBehavior`，`onClose` 调 `emit('cancel')`。模板根 `<div class="confirm-overlay">` 加 `:ref="el => containerRef = el"`（或用 template ref）。

3. 每个页面对每个模态可见性 ref 调用 `useModalBehavior`：
   ```ts
   const createModal = useModalBehavior(
     isCreateFormVisible,
     () => { isCreateFormVisible.value = false },
   )
   ```
   模态根 `<div class="...-modal" :ref="el => createModal.containerRef.value = el">`。一个页面可能有多个模态，每个都需要独立的 `useModalBehavior` 实例。

4. `useModalBehavior.spec.ts` 覆盖：
   - ESC 触发 onClose
   - Tab 在容器内循环（最后一个 Tab 回到第一个，第一个 Shift+Tab 跳到最后一个）
   - 显示时 `document.body.style.overflow === 'hidden'`，隐藏时还原
   - 显示时焦点进入容器，隐藏时还原到原焦点
   - isActive 为 false 时不响应键盘

**测试：** `npx vitest run src/composables/useModalBehavior.spec.ts` 全过；所有页面测试不破。

**注意：** ConfirmActionModal 的 `useModalBehavior` 与外部的 `useConfirmModal` 协作：useConfirmModal 提供 `isVisible` 控制 `v-if`，ConfirmActionModal 内部 `useModalBehavior(alwaysTrue, () => emit('cancel'))` 处理 a11y。需检查两者协作不冲突。

---

### Task 11: safeLocalStorage + 加固 getTimeSortValue

**文件：**
- 新增：`src/domain/safeLocalStorage.ts`
- 新增：`src/domain/safeLocalStorage.spec.ts`
- 修改：`src/stores/historyStore.ts`（替换 localStorage 调用、重写 getTimeSortValue）
- 修改：`src/stores/historyStore.spec.ts`（新增 getTimeSortValue 间接用例）

**怎么做：**

1. 新增 `safeLocalStorage.ts`，导出 `safeLocalStorage` 对象：
   ```ts
   export const safeLocalStorage = {
     getItem(key: string): string | null {
       try { return globalThis.localStorage?.getItem(key) ?? null }
       catch { return null }
     },
     setItem(key: string, value: string): boolean {
       try { globalThis.localStorage?.setItem(key, value); return true }
       catch { return false }
     },
     removeItem(key: string): void {
       try { globalThis.localStorage?.removeItem(key) } catch { /* noop */ }
     },
   }
   ```

2. `historyStore.ts`：
   - import `safeLocalStorage`。
   - state 初始化 `localStorage.getItem(STORAGE_KEY)` 改为 `safeLocalStorage.getItem(STORAGE_KEY)`。
   - `persist()` 内 `localStorage.setItem` 改为 `safeLocalStorage.setItem`，若返回 false 则设 `lastError = SAVE_ERROR_MESSAGE`（保持现有错误信息）。

3. 重写 `getTimeSortValue`（当前 :321-331）：
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

4. `safeLocalStorage.spec.ts`：mock `globalThis.localStorage` 抛错（`Object.defineProperty(globalThis, 'localStorage', { get() { throw new Error('blocked') } })`），三个方法都不崩且返回 null/false/void。

5. 在 `historyStore.spec.ts` 新增间接用例（通过 `eventsByTimeline` 排序验证）：创建多条事件（前221年 / 公元前221年 / 1840年 / 1911年10月 / 10月革命 / 空），断言 `eventsByTimeline` 返回顺序前 4 个为 [-221, -221, 1840, 1911]，后 2 个为 [MAX, MAX]（顺序不固定，用集合比较）。

**测试：** `npx vitest run src/domain/safeLocalStorage.spec.ts src/stores/historyStore.spec.ts` 全过。

---

### Task 12: 调查并处理 tsconfig ignoreDeprecations

**文件：**
- 修改：`tsconfig.json`（视调查结果）
- 可能修改：`tsconfig.node.json`

**怎么做：**

1. 删 `tsconfig.json:15` 的 `"ignoreDeprecations": "6.0"`。
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
6. 跑 `npm install` 安装新依赖（更新 lockfile）。
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
- 新增：`src/pages/PersonListPage.spec.ts`
- 新增：`src/pages/TimelineDetailPage.spec.ts`

**怎么做：** 每个文件至少覆盖以下路径：

#### `createId.spec.ts`
- 调用 `crypto.randomUUID` 分支（mock `crypto.randomUUID` 返回固定值，断言 createId 返回该值）
- 降级分支（删除 `crypto.randomUUID` 后返回 `id-${Date.now()}-${...}` 格式，用正则匹配 `^id-\d+-[0-9a-f]+$`）

#### `EntityCard.spec.ts`
- 渲染 title / subtitle / summary
- 不传 subtitle / summary 时不渲染对应元素（验证 `v-if`）

#### `ConfirmActionModal.spec.ts`
- 点击确认按钮 emit `confirm`
- 点击取消按钮 emit `cancel`
- 点击 overlay（self）emit `cancel`
- ESC 关闭（依赖 Task 10 的 useModalBehavior 集成，emit `cancel`）

#### `HomePage.spec.ts`
- 空数据时显示"还没有事件"和"还没有人物"提示
- 有数据时显示最近 3 条事件和最近 3 个人物
- feature-rail 的 RouterLink 跳转目标正确（用 createMemoryHistory + createRouter，参考 TimelineListPage.spec.ts 模式）

#### `ImportExportPage.spec.ts`
- 导出按钮触发后生成了 `<a download="history-memorization-export.json">`（mock `URL.createObjectURL` 与 `HTMLAnchorElement.prototype.click`）
- 导出 JSON 不含 `lastError` 字段（验证 Task 3 修复）
- 导出 JSON 含 `version: 1`（验证 Task 3 修复）
- 导入合法 JSON 后调用 `store.replaceAll`（mock `DataTransfer` / `FileList`，参考 vitest 文档）
- 导入非法 JSON 后显示"导入文件格式不正确"且不调用 `store.replaceAll`

#### `PersonDetailPage.spec.ts`
- 加载不存在的 personId 显示"没有找到这位人物"
- 加载存在的人物显示姓名 / 生平 / 成就 / 关键词
- 关联事件列表来自 `store.eventsByPerson`
- 新建相关事件时自动绑定当前 personId
- 表单校验：未选时间线时显示错误

#### `PersonListPage.spec.ts`
- 创建人物：必填姓名校验
- 编辑人物：保存后 store.people 更新
- 单条删除：弹出 ConfirmActionModal（验证 Task 6 修复）
- 批量删除已背过：只删已背过的人物
- 批量删除未背过：只删未背过的人物

#### `TimelineDetailPage.spec.ts`
- 加载不存在的时间线显示"没有找到这条时间线"
- 事件列表按 timeLabel 排序展示
- 创建事件：必填 timeLabel 和 title
- 编辑事件：保存后 store.events 更新
- 删除事件：弹出 ConfirmActionModal
- 背诵模式：点击事件打开 StudyRevealCard，标记后写入 studyRecords
- 批量删除已背过 / 未背过

**测试：** `npx vitest run` 全过，总用例数 ≥ 60。

---

## Verification Steps

按以下顺序在执行阶段依次验证：

1. **Task 8 后**：`npx vitest run src/composables/useDebouncedRef.spec.ts src/pages/SearchPage.spec.ts` 全过；`npx vitest run` 全量不破。
2. **Task 9 后**：`npm run build` 通过；`ls dist/assets/*.js` 出现多个 chunk。
3. **Task 10 后**：`npx vitest run src/composables/useModalBehavior.spec.ts` 全过；所有页面测试不破。
4. **Task 11 后**：`npx vitest run src/domain/safeLocalStorage.spec.ts src/stores/historyStore.spec.ts` 全过。
5. **Task 12 后**：`npm run build` 通过；调查结论写入 commit。
6. **Task 13 后**：`npm run lint` 退出码 0；`npm run build` + `npm test` 通过。
7. **Task 14 后**：`README.md` 存在且包含 8 个章节标题。
8. **Task 15 后**：`npx vitest run` 全过，总用例数 ≥ 60。

**最终全量验收**：
- `npm install` 无报错
- `npm run build` 通过
- `npx vitest run` 全过（≥ 60 用例）
- `npm run lint` 退出码 0
- 手动 `npm run dev` 走一遍 MVP 路径（创建时间线 → 加事件 → 看蛇形时间线 → 创建人物 → 关联事件 → 创建卡片 → 背诵 → 搜索 → 导出 → 清 localStorage → 导入恢复）

**Commit 拆分建议**（遵循 `.cursor/rules/chinese-git-commits.mdc` 简体中文规则，本次只 add/commit 不 push）：
1. `为 SearchPage 输入加防抖`（Task 8，仅验证不产生新 diff；若已 commit 可跳过）
2. `路由改为懒加载以拆分首屏 bundle`（Task 9）
3. `新增模态 ESC 关闭与焦点陷阱`（Task 10）
4. `封装 safeLocalStorage 并加固 getTimeSortValue 解析`（Task 11）
5. `调查并处理 tsconfig 的 ignoreDeprecations 配置`（Task 12）
6. `引入 ESLint 与 Prettier 并格式化全量代码`（Task 13）
7. `新增项目 README`（Task 14）
8. `补齐 createId / EntityCard / ConfirmActionModal / HomePage / ImportExportPage / PersonDetailPage / PersonListPage / TimelineDetailPage 测试`（Task 15）

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
- ImportExportPage 导入确认 window.confirm → ConfirmActionModal 的迁移（原计划 Task 6 范围只覆盖删除确认）

## Execution Order

按 Task 8 验证 → 9 → 10 → 11 → 12 → 13 → 14 → 15 顺序执行。Task 13（lint+format）放在 Task 14/15 之前，确保 README 和新 spec 也被格式化；但 Task 13 的格式化 commit 应独立，不与其他 task 混在一起。每个 task 完成后立即跑相关测试验收，全部完成后跑全量验收。

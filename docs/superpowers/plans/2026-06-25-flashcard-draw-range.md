# Flashcard Draw Range Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在卡片背诵页的随机抽卡表单中支持按范围抽卡，包括全部、已背过、未背过和自定义筛选。

**Architecture:** 只修改 `FlashcardPage.vue` 的页面状态、筛选逻辑和模板结构，复用现有卡片数据、背诵记录和本地状态。新增页面级组件测试覆盖范围筛选，避免改变 store 数据结构。

**Tech Stack:** Vue 3、TypeScript、Pinia、Vitest、@vue/test-utils、happy-dom。

---

## File Structure

- `src/pages/FlashcardPage.vue`：新增抽卡范围下拉、自定义方向下拉、自定义输入、范围筛选逻辑和错误提示。
- `src/pages/FlashcardPage.spec.ts`：新增页面级测试，验证未背过范围与关键词自定义范围会限制抽卡来源。

## Tasks

### Task 1: Range Filtering Tests

**Files:**
- Create: `src/pages/FlashcardPage.spec.ts`

- [ ] **Step 1: Write failing tests**

Add tests that mount `FlashcardPage.vue` with a real Pinia store, create cards and records, then verify:

```ts
it('draws only forgotten cards when range is forgotten', async () => {})
it('draws only cards matching a custom keyword range', async () => {})
```

- [ ] **Step 2: Run tests**

Run:

```bash
PATH="$PWD/.tools/node-v22.23.0-darwin-x64/bin:$PATH" pnpm test -- src/pages/FlashcardPage.spec.ts
```

Expected: tests fail because the page has no draw range controls.

### Task 2: Implement Draw Range UI And Logic

**Files:**
- Modify: `src/pages/FlashcardPage.vue`

- [ ] **Step 1: Add typed draw range state**

Add types for `all`, `remembered`, `forgotten`, `custom`, and custom dimensions `person`, `event`, `keyword`.

- [ ] **Step 2: Add filtering helpers**

Filter candidates before shuffle:

```ts
const candidateCards = getDrawCandidateCards()
drawnCardIds.value = shuffleCards(candidateCards).slice(0, normalizedCount).map((card) => card.id)
```

- [ ] **Step 3: Add dropdown-like controls**

Render `抽卡范围` as one horizontal bar showing the current value. When open, render four row options below it. If `自定义` is selected, render a second bar for direction and an input plus `确认自定义范围`.

- [ ] **Step 4: Run targeted tests and build**

Run:

```bash
PATH="$PWD/.tools/node-v22.23.0-darwin-x64/bin:$PATH" pnpm test -- src/pages/FlashcardPage.spec.ts
PATH="$PWD/.tools/node-v22.23.0-darwin-x64/bin:$PATH" pnpm build
```

Expected: tests and build pass.

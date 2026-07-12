# 移除近现代历史时期 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让事件目录与“中华历史长河”均止于清朝，并移除全部 1912 年及之后的内置事件。

**Architecture:** 直接修改共享数据源 `HISTORY_PERIODS`、`DYNASTIES` 和 `RAW_KEY_EVENTS`，使所有使用方自动获得一致结果，不在页面层增加过滤。先调整测试形成预期失败，再删除对应源数据并执行完整验证。

**Tech Stack:** Vue 3、TypeScript、Vitest、Vite。

---

## File Structure

- `src/domain/historyPeriods.spec.ts`：断言时期导航止于“清”，且时期结束边界不超过 1912 年。
- `src/domain/historyPeriods.ts`：删除“中华民国”和“中华人民共和国”时期。
- `src/data/chinaHistoryRiver.spec.ts`：断言朝代与事件数据止于 1912 年以前，并更新数据规模和关键事件测试。
- `src/data/chinaHistoryRiver.ts`：删除两个近现代长河区块及 1912 年以后的 31 条事件。

## Tasks

### Task 1: 锁定新的数据边界

**Files:**
- Modify: `src/domain/historyPeriods.spec.ts:10-35`
- Modify: `src/data/chinaHistoryRiver.spec.ts:18-174`

- [ ] **Step 1: 修改时期列表测试**

将 `HISTORY_PERIODS` 的预期列表改为止于“清”，并增加结束边界断言：

```ts
expect(HISTORY_PERIODS.map((period) => period.name)).toEqual([
  '夏',
  '商',
  '西周',
  '春秋',
  '战国',
  '秦与楚汉之际',
  '两汉',
  '三国',
  '两晋南北朝',
  '隋',
  '唐',
  '五代十国',
  '宋辽金',
  '元',
  '明',
  '清',
])
expect(Math.max(...HISTORY_PERIODS.map((period) => period.endYear))).toBe(1912)
```

- [ ] **Step 2: 修改长河数据边界测试**

将规模断言更新为 52 个朝代区块和 241 条事件，并增加明确的截止边界：

```ts
expect(DYNASTIES).toHaveLength(52)
expect(KEY_EVENTS).toHaveLength(241)
expect(DYNASTIES.map((dynasty) => dynasty.chineseName)).not.toEqual(
  expect.arrayContaining(['中华民国', '中华人民共和国']),
)
expect(Math.max(...DYNASTIES.map((dynasty) => dynasty.endYear))).toBe(1912)
expect(Math.max(...KEY_EVENTS.map((event) => event.year))).toBeLessThan(1912)
```

同时：

- 从“固定关键事件 ID”测试中删除“新中国成立”的断言，并将测试名改为“固定关键事件 ID，覆盖公元前和同年多事件”。
- 将“全部内置事件提供说明”的数量断言由 `272` 改为 `241`。
- 将说明生成测试名改为“生成确定性的公元前、并立时期和无朝代说明”，删除内置“新中国成立”的说明断言。
- 保留传入 2026 年自定义事件的断言，确保通用说明生成能力不受影响。

- [ ] **Step 3: 运行测试确认正确失败**

Run:

```bash
npm test -- src/domain/historyPeriods.spec.ts src/data/chinaHistoryRiver.spec.ts
```

Expected: FAIL；失败原因应为当前仍存在两个近现代时期、两个近现代朝代区块和 31 条现代事件，实际数量仍为 54 和 272。

### Task 2: 删除近现代源数据

**Files:**
- Modify: `src/domain/historyPeriods.ts:15-59`
- Modify: `src/data/chinaHistoryRiver.ts:459-494`
- Modify: `src/data/chinaHistoryRiver.ts:2152-2376`

- [ ] **Step 1: 删除时期定义**

从 `HISTORY_PERIODS` 删除以下两个对象，使数组最后一项为 `qing`：

```ts
{
  id: 'republic-of-china',
  name: '中华民国',
  startYear: 1912,
  endYear: 1949,
},
{
  id: 'peoples-republic-of-china',
  name: '中华人民共和国',
  startYear: 1949,
  endYear: 2026,
},
```

- [ ] **Step 2: 删除长河区块**

从 `DYNASTIES` 删除 `id: 'roc'` 和 `id: 'prc'` 两个对象，保留结束于 1912 年的清朝对象。

- [ ] **Step 3: 删除现代事件**

从 `RAW_KEY_EVENTS` 删除 `china-event-0236` 至 `china-event-0266`。保留 1911 年的 `china-event-0235`“辛亥革命”，并保留随后定义但年份早于 1912 年的 `china-event-0267` 至 `china-event-0272`。

- [ ] **Step 4: 运行目标测试确认通过**

Run:

```bash
npm test -- src/domain/historyPeriods.spec.ts src/data/chinaHistoryRiver.spec.ts
```

Expected: PASS；两个测试文件全部通过，无 warning 或 error。

### Task 3: 完整回归验证

**Files:**
- Verify only; no production file changes expected.

- [ ] **Step 1: 运行完整测试**

Run:

```bash
npm test
```

Expected: 全部测试通过。若存在依赖旧数据数量或现代条目的测试，只更新与本次移除范围直接相关的断言。

- [ ] **Step 2: 运行构建**

Run:

```bash
npm run build
```

Expected: `vue-tsc --noEmit` 与 `vite build` 均成功。

- [ ] **Step 3: 检查改动文件诊断**

检查 `src/domain/historyPeriods.ts`、`src/domain/historyPeriods.spec.ts`、`src/data/chinaHistoryRiver.ts` 和 `src/data/chinaHistoryRiver.spec.ts`，确认没有新增 IDE linter 错误。

本计划不包含 Git 提交；只有用户明确要求时才创建提交。

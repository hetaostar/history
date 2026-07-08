# 历史背诵辅助软件

## 项目简介

浏览器端历史背诵辅助软件，把零散的史料收成可背诵的秩序。用人物作锚点，用时间线搭骨架，再把高频考点拆成卡片。所有数据保存在浏览器本地 `localStorage`，无后端、无账号、无云端同步，开箱即用。

## 功能特性

- **四类数据**：人物、时间线（含事件）、背诵卡片，互相关联。
- **关键词搜索**：跨人物、事件、时间线、卡片全库检索。
- **三种背诵模式**：
  - 时间线事件背诵（蛇形时间线视图）
  - 人物背诵
  - 卡片翻卡背诵（支持按全部 / 已背过 / 未背过 / 自定义范围抽卡）
- **导入导出**：一键导出 JSON 备份，支持从文件恢复。
- **本地持久化**：数据自动保存到 `localStorage`，刷新不丢失。
- **可访问性**：模态对话框支持 ESC 关闭与 Tab 焦点循环。

## 技术栈

- [Vue 3](https://vuejs.org/)（`<script setup>` + Composition API）
- [Vite](https://vitejs.dev/) 构建工具
- [TypeScript](https://www.typescriptlang.org/)
- [Pinia](https://pinia.vuejs.org/) 状态管理
- [vue-router](https://router.vuejs.org/) 路由（懒加载拆分首屏 bundle）
- [Vitest](https://vitest.dev/) + [@vue/test-utils](https://test-utils.vuejs.org/) + [happy-dom](https://github.com/capricorn86/happy-dom) 测试栈
- [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) 代码规范

## 目录结构

```
src/
├── domain/          # 领域层：数据类型、schema 校验、createId、safeLocalStorage、时间线布局算法
├── stores/          # Pinia store：historyStore 负责全部数据与持久化
├── pages/           # 页面组件：Home / TimelineList / TimelineDetail / PersonList / PersonDetail / Flashcard / Search / ImportExport
├── components/      # 通用组件：EntityCard / StudyRevealCard / TimelineSnake / ConfirmActionModal
├── composables/     # 组合式函数：useConfirmModal / useDebouncedRef / useModalBehavior
├── router/          # 路由配置（懒加载）
├── styles/          # 全局样式
├── App.vue          # 根组件
└── main.ts          # 应用入口
```

## 运行命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查 + 生产构建
npm run build

# 运行全部测试
npm test

# 测试监听模式
npm run test:watch

# ESLint 检查（不修改文件）
npm run lint

# ESLint 自动修复
npm run lint:fix

# Prettier 格式化 src 下代码
npm run format
```

## 数据格式

本地数据保存在 `localStorage`，key 为 `history-memorization:data`，value 是 JSON 字符串，结构如下：

```json
{
  "version": 1,
  "timelines": [],
  "events": [],
  "people": [],
  "cards": [],
  "studyRecords": []
}
```

各字段类型定义见 [src/domain/historyTypes.ts](src/domain/historyTypes.ts)。`version` 是数据版本号，用于未来 schema 迁移。导出的 JSON 文件与本地存储结构一致，不包含运行时字段（如 `lastError`）。

## 设计文档

- [设计规格](docs/superpowers/specs/2026-06-21-history-memorization-design.md)
- [实现计划](docs/superpowers/plans/2026-06-21-history-memorization.md)
- [抽卡范围设计](docs/superpowers/plans/2026-06-25-flashcard-draw-range.md)

## License

MIT，详见 [LICENSE](LICENSE)。

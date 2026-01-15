# UI 组件 (Components)

React 19 + Tailwind CSS 4 + Framer Motion 组件库。

## 结构

```
components/
├── MainPage.tsx            # 主入口页面 [944行]
├── LoginPage.tsx           # 登录页面 [992行]
├── FloatingWindow.tsx      # AI 悬浮窗
├── PreparationDetailModal.tsx  # 准备详情 [649行]
├── ui/                     # 基础 UI 原子组件 (21 文件)
├── admin/                  # 管理面板模块 (8 文件)
├── user-profile/           # 用户中心 (见子目录 AGENTS.md)
├── collaboration/          # 协作相关 (见子目录 AGENTS.md)
├── onboarding/             # 引导流程
└── __tests__/              # 组件测试
```

## 快速定位

| 任务          | 文件                 |
| ------------- | -------------------- |
| 管理面板      | `admin/`             |
| 主题切换      | `MainPage.tsx`       |
| AI 回复渲染   | `FloatingWindow.tsx` |
| 基础按钮/卡片 | `ui/`                |
| 用户设置      | `user-profile/`      |
| 实时协作      | `collaboration/`     |

## 模式

- **领域驱动**: 复杂组件有自己的 `hooks/` 子目录
- **IPC 调用**: 通过 `lib/api-client.ts`
- **动效**: 使用 Framer Motion `motion.*` 组件
- **样式**: HSL 变量支持明暗主题切换

## 反模式

| 禁止                             | 原因                                                      |
| -------------------------------- | --------------------------------------------------------- |
| `dangerouslySetInnerHTML` 无过滤 | 必须使用 DOMPurify.sanitize() (FloatingWindow.tsx 已修复) |
| 组件内直接 `ipcRenderer`         | 使用 `lib/api-client.ts`                                  |
| 超过 15 个 useState              | 拆分为 Hook                                               |

## 技术债务

| 文件                         | 问题   | 状态   |
| ---------------------------- | ------ | ------ |
| `PreparationDetailModal.tsx` | 649 行 | 待拆分 |
| `admin/LoginTab.tsx`         | 585 行 | 待拆分 |

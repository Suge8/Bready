# UI 组件 (Components)

React 19 + Tailwind CSS 4 + Framer Motion 组件库。

## 结构

```
components/
├── CollaborationMode.tsx   # 核心协作页面 (God Component)
├── MainPage.tsx            # 主入口页面
├── FloatingWindow.tsx      # AI 悬浮窗
├── ui/                     # 基础 UI 原子组件
├── user-profile/           # 用户中心 (含局部 hooks/)
└── collaboration/          # 协作相关子组件
```

## 快速定位

| 任务          | 文件                    |
| ------------- | ----------------------- |
| 实时协作      | `CollaborationMode.tsx` |
| 主题切换      | `MainPage.tsx`          |
| AI 回复渲染   | `FloatingWindow.tsx`    |
| 基础按钮/卡片 | `ui/`                   |
| 用户设置      | `user-profile/`         |

## 模式

- **领域驱动**: 复杂组件有自己的 `hooks/` 子目录
- **IPC 调用**: 通过 `lib/api-client.ts`
- **动效**: 使用 Framer Motion `motion.*` 组件

## 反模式

| 禁止                             | 原因                     |
| -------------------------------- | ------------------------ |
| `dangerouslySetInnerHTML` 无过滤 | XSS 风险                 |
| 组件内直接 `ipcRenderer`         | 使用 `lib/api-client.ts` |
| 超过 15 个 useState              | 拆分为 Hook              |

## 技术债务

- `CollaborationMode.tsx`: 1351 行，25+ useState，需拆分

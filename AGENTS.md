# BREADY 项目知识库

**Generated:** 2026-01-15
**Commit:** b429eea
**Branch:** main

## 概述

面宝 (Bready) - **混合桌面-服务器系统**。Electron + React 19 + TypeScript，集成 Google Gemini 和字节豆包双 AI 引擎，支持实时音频捕获与语音转写。

**架构特点**: 非标准 Electron 应用，内置 Express 服务器处理 PostgreSQL 和音频代理，主进程专注窗口管理和原生 macOS 音频捕获。

## 项目结构

```
bready/
├── src/
│   ├── main/           # Electron 主进程 (见子目录 AGENTS.md)
│   ├── renderer/src/   # React 前端
│   ├── preload/        # IPC 桥接层
│   ├── server/         # Express 后端 (见子目录 AGENTS.md)
│   └── shared/         # 跨进程类型定义
├── scripts/            # 构建/数据库/音频工具脚本
├── assets/             # 原生音频工具 (SystemAudioDump)
├── database/           # PostgreSQL 初始化 SQL
└── payment-callback-server/  # 独立支付回调服务
```

## 快速定位

| 任务        | 位置                                              | 备注                |
| ----------- | ------------------------------------------------- | ------------------- |
| AI 服务逻辑 | `src/main/doubao-service.ts`, `gemini-service.ts` | WebSocket 流式处理  |
| 音频捕获    | `src/renderer/src/lib/audio-capture.ts`           | 多策略降级          |
| IPC 处理    | `src/main/ipc-handlers/`                          | 分模块处理器        |
| 类型契约    | `src/shared/ipc.ts`                               | main/renderer 共享  |
| UI 组件     | `src/renderer/src/components/`                    | 见子目录 AGENTS.md  |
| 安全机制    | `src/main/security/`                              | IPC 签名验证        |
| 后端 API    | `src/server/`                                     | Express + WebSocket |
| 用户中心    | `src/renderer/src/components/user-profile/`       | 见子目录 AGENTS.md  |
| 协作模块    | `src/renderer/src/components/collaboration/`      | 见子目录 AGENTS.md  |

## 入口点

| 文件                        | 用途                              |
| --------------------------- | --------------------------------- |
| `src/main/index.ts`         | 主进程入口，窗口/AI/DB 初始化     |
| `src/renderer/src/main.tsx` | React 入口                        |
| `src/preload/index.ts`      | 暴露 `window.bready` API          |
| `src/server/index.ts`       | Express 后端 (WebSocket 音频代理) |

## 代码规范

### 格式 (Prettier)

- 无分号，单引号，末尾逗号，行宽 100

### TypeScript

- `strict: true`，允许 `any` (ESLint 关闭)
- 路径别名: `@/*` → `src/renderer/src/*`

### 模式

- 主进程服务继承 `EventEmitter`，单例模式
- IPC 频道命名: `namespace:action` (如 `auth:sign-in`)
- 调试开关: `.env.local` 中 `DEBUG_*` 变量
- 清理机制: 使用 `registerCleanup()` 注册退出回调

## 反模式 (禁止)

| 禁止                             | 原因                                                      |
| -------------------------------- | --------------------------------------------------------- |
| `dangerouslySetInnerHTML` 无过滤 | 必须使用 DOMPurify.sanitize() (FloatingWindow.tsx 已修复) |
| 主进程直接 `console.log`         | 使用 `utils/logging.ts`                                   |
| IPC 参数无类型                   | 必须在 `shared/ipc.ts` 定义                               |
| 绕过 IPC sender 校验封装         | 安全风险                                                  |
| 路由内直接 SQL                   | 使用 `services/database.ts`                               |
| 组件内直接 `ipcRenderer`         | 使用 `lib/api-client.ts`                                  |
| 超过 15 个 useState              | 拆分为 Hook                                               |

## 大文件警告 (>500 行)

| 文件                         | 行数 | 说明           |
| ---------------------------- | ---- | -------------- |
| `i18n/translations.ts`       | 3689 | 多语言翻译     |
| `gemini-service.ts`          | 1141 | Gemini AI 服务 |
| `doubao-service.ts`          | 1108 | 豆包 AI 服务   |
| `lib/audio-capture.ts`       | 1105 | 音频捕获       |
| `lib/api-client.ts`          | 1051 | IPC 客户端     |
| `LoginPage.tsx`              | 1032 | 登录页面       |
| `MainPage.tsx`               | 950  | 主页面         |
| `PreparationDetailModal.tsx` | 649  | 准备详情       |
| `audio-manager.ts`           | 608  | 音频管理       |
| `ipc-handlers.ts`            | 603  | IPC 处理       |
| `admin/LoginTab.tsx`         | 585  | 管理登录       |
| `SecuritySettings.tsx`       | 580  | 安全设置       |
| `UserProfileModal.tsx`       | 574  | 用户模态框     |
| `routes/auth.ts`             | 527  | 认证路由       |

## 测试

- **框架**: Vitest + JSDOM
- **目录**: 同级 `__tests__/` 目录，`.spec.ts` 后缀
- **覆盖率**: 全局 85%，`src/main/services/` 95%
- **命令**: `npm run test:unit`

## 命令

```bash
npm run dev          # 开发模式 (含 GC 暴露)
npm run dev:full     # 同时启动后端服务器
npm run type-check   # 类型检查
npm run test:unit    # Vitest 单元测试
npm run audio:test   # 验证音频工具权限
npm run db:setup     # 初始化 PostgreSQL
```

## 注意事项

- macOS 音频捕获需授权 `SystemAudioDump` (录屏权限)
- 首次运行需配置 `.env` (API Keys)
- 原生工具需 Swift 5.0+ 编译
- `payment-callback-server/` 是独立项目，需单独部署
- CI 未运行 build 命令，本地需验证构建

# BREADY 项目知识库

**Generated:** 2026-01-11
**Commit:** 48c36f2
**Branch:** main

## 概述

面宝 (Bready) - Electron + React 19 + TypeScript 的 AI 面试协作助手。集成 Google Gemini 和字节豆包双 AI 引擎，支持实时音频捕获与语音转写。

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
| IPC 处理    | `src/main/ipc-handlers.ts`                        | 业务逻辑中枢        |
| 类型契约    | `src/shared/ipc.ts`                               | main/renderer 共享  |
| UI 组件     | `src/renderer/src/components/`                    | 见子目录 AGENTS.md  |
| 安全机制    | `src/main/security/`                              | IPC 签名验证        |
| 后端 API    | `src/server/`                                     | Express + WebSocket |

## 入口点

| 文件                        | 用途                              |
| --------------------------- | --------------------------------- |
| `src/main/index.ts`         | 主进程入口，窗口/AI/DB 初始化     |
| `src/renderer/src/main.tsx` | React 入口                        |
| `src/preload/index.ts`      | 暴露 `window.bready` API          |
| `src/server/index.ts`       | Express 后端 (WebSocket 音频代理) |
| `src/api-server.ts`         | 辅助 API 服务器 (端口 3001)       |

## 代码规范

### 格式 (Prettier)

- 无分号，单引号，末尾逗号，行宽 100

### TypeScript

- `strict: true`，允许 `any` (ESLint 关闭)
- 路径别名: `@/*` → `src/renderer/src/*`

### 模式

- 主进程服务继承 `EventEmitter`
- IPC 频道命名: `namespace:action` (如 `auth:sign-in`)
- 调试开关: `.env.local` 中 `DEBUG_*` 变量

## 反模式 (禁止)

| 禁止                             | 原因                                 |
| -------------------------------- | ------------------------------------ |
| `dangerouslySetInnerHTML` 无过滤 | XSS 风险 (FloatingWindow.tsx 已存在) |
| 渲染进程直接 `console.log`       | 使用调试开关控制                     |
| IPC 参数无类型                   | 必须在 `shared/ipc.ts` 定义          |
| `--disable-web-security`         | 生产环境禁用                         |

## 技术债务

| 文件                    | 问题                      | 优先级 |
| ----------------------- | ------------------------- | ------ |
| `CollaborationMode.tsx` | 1351 行，25+ useState     | 高     |
| `supabase.ts`           | 命名误导，实为 IPC 客户端 | 中     |
| `preload/index.ts`      | 大量 `: any` 类型         | 中     |
| `ipc-handlers.ts`       | 重构过渡态                | 低     |

## 测试

- **框架**: Vitest + JSDOM
- **目录**: 同级 `__tests__/` 目录
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

与 ui 相关的都使用前端工作师agent，且使用 frontend-design skills，保持我们的 vercel 黑白风格，所有能按的都支持hover动画和pointer，减少使用影响性能导致动画一卡一卡的blur，动效丰富丝滑，视觉冲击力强，tab 切换或模态框变换时都有滑动或切换的丝滑动效。
编写完ui 确定好我们的页面有没有缺失翻译键，都把他们补齐
# 主进程 (Main Process)

Electron 主进程，承载所有业务核心逻辑。

## 结构

```
main/
├── index.ts              # 入口，启动优化/窗口/AI/DB 初始化
├── doubao-service.ts     # 字节豆包 AI (ASR + Chat)
├── gemini-service.ts     # Google Gemini 服务
├── ipc-handlers.ts       # IPC 处理中枢 (导出索引)
├── ipc-handlers/         # 分模块 IPC 处理器
├── security/             # IPC 签名验证、加密
├── performance/          # 启动优化、内存监控
├── audio/                # 原生音频管理
├── services/             # 支付、设置等业务服务
└── utils/                # 日志、错误处理、清理
```

## 快速定位

| 任务          | 文件                                     |
| ------------- | ---------------------------------------- |
| AI 流式响应   | `doubao-service.ts`, `gemini-service.ts` |
| 新增 IPC 频道 | `ipc-handlers/` 对应模块                 |
| 安全校验      | `security/IPCSecurityManager.ts`         |
| 性能指标      | `performance/PerformanceMonitor.ts`      |
| 全局错误      | `utils/error-handler.ts`                 |
| 支付集成      | `services/payment/`                      |

## 模式

- **服务类**: 继承 `EventEmitter`，单例模式
- **IPC 命名**: `namespace:action` (如 `auth:sign-in`)
- **清理机制**: 使用 `registerCleanup()` 注册退出回调
- **日志**: 使用 `utils/logging.ts` 的 `createLogger`

## 反模式

| 禁止                      | 原因                        |
| ------------------------- | --------------------------- |
| 直接 `console.log`        | 使用 `utils/logging.ts`     |
| IPC 无类型参数            | 必须在 `shared/ipc.ts` 定义 |
| 绕过 `IPCSecurityManager` | 安全风险                    |

## 技术债务

- `doubao-service.ts`: 6 个未使用变量 (已标记)
- `ipc-handlers.ts` + `ipc-handlers/`: 重构过渡态
- `audio-manager.ts`: 3 个未使用变量

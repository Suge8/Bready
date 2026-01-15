# 后端服务 (Server)

Express 5 + WebSocket 后端，提供 REST API 和音频代理。

## 结构

```
server/
├── index.ts          # 入口，Express + WS 初始化
├── app.ts            # Express 应用配置
├── routes/           # REST API 路由 (9 文件)
├── middleware/       # 认证中间件
├── services/         # 业务服务 (数据库)
└── websocket/        # 音频代理 WebSocket
```

## 快速定位

| 任务       | 文件                       |
| ---------- | -------------------------- |
| 新增 API   | `routes/` 对应模块         |
| 认证逻辑   | `middleware/auth.ts`       |
| 数据库操作 | `services/database.ts`     |
| 音频流代理 | `websocket/audio-proxy.ts` |

## 模式

- **路由分离**: 按领域拆分 (auth, user, payment, ai, settings)
- **JWT 认证**: 使用 `middleware/auth.ts`
- **启动**: `npm run dev:server` 或 `npm run dev:full`

## 反模式

| 禁止           | 原因                        |
| -------------- | --------------------------- |
| 路由内直接 SQL | 使用 `services/database.ts` |
| 跳过认证中间件 | 安全风险                    |

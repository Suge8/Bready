# 协作模块 (Collaboration)

实时面试协作核心组件，音频/文本双通道交互。

## 结构

```
collaboration/
├── CollaborationMain.tsx     # 主协作区域
├── CollaborationSidebar.tsx  # 侧边栏
├── CollaborationHeader.tsx   # 头部控制
├── CollaborationInput.tsx    # 输入区域
├── StreamingText.tsx         # 流式文本渲染
├── StreamingMarkdown.tsx     # 流式 Markdown
├── StatusIndicator.tsx       # 状态指示器
├── InitializingOverlay.tsx   # 初始化遮罩
├── ExitConfirmModal.tsx      # 退出确认
├── MicrophoneSelector.tsx    # 麦克风选择
├── BreadyLogo.tsx            # Logo 组件
├── hooks/                    # 状态管理
│   ├── useCollaborationState.ts  # 协作状态
│   ├── useCollaborationEvents.ts # 事件处理
│   ├── useConversation.ts        # 对话管理
│   └── useAudioMode.ts           # 音频模式
└── index.ts                  # 导出
```

## 快速定位

| 任务     | 文件                                         |
| -------- | -------------------------------------------- |
| 协作主体 | `CollaborationMain.tsx`                      |
| 流式渲染 | `StreamingText.tsx`, `StreamingMarkdown.tsx` |
| 音频控制 | `MicrophoneSelector.tsx`                     |
| 状态管理 | `hooks/useCollaborationState.ts`             |
| 事件处理 | `hooks/useCollaborationEvents.ts`            |

## 模式

- **Hook 分离**: 状态/事件/音频逻辑分离到 `hooks/`
- **流式渲染**: 支持 AI 响应的实时流式显示
- **双通道**: 同时支持语音和文本输入

## 注意事项

- 音频模式依赖 `lib/audio-capture.ts` 的多策略降级
- 流式组件需处理中断和重连场景

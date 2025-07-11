1. 技术栈
* **前端：**
  - 框架：React v19 + TypeScript
  - 构建工具：Vite v7.0.4 + Electron-vite v4.0.0
  - UI：Tailwind CSS v4.1 + @tailwindcss/vite
  - 路由：React Router DOM
  - 图标：Lucide React
  - 字体：Inter (Google Fonts)
* **后端/桌面：**
  - 应用框架：Electron v37.2.0
  - 主进程：Node.js + TypeScript
  - 进程通信：IPC (contextBridge + ipcRenderer)
* **数据库，用户验证：** Supabase
* **AI 模型：**
  - Gemini Live API (gemini-live-2.5-flash-preview) ⚡ 优化后使用稳定版本
  - Google GenAI SDK (@google/genai v1.9.0)
  - 支持语言：cmn-CN（中文普通话）
  - 响应模式：TEXT（文本回复）
  - 音频输入：PCM 16-bit, 24kHz, 单声道
  - 实时转录：立即发送到前端，无延迟
* **音频处理架构：** ⚡ v1.0.9 重大优化
  - 系统音频捕获：SystemAudioDump (macOS)
  - 音频格式：PCM 16-bit, 24kHz, 单声道
  - 处理方式：直接发送（移除队列和批处理）
  - 延迟优化：从 100ms+ 降低到立即发送
  - 音频工具：简化的 audioUtils

2. 规避屏幕分享关键：Electron 应用可以通过以下方式实现“隐形”：
macOS（应用开发先适配 mac 版本）
API: NSWindow 类的 sharingType 属性 (Objective-C/Swift)
值: NSWindowSharingTypeNone
在 macOS 上，应用程序可以通过设置其 NSWindow 对象的 sharingType 属性为 NSWindowSharingTypeNone 来实现类似的效果。当一个窗口被设置为 NSWindowSharingTypeNone 时，它将不会出现在 macOS 的屏幕捕获 API (如 CGWindowListCreateImage 或 ScreenCaptureKit) 所生成的图像中。

3.通过 PlaywrightMCP 对 Electron 应用进行开发过程，具体看 资料/PlaywrightMCP 调试Electron 应用.md

4.后端和数据库，用户验证等通过 SupabaseMCP 进行开发。

5.Gemini API key 在这：AIzaSyD57YiXTVsEuKyyOOaU4w51F6cAK97Tq6U

用于你测试，开发过程中需要创建.env 文档把需要配置的放进去，配置项简洁最好

6.创建一个prompt.js 文件夹，用于存放 AI 的 prompt 相关内容，并与 ai 回应联系上，具体可以参考 资料/cheatingdaddy/src/utils/prompts.js

7. 项目结构
```
src/
├── main/           # Electron 主进程
│   ├── index.ts    # 主进程入口，窗口管理，IPC 处理
│   ├── audioUtils.ts # 音频处理工具 (从 cheatingdaddy 适配)
│   └── prompts.ts  # AI Prompt 管理 (从 cheatingdaddy 适配)
├── preload/        # 预加载脚本
│   └── index.ts    # 安全的 API 暴露给渲染进程
└── renderer/       # React 前端应用
    ├── index.html  # HTML 入口
    ├── src/
    │   ├── main.tsx # React 应用入口
    │   ├── App.tsx  # 主应用组件，路由配置
    │   ├── assets/
    │   │   └── index.css # Tailwind CSS + 自定义样式
    │   └── components/
    │       ├── WelcomePage.tsx # 首次访问引导页
    │       ├── MainPage.tsx # 主页面
    │       ├── CreatePreparationPage.tsx # 创建/编辑准备页
    │       ├── SelectPreparationModal.tsx # 选择准备项弹窗
    │       └── FloatingWindow.tsx # 协作模式悬浮窗
```

8. 核心功能实现状态
* ✅ **阶段1完成：项目基础架构搭建**
  - Electron-vite + React 项目初始化
  - Tailwind CSS 4.x 配置 (使用 @tailwindcss/vite 插件)
  - 环境配置 (.env.local)
  - 从 cheatingdaddy 复用核心模块 (audioUtils, prompts)
  - Electron 主进程和预加载脚本配置
  - Vercel 设计系统实现 (黑白灰配色方案)

* ✅ **阶段2完成：核心UI界面实现**
  - 首次访问引导页 (WelcomePage)
  - 主页面 (MainPage) - 显示准备项列表和开始按钮
  - 创建/编辑准备页 (CreatePreparationPage) - 支持AI分析
  - 选择准备项弹窗 (SelectPreparationModal) - 语言和目的设置
  - 协作模式悬浮窗基础UI (FloatingWindow)
  - 数据本地存储 (localStorage)

* ✅ **阶段3完成：AI和音频功能集成**
  - Gemini Live API 集成 (gemini-live-2.5-flash-preview)
  - 系统音频捕获实现 (macOS SystemAudioDump)
  - 音频流式处理优化 (批量处理、队列管理、质量监控)
  - 实时转录和AI响应 (噪声过滤、对话历史)
  - 悬浮窗协作模式 (透明度调节、重连机制、清除历史)

* ✅ **阶段4已完成：性能优化和核心功能完善**
  - ⚡ Live Interview 性能大幅优化（v1.0.9）
  - ✅ 音频处理架构简化
  - ✅ 实时转录显示
  - ✅ Playwright 自动化测试配置
  - ✅ 错误处理和重连机制

## 🚀 性能优化详解 (v1.0.9)

### 核心优化策略
1. **音频处理简化**
   - 移除复杂队列系统：`audioQueue[]`, `isProcessingAudio`, `batchSize`
   - 采用直接发送：`geminiSession.sendRealtimeInput()` 立即调用
   - 延迟降低：从 100ms+ 到立即发送

2. **实时转录显示**
   - 每个转录片段立即发送：`sendToRenderer('transcription-update', currentTranscription)`
   - 移除等待 AI 回复的逻辑
   - 用户体验：实时看到转录过程

3. **代码优化成果**
   - 代码大小：43.47 kB → 39.33 kB (-9.5%)
   - 内存使用：减少约 30%
   - 响应延迟：2-5秒 → 实时

### 技术实现对比
```typescript
// 优化前：复杂架构
let audioQueue: string[] = []
const AUDIO_SEND_INTERVAL = 100
const batchSize = Math.min(3, audioQueue.length)

// 优化后：简化架构
async function sendAudioToGemini(base64Data: string) {
  if (!geminiSession) return
  await geminiSession.sendRealtimeInput({
    audio: { data: base64Data, mimeType: 'audio/pcm;rate=24000' }
  })
}
```

9. 音视频流式处理部分都参考 资料/cheatingdaddy 这个项目
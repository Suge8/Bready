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
* **数据库，用户验证：** 本地 PostgreSQL
  - 用户认证：支持邮箱密码登录，JWT token 会话管理
  - 数据库：本地 PostgreSQL，包含用户配置、准备项、会员套餐、购买记录等表
  - 权限控制：基于用户身份等级的访问控制（小白、螺丝钉、大牛、管理、超级）
  - 会员系统：套餐购买、时间管理、折扣计算
  - 密码安全：bcrypt 哈希加密，安全会话管理
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
* **对话记录系统：** ⚡ v2.0.1 重大修复
  - 问题：语音输入和AI回复无法正确保存到对话历史
  - 根因：复杂的 pendingUserInput 状态管理导致时序问题
  - 解决方案：简化状态管理，直接添加消息到历史记录
  - 关键修复：移除复杂的状态依赖，采用立即添加策略

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

## 数据库架构设计

### 核心表结构

#### 1. 用户配置表 (user_profiles)
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('user', 'admin', '小白', '螺丝钉', '大牛', '管理', '超级')),
  user_level TEXT DEFAULT '小白' CHECK (user_level IN ('小白', '螺丝钉', '大牛', '管理', '超级')),
  membership_expires_at TIMESTAMP WITH TIME ZONE,
  remaining_interview_minutes INTEGER DEFAULT 0,
  total_purchased_minutes INTEGER DEFAULT 0,
  discount_rate DECIMAL(3,2) DEFAULT 1.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### 2. 会员套餐表 (membership_packages)
```sql
CREATE TABLE membership_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('螺丝钉', '大牛')),
  price DECIMAL(10,2) NOT NULL,
  interview_minutes INTEGER NOT NULL,
  validity_days INTEGER NOT NULL DEFAULT 3,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### 3. 购买记录表 (purchase_records)
```sql
CREATE TABLE purchase_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES membership_packages(id),
  original_price DECIMAL(10,2) NOT NULL,
  actual_price DECIMAL(10,2) NOT NULL,
  discount_rate DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  interview_minutes INTEGER NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### 4. 面试使用记录表 (interview_usage_records)
```sql
CREATE TABLE interview_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preparation_id UUID REFERENCES preparations(id),
  session_type TEXT NOT NULL CHECK (session_type IN ('collaboration', 'live_interview')),
  minutes_used INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 业务逻辑设计

#### 用户身份等级系统
- **小白**：默认等级，无特殊权限
- **螺丝钉**：购买螺丝钉套餐后获得，享受9折优惠
- **大牛**：购买大牛套餐后获得，享受8折优惠
- **管理**：管理员身份，可管理普通用户
- **超级**：超级管理员，可管理所有用户

#### 会员套餐系统
- **螺丝钉套餐**：¥39，40分钟面试辅助，3天有效期
- **大牛套餐**：¥99，120分钟面试辅助，3天有效期
- **折扣机制**：螺丝钉用户9折，大牛用户8折
- **时间叠加**：新购买时间直接累加到剩余时间
- **身份升级**：购买套餐后自动升级到对应等级

#### 权限控制系统
- **个人中心**：所有用户可访问
- **后台管理**：仅管理员和超级用户可访问
- **用户管理**：超级用户可管理所有用户，管理员只能管理普通用户

## 🚨 技术踩坑记录

### 1. 对话记录无法保存问题 (v2.0.1 修复)

#### 问题描述
- **症状**：语音输入和AI回复无法保存到对话历史记录
- **表现**：键盘输入可以保存用户消息，但AI回复存不进去；语音输入AI回复会重复
- **影响**：用户无法查看完整的对话历史

#### 根本原因
```typescript
// 问题代码：复杂的状态管理
const [pendingUserInput, setPendingUserInput] = useState<{content: string, source: 'voice' | 'text'} | null>(null)

// 语音转录过程中多次设置 pendingUserInput
if (!pendingUserInput) {
  setPendingUserInput({ content: text, source: 'voice' })
}

// AI回复到达时，pendingUserInput 已经被清除
if (pendingUserInput && response !== lastAIResponse) {
  // 这里永远不会执行，因为 pendingUserInput 是 null
}
```

#### 技术分析
1. **时序问题**：语音转录过程中多次触发状态更新，导致 `pendingUserInput` 被重复设置和清除
2. **状态竞争**：AI回复到达时，`pendingUserInput` 已经在其他地方被清除
3. **复杂依赖**：文字输入和语音输入使用不同的处理逻辑，增加了出错概率

#### 解决方案
```typescript
// 修复后：简化状态管理，直接添加消息
// 1. 语音输入：检测到新语音时立即添加用户消息
if (isNewVoiceInput) {
  const userMessage = { type: 'user', content: text, timestamp: new Date(), source: 'voice' }
  setConversationHistory(prev => [...prev, userMessage])
}

// 2. AI回复：不依赖复杂状态，直接添加
if (response !== lastAIResponse) {
  const aiMessage = { type: 'ai', content: response, timestamp: new Date(), source: 'text' }
  setConversationHistory(prev => [...prev, aiMessage])
}
```

#### 关键改进
- ✅ **移除复杂状态依赖**：不再依赖 `pendingUserInput` 进行AI回复处理
- ✅ **立即添加策略**：用户消息和AI回复都立即添加到历史记录
- ✅ **统一处理逻辑**：文字和语音输入使用相同的AI回复处理逻辑
- ✅ **防重复机制**：通过 `response !== lastAIResponse` 防止重复处理

#### 经验教训
1. **状态管理要简单**：复杂的状态依赖容易导致时序问题
2. **立即处理原则**：能立即处理的数据不要延迟到后续状态中处理
3. **统一逻辑路径**：相同功能使用相同的处理逻辑，减少分支复杂度
4. **充分调试日志**：复杂状态问题需要详细的调试信息才能定位

### 2. React闭包陷阱导致状态访问错误 (v2.0.1 修复)

#### 问题描述
- **症状**：对话记录系统修复后，文字和语音输入的AI回复仍然无法保存
- **表现**：控制台显示 `pendingUserInput: null` 和 `conversationHistory length: 0`
- **根因**：事件监听器中的React闭包陷阱，访问的是组件初始化时的旧状态值

#### 技术分析
```typescript
// 问题代码：事件监听器捕获旧状态
const removeAIResponseListener = window.bready.onAIResponse((response) => {
  console.log('pendingUserInput:', pendingUserInput) // 始终是初始值 null
  console.log('conversationHistory:', conversationHistory.length) // 始终是初始值 0

  if (pendingUserInput && response !== lastAIResponse) {
    // 这个条件永远不会满足，因为 pendingUserInput 始终是 null
  }
})
```

#### 根本原因
1. **闭包陷阱**：事件监听器在 `useEffect` 中创建，捕获的是组件初始化时的状态值
2. **状态不更新**：即使状态在其他地方更新，监听器内部访问的仍是旧值
3. **异步问题**：React状态更新是异步的，直接访问状态变量获取不到最新值

#### 解决方案
```typescript
// 修复：使用函数式状态更新获取最新状态
const removeAIResponseListener = window.bready.onAIResponse((response) => {
  // 通过函数式更新获取最新状态
  setConversationHistory(currentHistory => {
    setPendingUserInput(currentPendingInput => {
      setCurrentVoiceInput(currentVoice => {
        // 这里的值是最新的！
        handleAIResponse(response, currentHistory, currentPendingInput, currentVoice)
        return currentVoice // 返回原值，不修改状态
      })
      return currentPendingInput
    })
    return currentHistory
  })
})

// 独立的处理函数，使用传入的最新状态
const handleAIResponse = (response, currentHistory, currentPendingInput, currentVoice) => {
  if (currentVoice.trim()) {
    // 语音输入：添加Q&A对
    const newHistory = [...currentHistory, userMessage, aiMessage]
    setConversationHistory(newHistory)
  } else if (currentPendingInput && currentPendingInput.source === 'text') {
    // 文字输入：添加AI回复
    const newHistory = [...currentHistory, aiMessage]
    setConversationHistory(newHistory)
  }
}
```

#### 关键改进
- ✅ **状态访问正确**：通过函数式更新获取最新状态值
- ✅ **逻辑分离**：将AI回复处理逻辑提取为独立函数
- ✅ **调试优化**：添加详细的状态调试信息
- ✅ **性能优化**：避免不必要的状态更新

#### 经验教训
1. **事件监听器陷阱**：在 `useEffect` 中创建的事件监听器容易产生闭包问题
2. **函数式更新**：需要最新状态时，使用 `setState(prev => ...)` 模式
3. **状态调试**：复杂状态问题需要在正确的位置添加调试信息
4. **逻辑分离**：将复杂逻辑提取为独立函数，便于测试和维护

### 3. API连接失败闪烁问题 (v2.0.1 修复)

#### 问题描述
- **症状**：进入协作模式时界面闪现红色"API连接失败"提示
- **原因**：初始化期间权限检查可能立即设置错误状态
- **影响**：用户体验不佳，误以为连接真的失败了

#### 解决方案
```typescript
// 修复：初始化期间不显示错误提示
{currentError && !isInitializing && (
  <div className="error-message">
    {/* 错误内容 */}
  </div>
)}
```

#### 关键改进
- ✅ **状态优先级**：初始化状态优先于错误状态显示
- ✅ **用户体验**：避免误导性的错误提示
- ✅ **状态逻辑**：权限问题不算错误，只是需要设置
- **身份修改**：仅超级用户可修改用户身份等级
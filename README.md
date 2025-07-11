# 面宝 (Bready) 🍞

<div align="center">

![Bready Logo](https://img.shields.io/badge/Bready-v1.0.9-blue?style=for-the-badge&logo=electron)
![Platform](https://img.shields.io/badge/Platform-macOS-lightgrey?style=for-the-badge&logo=apple)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![AI](https://img.shields.io/badge/AI-Gemini%20Live-orange?style=for-the-badge&logo=google)

**🤖 AI-Powered Interview Assistant - Your Confident Interview Companion**

*智能面试助手 - 让每次面试都充满自信*

[English](#english) • [中文](#中文) • [Features](#-features) • [Quick Start](#-quick-start) • [Demo](#-demo)

</div>

---

## English

**Bready** is an AI-powered interview assistant built with Electron and Google Gemini Live API. It provides real-time interview coaching, live transcription, and intelligent response suggestions to help you ace your interviews with confidence.

### 🌟 Key Features

- ⚡ **Ultra-Low Latency** - Real-time AI responses with optimized performance
- 🎤 **Live Voice Interaction** - System audio capture with Gemini Live API
- 📝 **Real-time Transcription** - Instant audio-to-text conversion
- 🤖 **AI Interview Coach** - Smart response suggestions and tips
- 👻 **Stealth Mode** - Discreet floating window for interviews
- 🎨 **Modern UI** - Clean design with Vercel design system

### 🚀 Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Electron + Node.js
- **AI**: Google Gemini Live API
- **Audio**: System Audio Capture (macOS)
- **Testing**: Playwright

---

## 中文

**面宝** 是一款基于 Electron 和 Google Gemini Live API 的智能面试助手。提供实时面试指导、语音转录和智能回答建议，帮助您自信地应对每一次面试。

### 🌟 核心特性

- ⚡ **超低延迟交互** - v1.0.9 重大性能优化，实时响应无等待
- 🎤 **实时语音协作** - 基于 Gemini Live API 的实时语音交互
- 📝 **实时转录显示** - 音频转录立即显示，无需等待 AI 回复
- 🎯 **智能面试准备** - 个性化的面试准备项管理
- 👻 **隐形悬浮窗** - 反检测的协作模式界面
- 🔊 **系统音频输入** - 支持 macOS 系统音频捕获
- 🤖 **AI 提词器** - 提供直接可说的回答建议
- 🎨 **现代化设计** - 采用 Vercel 设计系统的简洁界面

### 🛠 技术栈

- **前端**: React + TypeScript + Vite + Tailwind CSS
- **后端**: Electron + Node.js
- **AI**: Google Gemini Live API
- **音频**: 系统音频捕获 (macOS)
- **测试**: Playwright 自动化测试

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **macOS** (for system audio capture)
- **Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Suge8/Bready.git
cd Bready
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp .env.example .env.local
```

4. **Add your Gemini API key to `.env.local`**
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

5. **Start development**
```bash
npm run dev
```

### 🔧 Build for Production

```bash
npm run build
npm run build:mac  # Build macOS app
```

### 🔐 macOS Permissions

On first run, grant these permissions:
- **Microphone** - For audio input
- **Accessibility** - For system audio capture
- **Screen Recording** - For system audio capture

The app will guide you through the permission setup process.

## 📱 Features Overview

### 🎯 Interview Preparation
- Create and manage interview preparation items
- Support for job descriptions (JD) and resume upload
- AI-powered matching analysis

### 🤝 Live Collaboration Mode
- Select preparation items and interview language
- Launch stealth floating window
- Real-time voice interaction with AI responses

### 📝 Real-time Transcription
- System audio capture in real-time
- Noise filtering and text cleaning
- Conversation history tracking

### 🤖 AI Assistant
- Powered by Gemini Live API
- Multi-scenario prompt support (Interview/Sales/Meeting)
- Auto-reconnection and error recovery

## 🎬 Demo

> **Note**: Demo screenshots and videos will be added soon.

### Live Interview Mode
- Real-time audio transcription
- Instant AI response suggestions
- Stealth mode for discreet assistance

### Performance Optimization (v1.0.9)
- **Response Time**: 2-5s → Real-time
- **Audio Latency**: 100ms+ → Immediate
- **Code Size**: -9.5% reduction
- **Memory Usage**: -30% optimization

## 🛠 Architecture

### Frontend Stack
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite + Electron-vite
- **Styling**: Tailwind CSS 4.x
- **Icons**: Lucide React
- **Routing**: React Router DOM

### Backend Stack
- **Desktop Framework**: Electron
- **AI Service**: Google Gemini Live API
- **Audio Processing**: SystemAudioDump (macOS)
- **Data Storage**: localStorage + Supabase (optional)

### Core Modules
- `audioUtils.ts` - Audio processing utilities
- `prompts.ts` - AI prompt management
- `FloatingWindow.tsx` - Collaboration mode interface
- `MainPage.tsx` - Main application interface

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use Tailwind CSS for styling
- Write meaningful commit messages

## 🧪 Testing

```bash
npm run test              # Run all tests
npm run test:electron     # Run Electron-specific tests
```

## 📋 Roadmap

- [x] **Phase 1**: Project foundation and architecture
- [x] **Phase 2**: Core UI implementation
- [x] **Phase 3**: AI and audio integration
- [x] **Phase 4**: Performance optimization (v1.0.9)
- [ ] **Phase 5**: Cross-platform support
- [ ] **Phase 6**: Advanced features and analytics

See [CHANGELOG.md](./CHANGELOG.md) for detailed progress.

## � Project Structure

```
src/
├── main/           # Electron main process
├── preload/        # Preload scripts
└── renderer/       # React frontend app
    ├── components/ # UI components
    ├── assets/     # Static assets
    └── main.tsx    # App entry point
```

## 🐛 Troubleshooting

### Common Issues

1. **Permission Denied**: Grant microphone and accessibility permissions
2. **Audio Not Working**: Check system audio settings
3. **API Errors**: Verify Gemini API key is valid

### Debug Mode

Development mode saves debug audio files to `~/bready/debug/`:
- Raw PCM audio files
- Converted WAV files
- Audio analysis metadata

## ⚡ 性能优化 (v1.0.9)

### 重大性能提升
- **响应延迟**：从 2-5秒 降低到 实时响应
- **音频发送**：从 100ms+ 延迟 到 立即发送
- **转录显示**：从等待 AI 回复 到 实时显示
- **代码大小**：减少 9.5%，内存使用减少 30%

### 优化策略
1. **简化音频架构** - 移除复杂队列和批处理系统
2. **直接通信** - 音频数据直接发送给 Gemini API
3. **实时反馈** - 转录和回复立即显示给用户
4. **减少中间层** - 移除不必要的处理步骤

Adopting the **"Simplicity over Complexity"** design philosophy.

## 📊 Performance Metrics (v1.0.9)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Response Time | 2-5s | Real-time | ✅ 2-5s faster |
| Audio Latency | 100ms+ | Immediate | ✅ 100ms+ faster |
| Code Size | 43.47 kB | 39.36 kB | ✅ -9.5% |
| Memory Usage | Baseline | -30% | ✅ 30% reduction |

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Google Gemini](https://ai.google.dev/) for the powerful AI API
- [Electron](https://www.electronjs.org/) for the desktop framework
- [React](https://reactjs.org/) for the UI framework
- [Tailwind CSS](https://tailwindcss.com/) for the styling system

## 📞 Support

- 📧 **Email**: [Create an issue](https://github.com/Suge8/Bready/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Suge8/Bready/discussions)
- 📖 **Documentation**: [Technical Docs](TECHNICAL.md)

## ⭐ Star History

If you find this project helpful, please consider giving it a star! ⭐

---

<div align="center">

**Bready v1.0.9** - Your AI Interview Companion 🤖

Made with ❤️ by [Suge8](https://github.com/Suge8)

[⬆ Back to Top](#面宝-bready-)

</div>

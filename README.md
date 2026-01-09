<div align="center">
  <img src="docs/assets/logo.png" alt="Bready Icon" width="320" />
  <h1>面宝 Bready</h1>
  <p>AI 面试协作助手 · Live interview copilot</p>
  <p>
    <a href="#中文">中文</a> · <a href="#english">English</a> · <a href="#日本語">日本語</a> · <a href="#français">Français</a>
  </p>

[![Build Status](https://github.com/your-org/bready/workflows/CI/badge.svg)](https://github.com/your-org/bready/actions)
[![Coverage Status](https://codecov.io/gh/your-org/bready/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/bready)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)
[![Version](https://img.shields.io/github/v/release/your-org/bready)](https://github.com/your-org/bready/releases)

</div>

---

## 中文

### 一句话

Bready 是桌面端 AI 面试协作助手，提供实时提示、语音协作与结构化准备，让你在面试现场更从容。

### 功能亮点

- **协作模式**：实时问答 + 语音/文本双通道，专注现场表达
- **准备流程**：简历与岗位分析、问题拆解与重点提示
- **隐私优先**：本地运行与权限可控
- **主题与体验**：明暗主题切换、现代化动效与极简布局
- **多语言支持**：中文 / 英文 / 中英混合 / 日语 / 法语

### 快速开始

```bash
git clone https://github.com/your-org/bready.git
cd bready
npm install
cp .env.example .env
npm run dev
```

### 构建与发布

```bash
npm run build
npm run dist
npm run dist:all
```

### 调试与日志

在 `.env.local` 中开启调试（修改后需重启应用）：

```bash
# 日志级别与格式
LOG_LEVEL=debug
LOG_FORMAT=json
LOG_SAMPLE_DEBUG=1
LOG_SAMPLE_INFO=1
LOG_SAMPLE_WARN=1
LOG_SAMPLE_ERROR=1

# AI 服务
DEBUG_DOUBAO=1
DEBUG_GEMINI=1

# 音频与 IPC
DEBUG_AUDIO=1
DEBUG_IPC=1
VITE_DEBUG_AUDIO=1

# 性能与启动
DEBUG_STARTUP=1
DEBUG_MEMORY=1

# 数据库与认证
DEBUG_DB=1
DEBUG_AUTH=1

# 应用与 DevTools
DEBUG_APP=1
DEBUG_DEVTOOLS=1
```

说明：

- `DEBUG_*` 为主进程调试开关，值设为 `1` 即可。
- `VITE_DEBUG_AUDIO` 只影响渲染进程（前端）日志。
- 终端输出为主进程日志；开启 `DEBUG_DEVTOOLS=1` 可在 DevTools Console 查看渲染进程日志。

### 文档

- 设计说明: `docs/UI_DESIGN.md`

---

## English

### In short

Bready is a desktop AI interview copilot that delivers live prompts, dual-channel audio/text collaboration, and structured prep so you stay calm under pressure.

### Highlights

- **Collaboration mode**: real-time Q&A with voice + text
- **Multilingual**: Chinese / English / Chinese+English / Japanese / French
- **Preparation flow**: resume & JD analysis, key talking points
- **Privacy-first**: local runtime and explicit permissions
- **Themes & motion**: light/dark themes with modern UI polish

### Quick Start

```bash
git clone https://github.com/your-org/bready.git
cd bready
npm install
cp .env.example .env
npm run dev
```

### Build

```bash
npm run build
npm run dist
npm run dist:all
```

### Debug & Logs

Enable debug flags in `.env.local` (restart the app after changes):

```bash
# Log level & format
LOG_LEVEL=debug
LOG_FORMAT=json
LOG_SAMPLE_DEBUG=1
LOG_SAMPLE_INFO=1
LOG_SAMPLE_WARN=1
LOG_SAMPLE_ERROR=1

# AI services
DEBUG_DOUBAO=1
DEBUG_GEMINI=1

# Audio & IPC
DEBUG_AUDIO=1
DEBUG_IPC=1
VITE_DEBUG_AUDIO=1

# Performance & startup
DEBUG_STARTUP=1
DEBUG_MEMORY=1

# Database & auth
DEBUG_DB=1
DEBUG_AUTH=1

# App & DevTools
DEBUG_APP=1
DEBUG_DEVTOOLS=1
```

Notes:

- `DEBUG_*` flags are for the main process; set to `1` to enable.
- `VITE_DEBUG_AUDIO` affects renderer (frontend) logs only.
- Main process logs go to the terminal; use `DEBUG_DEVTOOLS=1` to inspect renderer logs in DevTools Console.

### Docs

- Design notes: `docs/UI_DESIGN.md`

---

## 日本語

### 概要

Bready はデスクトップ向けの AI 面接アシスタントです。リアルタイム提示と準備フローで、面接中の安心感を高めます。

### 特長

- **協作モード**：音声 + テキストのリアルタイム支援
- **多言語対応**：中国語 / 英語 / 中英ミックス / 日本語 / フランス語
- **準備フロー**：履歴書・職務内容の分析
- **プライバシー重視**：ローカル実行と権限制御
- **テーマ**：ライト/ダーク切替

### クイックスタート

```bash
git clone https://github.com/your-org/bready.git
cd bready
npm install
cp .env.example .env
npm run dev
```

---

## Français

### En bref

Bready est un copilote d’entretien IA pour desktop, avec prompts en direct et préparation structurée pour répondre sereinement.

### Points forts

- **Mode collaboration** : assistance voix + texte en temps réel
- **Multilingue** : chinois / anglais / mixte / japonais / français
- **Préparation** : analyse CV et description de poste
- **Confidentialité** : exécution locale et permissions contrôlées
- **Thèmes** : clair / sombre

### Démarrage rapide

```bash
git clone https://github.com/your-org/bready.git
cd bready
npm install
cp .env.example .env
npm run dev
```

---

<div align="center">
  Built with ❤️ by the Bready Team
</div>

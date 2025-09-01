# 贡献指南

感谢您对 Bready 项目的关注！我们欢迎所有形式的贡献，包括但不限于：

- 🐛 报告问题
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码修复
- ✨ 开发新功能

## 🚀 快速开始

### 开发环境准备

1. **系统要求**
   - Node.js 18.0+
   - npm 8.0+
   - Git 2.0+

2. **Fork 和克隆项目**
   ```bash
   # Fork 项目到你的GitHub账户
   # 然后克隆你的Fork
   git clone https://github.com/YOUR_USERNAME/bready.git
   cd bready
   
   # 添加上游仓库
   git remote add upstream https://github.com/your-org/bready.git
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

4. **启动开发环境**
   ```bash
   npm run dev
   ```

## 📋 贡献类型

### 🐛 报告问题

在提交问题之前，请：

1. 搜索现有的 [Issues](https://github.com/your-org/bready/issues) 确保问题未被报告
2. 使用最新版本重现问题
3. 收集相关信息（操作系统、Node.js版本等）

**问题报告模板：**

```markdown
## 问题描述
简要描述遇到的问题

## 重现步骤
1. 执行操作A
2. 点击按钮B
3. 观察到错误C

## 预期行为
描述你期望发生的情况

## 实际行为
描述实际发生的情况

## 环境信息
- 操作系统: [例如 macOS 13.0]
- Node.js版本: [例如 18.17.0]
- Bready版本: [例如 2.0.1]

## 附加信息
- 错误日志
- 截图
- 其他相关信息
```

### 💡 功能建议

提交功能建议时，请：

1. 详细描述建议的功能
2. 解释为什么需要这个功能
3. 提供使用场景和示例
4. 考虑实现的复杂性

### 🔧 代码贡献

#### 开发流程

1. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **进行开发**
   - 遵循代码规范
   - 编写测试
   - 更新文档

3. **提交代码**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

4. **推送分支**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **创建 Pull Request**
   - 填写PR模板
   - 等待代码审查
   - 根据反馈进行修改

## 📝 代码规范

### TypeScript/JavaScript

- 使用 TypeScript 进行开发
- 遵循 ESLint 配置
- 使用 Prettier 格式化代码
- 优先使用函数式编程

### 命名规范

```typescript
// ✅ 变量和函数使用 camelCase
const userProfile = getUserProfile()
const isAuthenticated = checkAuth()

// ✅ 类和接口使用 PascalCase
class AudioService {}
interface UserData {}

// ✅ 常量使用 SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3
const API_BASE_URL = 'https://api.example.com'

// ✅ 文件名
Button.tsx          // 组件文件
audioService.ts     // 服务文件
dateUtils.ts        // 工具文件
Button.test.tsx     // 测试文件
```

### 代码组织

```typescript
// 导入顺序
import fs from 'fs'                    // 1. Node.js内置模块
import React from 'react'             // 2. 第三方库
import { AudioService } from './AudioService' // 3. 项目内部模块

// 函数组织
export class AudioService {
  // 公共方法在前
  public async initialize() {}
  public async startCapture() {}
  
  // 私有方法在后
  private setupAudioProcess() {}
  private handleError() {}
}
```

### 注释规范

```typescript
/**
 * 音频服务类
 * 负责音频捕获、处理和管理
 * 
 * @example
 * ```typescript
 * const audioService = new AudioService()
 * await audioService.initialize()
 * ```
 */
export class AudioService {
  /**
   * 开始音频捕获
   * 
   * @param options - 捕获选项
   * @returns Promise<boolean> 是否成功开始捕获
   * @throws {AudioPermissionError} 当权限不足时抛出
   */
  async startCapture(options?: AudioOptions): Promise<boolean> {
    // 实现代码
  }
}
```

## 🧪 测试

### 测试要求

- 新功能必须包含单元测试
- 修复的问题需要添加回归测试
- 测试覆盖率不能降低
- 所有测试必须通过

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- AudioService.test.ts

# 生成覆盖率报告
npm run test:coverage

# 监听模式
npm run test:watch
```

### 测试规范

```typescript
describe('AudioService', () => {
  let audioService: AudioService

  beforeEach(() => {
    audioService = new AudioService()
  })

  describe('初始化', () => {
    it('应该正确初始化音频服务', async () => {
      await audioService.initialize()
      expect(audioService.isReady()).toBe(true)
    })

    it('重复初始化应该被忽略', async () => {
      await audioService.initialize()
      await audioService.initialize()
      // 验证只初始化一次
    })
  })
})
```

## 📤 提交规范

### 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 提交类型

- `feat`: 新功能
- `fix`: 修复问题
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 提交示例

```bash
# ✅ 好的提交信息
feat(auth): add user login functionality

- Implement login form validation
- Add JWT token handling
- Integrate with authentication API

Closes #123

# ✅ 修复问题
fix(audio): resolve microphone permission issue

The microphone permission was not being requested properly
on macOS, causing the audio recording to fail silently.

Fixes #456

# ✅ 文档更新
docs(api): update authentication API documentation

Add examples for login and logout endpoints
```

## 🔍 Pull Request 流程

### PR 检查清单

在提交 Pull Request 之前，请确保：

- [ ] 代码遵循项目编码规范
- [ ] 所有测试通过
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 提交信息符合规范
- [ ] 没有破坏性变更（或已在PR中说明）

### PR 模板

```markdown
## 变更描述
简要描述本次变更的内容和目的

## 变更类型
- [ ] 新功能
- [ ] 问题修复
- [ ] 代码重构
- [ ] 文档更新
- [ ] 测试改进
- [ ] 性能优化

## 测试
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试完成
- [ ] 添加了新的测试用例

## 检查清单
- [ ] 代码遵循项目编码规范
- [ ] 已添加必要的测试
- [ ] 文档已更新
- [ ] 无破坏性变更
- [ ] 已自测功能正常

## 相关Issue
Closes #123
Fixes #456

## 截图（如适用）
<!-- 添加截图或GIF来展示变更效果 -->

## 其他说明
<!-- 任何其他需要说明的信息 -->
```

### 代码审查

所有的 Pull Request 都需要经过代码审查：

1. **自动检查**
   - CI/CD 流水线通过
   - 代码格式检查通过
   - 测试覆盖率达标

2. **人工审查**
   - 至少一位维护者审查
   - 代码质量和设计合理性
   - 功能正确性验证

3. **审查要点**
   - 代码逻辑是否正确
   - 是否遵循最佳实践
   - 性能是否有影响
   - 安全性是否有问题
   - 测试是否充分

## 🏗️ 开发指南

### 项目结构

```
src/
├── main/                   # 主进程代码
│   ├── core/              # 核心模块
│   │   ├── BreadyApplication.ts
│   │   ├── ServiceManager.ts
│   │   └── WindowManager.ts
│   ├── services/          # 业务服务
│   │   ├── AudioService.ts
│   │   ├── GeminiService.ts
│   │   └── AuthService.ts
│   ├── security/          # 安全模块
│   │   ├── SecureKeyManager.ts
│   │   └── IPCSecurityManager.ts
│   └── utils/             # 工具函数
├── renderer/              # 渲染进程代码
│   └── src/
│       ├── components/    # React组件
│       │   ├── ui/       # 基础UI组件
│       │   └── features/ # 功能组件
│       ├── contexts/      # React上下文
│       ├── hooks/         # 自定义Hooks
│       └── utils/         # 工具函数
├── preload/               # 预加载脚本
├── shared/                # 共享代码
└── test/                  # 测试文件
    ├── unit/             # 单元测试
    ├── integration/      # 集成测试
    └── e2e/              # 端到端测试
```

### 开发最佳实践

#### 1. 组件开发

```typescript
// ✅ 好的组件结构
import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false
}) => {
  const [isPressed, setIsPressed] = useState(false)

  const handleClick = useCallback(() => {
    if (!disabled && onClick) {
      onClick()
    }
  }, [disabled, onClick])

  return (
    <motion.button
      className={`btn btn-${variant}`}
      disabled={disabled}
      onClick={handleClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
  )
}
```

#### 2. 服务开发

```typescript
// ✅ 好的服务结构
export class AudioService extends EventEmitter {
  private readonly logger: Logger
  private isInitialized = false

  constructor(private configManager: ConfigManager) {
    super()
    this.logger = Logger.getInstance()
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      await this.setupAudioDevices()
      this.isInitialized = true
      this.logger.info('AudioService initialized')
    } catch (error) {
      this.logger.error('Failed to initialize AudioService:', error)
      throw error
    }
  }

  private async setupAudioDevices(): Promise<void> {
    // 实现音频设备设置
  }
}
```

#### 3. 错误处理

```typescript
// ✅ 统一错误处理
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// 使用Result模式
type Result<T, E = AppError> = 
  | { success: true; data: T }
  | { success: false; error: E }

async function fetchUserData(id: string): Promise<Result<UserData>> {
  try {
    const data = await api.getUser(id)
    return { success: true, data }
  } catch (error) {
    return { 
      success: false, 
      error: new AppError('Failed to fetch user', 'USER_FETCH_ERROR')
    }
  }
}
```

### 调试技巧

#### 1. 主进程调试

```bash
# 启用调试模式
npm run dev -- --inspect=9229

# 在Chrome中打开 chrome://inspect
```

#### 2. 渲染进程调试

```typescript
// 在开发模式下打开开发者工具
if (process.env.NODE_ENV === 'development') {
  mainWindow.webContents.openDevTools()
}
```

#### 3. 日志调试

```typescript
// 使用统一的日志系统
import { Logger } from '../utils/Logger'

const logger = Logger.getInstance()
logger.debug('Debug information')
logger.info('General information')
logger.warn('Warning message')
logger.error('Error occurred', error)
```

## 🚀 发布流程

### 版本管理

我们使用语义化版本控制：

- **MAJOR**: 不兼容的API变更
- **MINOR**: 向后兼容的功能新增
- **PATCH**: 向后兼容的问题修复

### 发布步骤

1. **准备发布**
   ```bash
   # 确保在main分支
   git checkout main
   git pull origin main
   
   # 创建发布分支
   git checkout -b release/v2.1.0
   ```

2. **更新版本**
   ```bash
   # 更新版本号
   npm version minor  # 或 major/patch
   
   # 更新CHANGELOG.md
   # 提交变更
   git add .
   git commit -m "chore(release): prepare v2.1.0"
   ```

3. **测试和构建**
   ```bash
   # 运行所有测试
   npm run test:all
   
   # 构建应用
   npm run build
   npm run dist
   ```

4. **合并和标签**
   ```bash
   # 合并到main
   git checkout main
   git merge release/v2.1.0
   
   # 创建标签
   git tag v2.1.0
   git push origin main --tags
   ```

## 🤝 社区

### 行为准则

我们致力于为每个人提供友好、安全和欢迎的环境。请遵循以下准则：

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 获取帮助

如果您需要帮助，可以通过以下方式：

- 📖 查看[文档](docs/)
- 🐛 搜索[已知问题](https://github.com/your-org/bready/issues)
- 💬 在[讨论区](https://github.com/your-org/bready/discussions)提问
- 📧 发送邮件到 support@bready.com

### 贡献者

感谢所有为 Bready 项目做出贡献的开发者！

<!-- 这里会自动生成贡献者列表 -->

## 📄 许可证

通过贡献代码，您同意您的贡献将在与项目相同的 [MIT 许可证](LICENSE.md) 下获得许可。

---

再次感谢您对 Bready 项目的贡献！🎉

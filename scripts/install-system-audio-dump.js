#!/usr/bin/env node

/**
 * SystemAudioDump 自动安装脚本
 * 自动下载、编译并安装 SystemAudioDump 工具
 */

import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const execAsync = promisify(exec)

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

const projectRoot = path.resolve(__dirname, '..')
const assetsDir = path.join(projectRoot, 'assets')
const tempDir = path.join(projectRoot, '.temp-system-audio-dump')
const targetPath = path.join(assetsDir, 'SystemAudioDump')

// 检查系统要求
async function checkSystemRequirements() {
  log('🔍 检查系统要求...', 'blue')
  
  try {
    // 检查 macOS 版本
    const { stdout: osVersion } = await execAsync('sw_vers -productVersion')
    const version = osVersion.trim()
    const majorVersion = parseInt(version.split('.')[0])
    
    if (majorVersion < 13) {
      throw new Error(`SystemAudioDump 需要 macOS 13.0+，当前版本: ${version}`)
    }
    
    log(`✅ macOS 版本: ${version}`, 'green')
    
    // 检查 Swift 编译器
    await execAsync('swift --version')
    log('✅ Swift 编译器可用', 'green')
    
    // 检查 Git
    await execAsync('git --version')
    log('✅ Git 可用', 'green')
    
    return true
  } catch (error) {
    throw new Error(`系统要求检查失败: ${error.message}`)
  }
}

// 检查是否已安装
async function checkExistingInstallation() {
  try {
    if (fs.existsSync(targetPath)) {
      // 检查文件是否可执行
      fs.accessSync(targetPath, fs.constants.F_OK | fs.constants.X_OK)
      
      // 简单测试执行（1秒后停止）
      const testProcess = spawn(targetPath, [], { stdio: 'ignore' })
      setTimeout(() => testProcess.kill(), 1000)
      
      return true
    }
    return false
  } catch (error) {
    return false
  }
}

// 下载和编译 SystemAudioDump
async function downloadAndBuild() {
  log('📥 下载 SystemAudioDump 源码...', 'blue')
  
  try {
    // 清理临时目录
    if (fs.existsSync(tempDir)) {
      await execAsync(`rm -rf "${tempDir}"`)
    }
    
    // 克隆仓库
    await execAsync(`git clone https://github.com/sohzm/systemAudioDump.git "${tempDir}"`)
    log('✅ 源码下载完成', 'green')
    
    // 进入目录并编译
    log('🔨 编译 SystemAudioDump...', 'blue')
    const buildCommand = 'swift build -c release'
    
    await new Promise((resolve, reject) => {
      const buildProcess = spawn('bash', ['-c', buildCommand], {
        cwd: tempDir,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      
      let output = ''
      let errorOutput = ''
      
      buildProcess.stdout?.on('data', (data) => {
        output += data.toString()
      })
      
      buildProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString()
      })
      
      buildProcess.on('close', (code) => {
        if (code === 0) {
          log('✅ 编译完成', 'green')
          resolve(true)
        } else {
          log('编译输出:', 'yellow')
          console.log(output)
          if (errorOutput) {
            log('编译错误:', 'red')
            console.log(errorOutput)
          }
          reject(new Error(`编译失败，退出码: ${code}`))
        }
      })
      
      buildProcess.on('error', (error) => {
        reject(new Error(`编译进程启动失败: ${error.message}`))
      })
    })
    
    return true
  } catch (error) {
    throw new Error(`下载和编译失败: ${error.message}`)
  }
}

// 安装到项目
async function installToProject() {
  log('📦 安装到项目...', 'blue')
  
  try {
    // 确保 assets 目录存在
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true })
    }
    
    // 查找编译后的可执行文件
    const builtExecutable = path.join(tempDir, '.build/release/SystemAudioDump')
    
    if (!fs.existsSync(builtExecutable)) {
      throw new Error('编译后的可执行文件不存在')
    }
    
    // 复制到 assets 目录
    fs.copyFileSync(builtExecutable, targetPath)
    
    // 确保文件有执行权限
    fs.chmodSync(targetPath, 0o755)
    
    log(`✅ 安装完成: ${targetPath}`, 'green')
    
    // 验证安装
    fs.accessSync(targetPath, fs.constants.F_OK | fs.constants.X_OK)
    
    // 清理临时目录
    await execAsync(`rm -rf "${tempDir}"`)
    log('✅ 清理完成', 'green')
    
    return true
  } catch (error) {
    throw new Error(`安装失败: ${error.message}`)
  }
}

// 显示安装后说明
function showPostInstallInstructions() {
  log('\n🎉 SystemAudioDump 安装成功！', 'green')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue')
  log('📋 下一步操作:', 'bold')
  log('   1. 首次运行时需要授予屏幕录制权限', 'yellow')
  log('   2. 系统偏好设置 > 安全性与隐私 > 屏幕录制', 'yellow')
  log('   3. 添加 Bready 应用到允许列表', 'yellow')
  log('\n💡 提示:', 'bold')
  log('   - 系统音频模式：用于在线面试（推荐）', 'blue')
  log('   - 麦克风模式：用于直接对话练习', 'blue')
  log('   - 应用会自动在两种模式间切换', 'blue')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue')
}

// 主安装流程
async function main() {
  const args = process.argv.slice(2)
  const forceReinstall = args.includes('--force') || args.includes('-f')
  
  try {
    log('🚀 SystemAudioDump 安装器', 'bold')
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue')
    
    // 检查系统要求
    await checkSystemRequirements()
    
    // 检查是否已安装
    if (!forceReinstall) {
      const isInstalled = await checkExistingInstallation()
      if (isInstalled) {
        log('✅ SystemAudioDump 已安装且工作正常', 'green')
        log('💡 使用 --force 参数强制重新安装', 'yellow')
        showPostInstallInstructions()
        return
      }
    }
    
    // 下载和编译
    await downloadAndBuild()
    
    // 安装到项目
    await installToProject()
    
    // 显示后续说明
    showPostInstallInstructions()
    
  } catch (error) {
    log('❌ 安装失败:', 'red')
    log(error.message, 'red')
    
    // 清理
    if (fs.existsSync(tempDir)) {
      try {
        await execAsync(`rm -rf "${tempDir}"`)
      } catch {}
    }
    
    log('\n💡 故障排除建议:', 'yellow')
    log('   1. 确保已安装 Xcode 和 Command Line Tools', 'yellow')
    log('   2. 确保网络连接正常', 'yellow')
    log('   3. 检查系统权限设置', 'yellow')
    log('   4. 使用 --force 参数重新安装', 'yellow')
    
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { main as installSystemAudioDump }
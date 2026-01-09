#!/usr/bin/env node

/**
 * 面宝数据库管理脚本
 * 用于启动、停止、重置本地 PostgreSQL 数据库
 */

import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const execAsync = promisify(exec)

// 数据库配置
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'bready',
  user: process.env.USER || 'postgres', // 使用当前系统用户
}

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// 检查 PostgreSQL 是否安装
async function checkPostgreSQL() {
  try {
    await execAsync('which psql')
    return true
  } catch (error) {
    return false
  }
}

// 检查 PostgreSQL 服务状态
async function checkPostgreSQLStatus() {
  try {
    // macOS Homebrew 方式
    try {
      const { stdout } = await execAsync('brew services list | grep postgresql')
      if (stdout.includes('started')) {
        return 'running'
      } else {
        return 'stopped'
      }
    } catch (error) {
      // 尝试直接连接数据库
      await execAsync(
        `psql -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d postgres -c "SELECT 1;" 2>/dev/null`,
      )
      return 'running'
    }
  } catch (error) {
    return 'stopped'
  }
}

// 启动 PostgreSQL 服务
async function startPostgreSQL() {
  log('🚀 启动 PostgreSQL 服务...', 'blue')

  try {
    // 尝试 Homebrew 方式启动
    await execAsync('brew services start postgresql@15 || brew services start postgresql')
    log('✅ PostgreSQL 服务启动成功', 'green')

    // 等待服务完全启动
    log('⏳ 等待服务完全启动...', 'yellow')
    await new Promise((resolve) => setTimeout(resolve, 3000))

    return true
  } catch (error) {
    log('❌ 启动失败，请手动启动 PostgreSQL 服务', 'red')
    log('💡 提示：', 'yellow')
    log('   - macOS: brew services start postgresql', 'yellow')
    log('   - Linux: sudo systemctl start postgresql', 'yellow')
    log('   - Windows: 通过服务管理器启动', 'yellow')
    return false
  }
}

// 停止 PostgreSQL 服务
async function stopPostgreSQL() {
  log('🛑 停止 PostgreSQL 服务...', 'blue')

  try {
    await execAsync('brew services stop postgresql@15 || brew services stop postgresql')
    log('✅ PostgreSQL 服务已停止', 'green')
    return true
  } catch (error) {
    log('❌ 停止失败，请手动停止 PostgreSQL 服务', 'red')
    log('💡 提示：', 'yellow')
    log('   - macOS: brew services stop postgresql', 'yellow')
    log('   - Linux: sudo systemctl stop postgresql', 'yellow')
    log('   - Windows: 通过服务管理器停止', 'yellow')
    return false
  }
}

// 检查数据库是否存在
async function checkDatabase() {
  try {
    await execAsync(
      `psql -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -c "SELECT 1;" 2>/dev/null`,
    )
    return true
  } catch (error) {
    return false
  }
}

// 创建数据库
async function createDatabase() {
  log('📦 创建数据库...', 'blue')

  try {
    await execAsync(
      `createdb -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} ${DB_CONFIG.database}`,
    )
    log('✅ 数据库创建成功', 'green')
    return true
  } catch (error) {
    if (error.message.includes('already exists')) {
      log('ℹ️  数据库已存在', 'yellow')
      return true
    }
    log('❌ 数据库创建失败:', 'red')
    log(error.message, 'red')
    return false
  }
}

// 初始化数据库表结构
async function initializeDatabase() {
  log('🔧 初始化数据库表结构...', 'blue')

  const initSqlPath = path.join(__dirname, '../database/init.sql')

  if (!fs.existsSync(initSqlPath)) {
    log('❌ 找不到初始化脚本: database/init.sql', 'red')
    return false
  }

  try {
    await execAsync(
      `psql -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -f "${initSqlPath}"`,
    )
    log('✅ 数据库表结构初始化成功', 'green')
    return true
  } catch (error) {
    log('❌ 数据库初始化失败:', 'red')
    log(error.message, 'red')
    return false
  }
}

// 重置数据库
async function resetDatabase() {
  log('🔄 重置数据库...', 'yellow')
  log('⚠️  警告：这将删除所有数据！', 'red')

  try {
    // 删除数据库
    await execAsync(
      `dropdb -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} ${DB_CONFIG.database} --if-exists`,
    )
    log('🗑️  旧数据库已删除', 'yellow')

    // 重新创建
    const created = await createDatabase()
    if (!created) return false

    // 初始化
    const initialized = await initializeDatabase()
    if (!initialized) return false

    log('✅ 数据库重置完成', 'green')
    return true
  } catch (error) {
    log('❌ 数据库重置失败:', 'red')
    log(error.message, 'red')
    return false
  }
}

// 显示数据库状态
async function showStatus() {
  log('📊 数据库状态检查', 'bold')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue')

  // 检查 PostgreSQL 安装
  const isInstalled = await checkPostgreSQL()
  log(`PostgreSQL 安装: ${isInstalled ? '✅ 已安装' : '❌ 未安装'}`, isInstalled ? 'green' : 'red')

  if (!isInstalled) {
    log('💡 安装提示:', 'yellow')
    log('   - macOS: brew install postgresql', 'yellow')
    log('   - Ubuntu: sudo apt install postgresql', 'yellow')
    return
  }

  // 检查服务状态
  const serviceStatus = await checkPostgreSQLStatus()
  log(
    `PostgreSQL 服务: ${serviceStatus === 'running' ? '✅ 运行中' : '❌ 已停止'}`,
    serviceStatus === 'running' ? 'green' : 'red',
  )

  if (serviceStatus === 'running') {
    // 检查数据库
    const dbExists = await checkDatabase()
    log(`Bready 数据库: ${dbExists ? '✅ 存在' : '❌ 不存在'}`, dbExists ? 'green' : 'red')

    if (dbExists) {
      log(
        `连接信息: postgresql://${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`,
        'blue',
      )
    }
  }

  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue')
}

// 主函数
async function main() {
  const command = process.argv[2]

  log('🍞 面宝数据库管理器', 'bold')
  log('', 'reset')

  switch (command) {
    case 'start':
      await startPostgreSQL()
      break

    case 'stop':
      await stopPostgreSQL()
      break

    case 'status':
      await showStatus()
      break

    case 'init':
      const status = await checkPostgreSQLStatus()
      if (status !== 'running') {
        log('❌ PostgreSQL 服务未运行，请先启动服务', 'red')
        break
      }

      const created = await createDatabase()
      if (created) {
        await initializeDatabase()
      }
      break

    case 'reset':
      const serviceRunning = await checkPostgreSQLStatus()
      if (serviceRunning !== 'running') {
        log('❌ PostgreSQL 服务未运行，请先启动服务', 'red')
        break
      }

      await resetDatabase()
      break

    case 'setup':
      // 完整设置流程
      log('🔧 开始完整数据库设置...', 'blue')

      const installed = await checkPostgreSQL()
      if (!installed) {
        log('❌ PostgreSQL 未安装，请先安装 PostgreSQL', 'red')
        break
      }

      const started = await startPostgreSQL()
      if (started) {
        const dbCreated = await createDatabase()
        if (dbCreated) {
          await initializeDatabase()
          log('🎉 数据库设置完成！', 'green')
        }
      }
      break

    default:
      log('用法:', 'yellow')
      log('  npm run db:start   - 启动 PostgreSQL 服务', 'yellow')
      log('  npm run db:stop    - 停止 PostgreSQL 服务', 'yellow')
      log('  npm run db:status  - 查看数据库状态', 'yellow')
      log('  npm run db:init    - 初始化数据库', 'yellow')
      log('  npm run db:reset   - 重置数据库（删除所有数据）', 'yellow')
      log('  npm run db:setup   - 完整设置（启动+创建+初始化）', 'yellow')
      break
  }
}

// 运行主函数
main().catch((error) => {
  log('❌ 执行失败:', 'red')
  log(error.message, 'red')
  process.exit(1)
})

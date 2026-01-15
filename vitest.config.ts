import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()] as any,

  test: {
    // 测试环境
    environment: 'jsdom',

    // 全局设置
    globals: true,

    // 设置文件
    setupFiles: ['./src/test/setup.ts'],

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/build/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        // 核心模块更高要求
        'src/main/services/': {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
    },

    // 测试文件匹配
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],

    // 测试超时
    testTimeout: 10000,

    // 并发执行
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4,
      },
    },

    // 监听模式
    watch: false,

    // 报告器
    reporters: ['verbose', 'json', 'html'],
  },

  // 路径解析
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      '@main': resolve(__dirname, 'src/main'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@test': resolve(__dirname, 'src/test'),
    },
  },
})

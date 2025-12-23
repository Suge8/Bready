import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      define: {
        'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
        'process.env.VITE_DEV_MODE': JSON.stringify(env.VITE_DEV_MODE)
      }
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      define: {
        'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
        'process.env.VITE_DEV_MODE': JSON.stringify(env.VITE_DEV_MODE)
      }
    },
    renderer: {
      resolve: {
        alias: {
          '@renderer': resolve('src/renderer/src'),
          '@': resolve('src/renderer/src')
        }
      },
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
        'process.env.VITE_DEV_MODE': JSON.stringify(env.VITE_DEV_MODE)
      }
    }
  }
})

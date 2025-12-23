import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, Zap, Shield, Mic, Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { useTheme } from './ui/theme-provider'

interface WelcomePageProps {
  onComplete: () => void
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onComplete }) => {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const handleGetStarted = () => {
    navigate('/create-preparation')
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-white dark:bg-gray-900 flex flex-col">
      {/* 拖拽区域和主题切换 */}
      <div className="h-12 w-full relative flex items-center justify-between px-4" style={{ WebkitAppRegion: 'drag' } as any}>
        <div></div> {/* 占位符 */}
        {mounted && (
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="min-h-full flex items-center justify-center p-6">
          <div className="max-w-3xl mx-auto">
            {/* Logo 和标题 */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-black dark:bg-white rounded-2xl mb-6">
                <Sparkles className="w-8 h-8 text-white dark:text-black" />
              </div>
              <h1 className="text-4xl font-bold text-black dark:text-white mb-3 tracking-tight">
                面宝
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                面试紧张？放轻松
              </p>
            </div>

            {/* 产品介绍 */}
            <Card className="mb-8 border-gray-200 dark:border-gray-700 rounded-3xl bg-white dark:bg-gray-800">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 m-2">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-6 h-6 text-black dark:text-white" />
                    </div>
                    <h3 className="font-semibold text-black dark:text-white mb-2 text-base">智能协作</h3>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li>简历分析</li>
                      <li>实时提词</li>
                    </ul>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Mic className="w-6 h-6 text-black dark:text-white" />
                    </div>
                    <h3 className="font-semibold text-black dark:text-white mb-2 text-base">音频技术</h3>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li>低延迟响应</li>
                      <li>无损音频处理</li>
                    </ul>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-6 h-6 text-black dark:text-white" />
                    </div>
                    <h3 className="font-semibold text-black dark:text-white mb-2 text-base">隐私安全</h3>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li>反检测</li>
                      <li>数据存于本地</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 操作按钮 */}
            <div className="text-center my-6">
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="h-12 px-6 text-base font-medium group shadow-lg hover:shadow-xl cursor-pointer bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                <span>为我的面试做好准备</span>
                <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* 跳过按钮 */}
            <div className="text-center">
              <Button
                onClick={onComplete}
                variant="ghost"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm cursor-pointer"
              >
                稍后再说
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomePage
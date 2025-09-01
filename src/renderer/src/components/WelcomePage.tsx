import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, Zap, Shield, Mic } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface WelcomePageProps {
  onComplete: () => void
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onComplete }) => {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate('/create-preparation')
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* 拖拽区域 */}
      <div className="h-6 w-full" style={{ WebkitAppRegion: 'drag' } as any}></div>
      <div className="flex-1 flex items-center justify-center p-6" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="max-w-3xl mx-auto">
        {/* Logo 和标题 */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-2xl mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-black mb-3 tracking-tight">
            面宝
          </h1>
          <p className="text-lg text-gray-600">
            面试紧张？放轻松
          </p>
        </div>

        {/* 产品介绍 */}
        <Card className="mb-8 border-gray-200 rounded-3xl">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-6 m-2">
              <div className="text-center">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-5 h-5 text-black" />
                </div>
                <h3 className="font-semibold text-black mb-2 text-sm">智能协作</h3>
                <ul className="space-y-2 text-xs text-gray-600">
                  <li>简历分析</li>
                  <li>实时提词</li>
                </ul>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Mic className="w-5 h-5 text-black" />
                </div>
                <h3 className="font-semibold text-black mb-2 text-sm">音频技术</h3>
                <ul className="space-y-2 text-xs text-gray-600">
                  <li>低延迟响应</li>
                  <li>无损音频处理</li>
                </ul>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-5 h-5 text-black" />
                </div>
                <h3 className="font-semibold text-black mb-2 text-sm">隐私安全</h3>
                <ul className="space-y-2 text-xs text-gray-600">
                  <li>反检测</li>
                  <li>数据存于本地</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="text-center my-4">
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="h-12 px-6 text-base font-medium group shadow-lg hover:shadow-xl cursor-pointer"
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
            className="text-gray-500 hover:text-gray-700 text-sm cursor-pointer"
          >
            稍后再说
          </Button>
        </div>
        </div>
      </div>


    </div>
  )
}

export default WelcomePage

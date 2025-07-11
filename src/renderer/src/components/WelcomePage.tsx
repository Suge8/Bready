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
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-4xl mx-auto">
        {/* Logo 和标题 */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black rounded-2xl mb-8">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-6xl font-bold text-black mb-6 tracking-tight">
            面宝
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            您最信赖的 AI 面试伙伴
          </p>
        </div>

        {/* 产品介绍 */}
        <Card className="mb-16 border-gray-200">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-4 text-black">
              开始您的首次面试准备吧！
            </CardTitle>
            <CardDescription className="text-lg leading-relaxed max-w-2xl mx-auto text-gray-600">
              通过独特的"面试前准备"与"协作"功能，让每一位用户都能自信、从容地应对面试挑战，
              将个人价值最大化，成功斩获理想 Offer。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-black" />
                </div>
                <h3 className="font-semibold text-black mb-3">智能协作</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>实时语音协作辅助</li>
                  <li>AI 提词器功能</li>
                  <li>智能面试准备管理</li>
                </ul>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-6 h-6 text-black" />
                </div>
                <h3 className="font-semibold text-black mb-3">音频技术</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>系统音频输入支持</li>
                  <li>实时转录和响应</li>
                  <li>高质量音频处理</li>
                </ul>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-black" />
                </div>
                <h3 className="font-semibold text-black mb-3">隐私安全</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>无感悬浮窗体验</li>
                  <li>反检测机制</li>
                  <li>本地数据存储</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="text-center space-y-6">
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="h-14 px-8 text-base font-medium group shadow-lg hover:shadow-xl"
          >
            <span>立即创建我的第一个准备</span>
            <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>

          <div>
            <Button
              onClick={onComplete}
              variant="ghost"
              className="text-gray-500 hover:text-gray-700"
            >
              跳过，稍后设置
            </Button>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="mt-16 text-center text-sm text-gray-400">
          <p>面宝 v1.1.0 - 让每次面试都充满自信</p>
        </div>
      </div>
    </div>
  )
}

export default WelcomePage

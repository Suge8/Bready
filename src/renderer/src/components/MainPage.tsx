import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ArrowRight, Plus, Sparkles, UserCircle, Calendar, Trash2 } from 'lucide-react'
import SelectPreparationModal from './SelectPreparationModal'
import AllPreparationsModal from './AllPreparationsModal'
import UserProfileModal from './UserProfileModal'
import AdminPanelModal from './AdminPanelModal'
import { Button } from './ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card'
import { preparationService, type Preparation } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

import { MicroInteraction } from './ui/navigation'

interface MainPageProps {
  preparations: Preparation[]
  setPreparations: React.Dispatch<React.SetStateAction<Preparation[]>>
  onReloadData: () => Promise<void>
}

const MainPage: React.FC<MainPageProps> = ({ preparations, setPreparations, onReloadData }) => {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [showSelectModal, setShowSelectModal] = useState(false)
  const [showAllPreparationsModal, setShowAllPreparationsModal] = useState(false)
  const [showUserProfileModal, setShowUserProfileModal] = useState(false)
  const [showAdminPanelModal, setShowAdminPanelModal] = useState(false)
  const [isEnteringMode, setIsEnteringMode] = useState(false)


  // 随机标语
  const slogans = [
    "面试紧张？放轻松",
    "面宝协作，胜券在握",
    "面试？小意思",
    "AI 助力，轻松顺利",
  ]

  const [currentSlogan] = useState(() =>
    slogans[Math.floor(Math.random() * slogans.length)]
  )

  const handleStartInterview = () => {
    setShowSelectModal(true)
  }

  const handleCreateNew = () => {
    navigate('/create-preparation')
  }

  const handleViewPreparation = (id: string) => {
    navigate(`/preparation/${id}`)
  }

  const handleDeletePreparation = async (id: string) => {
    if (confirm('确定要删除这个准备项吗？此操作无法撤销。')) {
      try {
        await preparationService.delete(id)
        const updatedPreparations = preparations.filter(p => p.id !== id)
        setPreparations(updatedPreparations)
        // 重新加载数据以确保同步
        await onReloadData()
      } catch (error) {
        console.error('Failed to delete preparation:', error)
        alert('删除失败，请稍后重试')
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }



  // 筛选和搜索后的准备项
  const filteredPreparations = preparations

  return (
    <div className="h-screen bg-white dark:bg-black flex flex-col transition-colors duration-300 relative overflow-hidden">
      {/* 背景光晕效果 - 极简且高级 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-gray-100/50 to-transparent dark:from-zinc-900/30 dark:to-transparent rounded-[100%] blur-[100px] pointer-events-none z-0" />

      {/* 顶部导航 */}
      <header className="border-b border-gray-200 dark:border-zinc-800 bg-white/60 dark:bg-black/60 backdrop-blur-md z-50 flex-shrink-0 sticky top-0">
        {/* 拖拽区域 */}
        <div className="h-6 w-full" style={{ WebkitAppRegion: 'drag' } as any}></div>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {/* 左侧空白区域，避开macOS系统按钮 */}
          <div className="w-20"></div>

          {/* 中间：Logo和标题 */}
          <div className="flex items-center -mt-6 space-x-3">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300">
              <Sparkles className="w-4 h-4 text-white dark:text-black" />
            </div>
            <h1 className="text-lg font-bold text-black dark:text-white tracking-tight">面宝</h1>
          </div>

          {/* 右侧：用户按钮 */}
          <Button
            variant="ghost"
            className="w-10 h-10 !p-2 -mt-4 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-all duration-200 cursor-pointer"
            onClick={() => setShowUserProfileModal(true)}
          >
            <UserCircle className="w-8 h-8 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>
      </header>



      {/* 主要内容 */}
      <main className="flex-1 overflow-y-auto px-6 pt-8 pb-8">
        <div className="min-h-full flex items-center justify-center">
          <div className="max-w-5xl w-full">
            <div className="flex flex-col gap-12">
              {/* 上方：开始按钮区域 */}
              <div className="w-full flex flex-col justify-center items-center text-center">
                <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="mb-10">
                    <h1 className="text-5xl font-extrabold text-black dark:text-white mb-6 leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                      {currentSlogan}
                    </h1>
                    <p className="text-xl text-gray-500 dark:text-gray-400 leading-relaxed font-light">
                      拿 Offer 从未如此简单
                    </p>
                  </div>

                  <Button
                    onClick={handleStartInterview}
                    size="lg"
                    className="h-14 px-10 text-lg font-semibold group bg-black hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-gray-200 dark:text-black rounded-full shadow-2xl hover:shadow-3xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                  >
                    开始
                    <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>

              {/* 下方：我的准备列表 */}
              <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 tracking-wider uppercase">我的准备</h2>
                    {filteredPreparations.length > 0 && (
                      <Button
                        onClick={handleCreateNew}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all duration-200 rounded-full cursor-pointer"
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                    )}
                  </div>

                  {/* 准备项列表 */}
                  <div className="space-y-4">
                    {filteredPreparations.length === 0 ? (
                      <Card className="p-10 border border-gray-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/30 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                        {/* 背景装饰图案 */}
                        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                          style={{
                            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
                            backgroundSize: '24px 24px'
                          }}
                        />

                        <div className="w-16 h-16 mb-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-900 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
                          <Sparkles className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                        </div>
                        <CardTitle className="text-lg mb-2 text-gray-900 dark:text-white font-semibold">
                          开启你的第一次面试准备
                        </CardTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-8 leading-relaxed">
                          创建一个准备项，上传你的简历或职位描述，让 AI 帮你分析并进行模拟面试。
                        </p>
                        <Button
                          onClick={handleCreateNew}
                          className="h-10 px-6 bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-200 dark:text-black rounded-full font-medium text-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                        >
                          立即创建
                          <ArrowRight className="ml-2 w-4 h-4 opacity-70" />
                        </Button>
                      </Card>
                    ) : (
                      <>
                        {/* 紧凑的准备项卡片 - 横向排列 */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {filteredPreparations.slice(0, 3).map((preparation) => (
                            <MicroInteraction key={preparation.id}>
                              <Card
                                className="group cursor-pointer border border-gray-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-sm hover:bg-white dark:hover:bg-zinc-900 rounded-xl overflow-hidden relative transition-all duration-300 hover:shadow-xl dark:hover:shadow-none hover:-translate-y-1 hover:border-gray-200 dark:hover:border-zinc-700"
                                onClick={() => handleViewPreparation(preparation.id)}
                              >
                                {/* 顶部高亮线条 */}
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <CardHeader className="p-5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-2">
                                        <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-black dark:group-hover:text-white transition-colors truncate tracking-tight">
                                          {preparation.name}
                                        </CardTitle>
                                        {preparation.is_analyzing && (
                                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-medium border border-blue-100 dark:border-blue-900/30">
                                            <span className="relative flex h-1.5 w-1.5">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                                            </span>
                                            分析中
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center text-xs text-gray-400 dark:text-gray-500 font-medium">
                                        <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                        {formatDate(preparation.updated_at)}
                                      </div>
                                    </div>
                                    {/* 悬浮显示的删除按钮 */}
                                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 ml-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full cursor-pointer transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeletePreparation(preparation.id)
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardHeader>
                              </Card>
                            </MicroInteraction>
                          ))}
                        </div>

                        {filteredPreparations.length > 3 && (
                          <div className="pt-2 text-center">
                            <Button
                              variant="ghost"
                              className="w-auto px-6 py-2 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full font-medium transition-all duration-200 text-xs mx-auto block cursor-pointer"
                              onClick={() => setShowAllPreparationsModal(true)}
                            >
                              查看全部 {filteredPreparations.length} 个
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 选择准备项模态框 */}
      <AnimatePresence>
        {showSelectModal && (
          <SelectPreparationModal
            preparations={preparations}
            isLoading={isEnteringMode}
            onClose={() => !isEnteringMode && setShowSelectModal(false)}
            onSelect={async (preparation, language, purpose) => {
              // 标记正在进入协作模式，显示加载状态
              setIsEnteringMode(true)

              // 保存选择的配置到 localStorage
              if (preparation) {
                localStorage.setItem('bready-selected-preparation', JSON.stringify(preparation))
              } else {
                // 用户选择"不准备直接开始"，清除之前保存的准备资料
                localStorage.removeItem('bready-selected-preparation')
              }
              localStorage.setItem('bready-selected-language', language)
              localStorage.setItem('bready-selected-purpose', purpose)

              // 启动协作模式 - 调整窗口大小并导航到协作页面
              try {
                // 检查是否在 Electron 环境中
                if (window.bready) {
                  const success = await window.bready.enterCollaborationMode()
                  console.log('Enter collaboration mode result:', success)
                  if (!success) {
                    throw new Error('Failed to enter collaboration mode')
                  }
                } else {
                  console.log('🌐 Running in browser mode - skipping window management')
                }

                // 等待一小段时间让窗口调整完成，避免视觉跳跃
                await new Promise(resolve => setTimeout(resolve, 300))

                navigate('/collaboration')

                // 导航完成后关闭模态框状态（虽然组件已经卸载）
                setShowSelectModal(false)
                setIsEnteringMode(false)
              } catch (error) {
                console.error('Failed to enter collaboration mode:', error)
                alert('无法启动协作模式，请检查应用权限')
                setIsEnteringMode(false)
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* 查看全部准备项模态窗 */}
      {showAllPreparationsModal && (
        <AllPreparationsModal
          preparations={filteredPreparations}
          onClose={() => setShowAllPreparationsModal(false)}
          onDelete={handleDeletePreparation}
          onView={handleViewPreparation}
          onEdit={(id) => navigate(`/edit-preparation/${id}`)}
        />
      )}

      {/* 个人中心模态窗 */}
      {showUserProfileModal && (
        <UserProfileModal
          onClose={() => setShowUserProfileModal(false)}
          onOpenAdminPanel={() => {
            setShowUserProfileModal(false)
            setShowAdminPanelModal(true)
          }}
        />
      )}

      {/* 后台模态窗 */}
      {showAdminPanelModal && (
        <AdminPanelModal
          onClose={() => setShowAdminPanelModal(false)}
        />
      )}
    </div>
  )
}

export default MainPage
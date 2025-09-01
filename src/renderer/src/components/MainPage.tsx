import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Sparkles, UserCircle, Calendar, Trash2, ArrowRight } from 'lucide-react'
import SelectPreparationModal from './SelectPreparationModal'
import AllPreparationsModal from './AllPreparationsModal'
import UserProfileModal from './UserProfileModal'
import AdminPanelModal from './AdminPanelModal'
import { Button } from './ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card'
import { preparationService, type Preparation } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

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

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* 顶部导航 */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm z-50 flex-shrink-0">
        {/* 拖拽区域 */}
        <div className="h-6 w-full" style={{ WebkitAppRegion: 'drag' } as any}></div>
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {/* 左侧空白区域，避开macOS系统按钮 */}
          <div className="w-20"></div>

          {/* 中间：Logo和标题 */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-black to-gray-800 rounded-lg flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-black tracking-tight">面宝</h1>
          </div>

          {/* 右侧：用户按钮 */}
          <Button
            variant="ghost"
            className="w-14 h-14 hover:bg-gray-50 rounded-lg transition-all duration-200 hover:scale-105"
            onClick={() => setShowUserProfileModal(true)}
          >
            <UserCircle className="w-10 h-10 text-gray-700" />
          </Button>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="flex-1 flex items-center justify-center px-6 pt-8">
        <div className="max-w-5xl w-full">
        <div className="grid grid-cols-3 gap-6">
          {/* 左侧：开始按钮 - 占2/3 */}
          <div className="col-span-2 flex flex-col justify-center items-center text-center">
            <div className="max-w-2xl">
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-black mb-6 leading-tight tracking-tight">
                  {currentSlogan}
                </h1>
                <p className="text-lg text-gray-500 leading-relaxed">
                  拿 Offer 从未如此简单
                </p>
              </div>

              <Button
                onClick={handleStartInterview}
                size="lg"
                className="h-14 px-8 text-lg font-semibold group bg-black hover:bg-gray-900 text-white rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105"
              >
                开始
                <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          {/* 右侧：我的准备 - 占1/3 */}
          <div className="flex flex-col justify-center pl-4">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-black tracking-tight">我的准备</h2>
                {preparations.length > 0 && (
                  <Button
                    onClick={handleCreateNew}
                    variant="outline"
                    size="icon"
                    className="border-gray-200 hover:border-black hover:bg-black hover:text-white transition-all duration-200 rounded-lg w-8 h-8"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* 准备项列表 */}
              <div className="space-y-4">
                {preparations.length === 0 ? (
                  <Card className="p-8 border-gray-100 bg-gray-50/50 rounded-2xl shadow-sm">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-gray-400" />
                      </div>
                      <CardTitle className="text-lg mb-2 text-black font-bold">还没有准备项</CardTitle>
                      <CardDescription className="mb-4 text-gray-500 text-sm leading-relaxed">
                        创建您的第一个面试准备项
                      </CardDescription>
                      <Button
                        onClick={handleCreateNew}
                        variant="outline"
                        size="sm"
                        className="border-gray-200 hover:border-black hover:bg-black hover:text-white transition-all duration-200 rounded-xl font-medium"
                      >
                        创建第一个准备项
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <>
                    {/* 紧凑的准备项卡片 */}
                    <div className="space-y-2">
                      {preparations.slice(0, 2).map((preparation) => (
                        <Card
                          key={preparation.id}
                          className="cursor-pointer transition-all duration-300 hover:shadow-md group border-gray-100 bg-white rounded-lg overflow-hidden relative"
                          onClick={() => handleViewPreparation(preparation.id)}
                        >
                          <CardHeader className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <CardTitle className="text-sm font-semibold group-hover:text-black transition-colors text-gray-900 leading-tight truncate">
                                    {preparation.name}
                                  </CardTitle>
                                  {preparation.is_analyzing && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                      分析中
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center text-xs text-gray-400">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {formatDate(preparation.updated_at)}
                                </div>
                              </div>
                              {/* 悬浮显示的删除按钮 */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-3">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeletePreparation(preparation.id)
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>

                    {preparations.length > 2 && (
                      <Button
                        variant="ghost"
                        className="w-full py-2 text-gray-600 hover:text-black hover:bg-gray-50 rounded-xl font-medium transition-all duration-200 text-sm"
                        onClick={() => setShowAllPreparationsModal(true)}
                      >
                        查看全部 {preparations.length} 个
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>

      {/* 选择准备项模态框 */}
      {showSelectModal && (
        <SelectPreparationModal
          preparations={preparations}
          onClose={() => setShowSelectModal(false)}
          onSelect={async (preparation, language, purpose) => {
            setShowSelectModal(false)

            // 保存选择的配置到 localStorage
            if (preparation) {
              localStorage.setItem('bready-selected-preparation', JSON.stringify(preparation))
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
              navigate('/collaboration')
            } catch (error) {
              console.error('Failed to enter collaboration mode:', error)
              alert('无法启动协作模式，请检查应用权限')
            }
          }}
        />
      )}

      {/* 查看全部准备项模态框 */}
      {showAllPreparationsModal && (
        <AllPreparationsModal
          preparations={preparations}
          onClose={() => setShowAllPreparationsModal(false)}
          onDelete={handleDeletePreparation}
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

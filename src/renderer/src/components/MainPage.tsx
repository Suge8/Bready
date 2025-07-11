import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Plus, Sparkles, User, Calendar, Edit, Copy, Trash2, ArrowRight } from 'lucide-react'
import SelectPreparationModal from './SelectPreparationModal'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface Preparation {
  id: string
  name: string
  jobDescription: string
  resume?: string
  createdAt: string
  updatedAt: string
}

interface MainPageProps {
  preparations: Preparation[]
  setPreparations: React.Dispatch<React.SetStateAction<Preparation[]>>
}

const MainPage: React.FC<MainPageProps> = ({ preparations, setPreparations }) => {
  const navigate = useNavigate()
  const [showSelectModal, setShowSelectModal] = useState(false)

  const handleStartInterview = () => {
    setShowSelectModal(true)
  }

  const handleCreateNew = () => {
    navigate('/create-preparation')
  }

  const handleEditPreparation = (id: string) => {
    navigate(`/edit-preparation/${id}`)
  }

  const handleCopyPreparation = (preparation: Preparation) => {
    const newPreparation = {
      ...preparation,
      id: Date.now().toString(),
      name: `${preparation.name} (副本)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    const updatedPreparations = [...preparations, newPreparation]
    setPreparations(updatedPreparations)
    localStorage.setItem('bready-preparations', JSON.stringify(updatedPreparations))
  }

  const handleDeletePreparation = (id: string) => {
    if (confirm('确定要删除这个准备项吗？此操作无法撤销。')) {
      const updatedPreparations = preparations.filter(p => p.id !== id)
      setPreparations(updatedPreparations)
      localStorage.setItem('bready-preparations', JSON.stringify(updatedPreparations))
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
    <div className="min-h-screen bg-white">
      {/* 顶部导航 */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-black">面宝</h1>
          </div>
          <Button variant="ghost" size="icon">
            <User className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* 左侧：开始按钮 */}
          <div className="lg:col-span-2">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-bold text-black mb-6 leading-tight">
                准备好开始面试了吗？
              </h1>
              <p className="text-xl text-gray-600 mb-12 leading-relaxed">
                选择一个准备项，启动 AI 协作模式，让面试变得更加自信
              </p>

              <Button
                onClick={handleStartInterview}
                size="lg"
                className="h-14 px-8 text-base font-medium group shadow-lg hover:shadow-xl"
              >
                <Play className="mr-3 w-5 h-5 group-hover:scale-110 transition-transform" />
                开始面试协作
                <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          {/* 右侧：我的准备 */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-black">我的准备</h2>
              <Button
                onClick={handleCreateNew}
                variant="outline"
                size="sm"
                className="border-gray-200 hover:border-gray-300"
              >
                <Plus className="mr-2 w-4 h-4" />
                新建
              </Button>
            </div>

            {/* 准备项列表 */}
            <div className="space-y-4">
              {preparations.length === 0 ? (
                <Card className="p-8 border-gray-200">
                  <div className="text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <CardTitle className="text-lg mb-2 text-black">还没有准备项</CardTitle>
                    <CardDescription className="mb-4 text-gray-600">
                      创建您的第一个面试准备项，开始您的面试之旅
                    </CardDescription>
                    <Button
                      onClick={handleCreateNew}
                      variant="outline"
                      size="sm"
                      className="border-gray-200 hover:border-gray-300"
                    >
                      创建第一个准备项
                    </Button>
                  </div>
                </Card>
              ) : (
                preparations.slice(0, 2).map((preparation) => (
                  <Card
                    key={preparation.id}
                    className="cursor-pointer transition-all hover:shadow-lg group border-gray-200"
                    onClick={() => handleEditPreparation(preparation.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg group-hover:text-gray-700 transition-colors text-black">
                          {preparation.name}
                        </CardTitle>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditPreparation(preparation.id)
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopyPreparation(preparation)
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeletePreparation(preparation.id)
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(preparation.updatedAt)}
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}

              {preparations.length > 2 && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {/* TODO: 实现查看全部功能 */}}
                >
                  查看全部 ({preparations.length} 个准备项)
                </Button>
              )}
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
              const success = await window.bready.enterCollaborationMode()
              console.log('Enter collaboration mode result:', success)
              if (success) {
                navigate('/collaboration')
              } else {
                throw new Error('Failed to enter collaboration mode')
              }
            } catch (error) {
              console.error('Failed to enter collaboration mode:', error)
              alert('无法启动协作模式，请检查应用权限')
            }
          }}
        />
      )}
    </div>
  )
}

export default MainPage

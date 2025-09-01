import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Star, TrendingUp, AlertTriangle, Lightbulb, Target, Edit } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { type Preparation } from '../lib/supabase'

interface PreparationDetailPageProps {
  preparations: Preparation[]
}

const PreparationDetailPage: React.FC<PreparationDetailPageProps> = ({ preparations }) => {
  const navigate = useNavigate()
  const { id } = useParams()
  
  const preparation = preparations.find(p => p.id === id)

  if (!preparation) {
    return (
      <div className="min-h-screen bg-gray-50/30 flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardTitle className="text-xl mb-4">准备项未找到</CardTitle>
          <Button onClick={() => navigate('/')}>返回主页</Button>
        </Card>
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200'
    if (score >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* 顶部拖拽区域和返回按钮 */}
      <div className="h-8 w-full relative" style={{ WebkitAppRegion: 'drag' } as any}>
        <button
          onClick={() => navigate('/')}
          className="absolute left-17 top-0.5 text-gray-600 hover:text-black transition-all duration-200 hover:bg-gray-50 p-2 rounded-lg"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* 编辑按钮 */}
      <div className="px-4 py-2 flex justify-end">
        <Button
          onClick={() => navigate(`/edit-preparation/${id}`)}
          className="bg-black hover:bg-gray-900 text-white rounded-lg text-sm px-4 py-2"
        >
          <Edit className="w-3 h-3 mr-1" />
          编辑
        </Button>
      </div>

      {/* 主要内容 - 左右分栏布局 */}
      <main className="px-4 pb-4" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="grid grid-cols-2 gap-4 h-full">
          {/* 左侧：基本信息 */}
          <div className="space-y-3">
            {/* 准备名称 */}
            <Card className="border-gray-100 shadow-sm rounded-lg bg-white">
              <CardContent className="p-3">
                <h2 className="text-lg font-bold text-black mb-1">{preparation.name}</h2>
                <p className="text-xs text-gray-500">
                  创建于 {new Date(preparation.created_at).toLocaleDateString('zh-CN')}
                  {preparation.updated_at !== preparation.created_at && (
                    <span> · 更新于 {new Date(preparation.updated_at).toLocaleDateString('zh-CN')}</span>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* 岗位描述 */}
            <Card className="border-gray-100 shadow-sm rounded-lg bg-white flex-1">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-semibold text-black">岗位描述</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="bg-gray-50 p-2 rounded text-gray-700 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {preparation.job_description}
                </div>
              </CardContent>
            </Card>

            {/* 个人简历 */}
            {preparation.resume && (
              <Card className="border-gray-100 shadow-sm rounded-lg bg-white flex-1">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm font-semibold text-black">个人简历</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="bg-gray-50 p-2 rounded text-gray-700 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {preparation.resume}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：AI 分析报告 */}
          <div className="space-y-3">
            {preparation.analysis ? (
              <>
                {/* 匹配度评分 */}
                <Card className={`border rounded-lg ${getScoreBgColor(preparation.analysis.matchScore)}`}>
                  <CardContent className="p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Target className="w-4 h-4 text-gray-600 mr-1" />
                      <h3 className="text-sm font-bold text-black">匹配度评分</h3>
                    </div>
                    <div className={`text-2xl font-bold ${getScoreColor(preparation.analysis.matchScore)}`}>
                      {preparation.analysis.matchScore}
                    </div>
                    <p className="text-xs text-gray-600">满分 100 分</p>
                  </CardContent>
                </Card>

                {/* 优势分析 */}
                <Card className="border-gray-100 shadow-sm rounded-lg bg-white">
                  <CardHeader className="bg-green-50 p-2 border-b border-green-100">
                    <div className="flex items-center">
                      <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
                      <CardTitle className="text-xs font-bold text-green-800">优势分析</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2">
                    <ul className="space-y-1 max-h-24 overflow-y-auto">
                      {(preparation.analysis.strengths || []).map((strength, index) => (
                        <li key={index} className="flex items-start">
                          <Star className="w-2 h-2 text-green-500 mr-1 mt-1 flex-shrink-0" />
                          <span className="text-gray-700 text-xs leading-tight">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* 需要改进 */}
                <Card className="border-gray-100 shadow-sm rounded-lg bg-white">
                  <CardHeader className="bg-orange-50 p-2 border-b border-orange-100">
                    <div className="flex items-center">
                      <AlertTriangle className="w-3 h-3 text-orange-600 mr-1" />
                      <CardTitle className="text-xs font-bold text-orange-800">需要改进</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2">
                    <ul className="space-y-1 max-h-24 overflow-y-auto">
                      {(preparation.analysis.weaknesses || []).map((weakness, index) => (
                        <li key={index} className="flex items-start">
                          <AlertTriangle className="w-2 h-2 text-orange-500 mr-1 mt-1 flex-shrink-0" />
                          <span className="text-gray-700 text-xs leading-tight">{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* 面试建议 */}
                <Card className="border-gray-100 shadow-sm rounded-lg bg-white flex-1">
                  <CardHeader className="bg-blue-50 p-2 border-b border-blue-100">
                    <div className="flex items-center">
                      <Lightbulb className="w-3 h-3 text-blue-600 mr-1" />
                      <CardTitle className="text-xs font-bold text-blue-800">面试建议</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2">
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                      {(preparation.analysis.suggestions || []).map((suggestion, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-3 h-3 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mr-1 mt-0.5 flex-shrink-0">
                            {index + 1}
                          </div>
                          <span className="text-gray-700 text-xs leading-tight">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* 重新分析按钮 */}
                <Card className="border-gray-100 shadow-sm rounded-lg bg-white">
                  <CardContent className="p-3 text-center">
                    <Button
                      onClick={() => navigate(`/edit-preparation/${id}`)}
                      variant="outline"
                      className="w-full text-xs px-3 py-2 border-gray-200 hover:bg-gray-50"
                    >
                      重新分析
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* 暂无分析 */
              <Card className="border-gray-100 shadow-sm rounded-lg bg-white h-full flex items-center justify-center">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <CardTitle className="text-sm mb-2 text-gray-600">暂未AI分析</CardTitle>
                  <CardDescription className="mb-3 text-gray-500 text-xs">
                    点击下方按钮进行AI分析
                  </CardDescription>
                  <Button
                    onClick={() => navigate(`/edit-preparation/${id}`)}
                    className="bg-black hover:bg-gray-900 text-white rounded-lg text-xs px-3 py-1"
                  >
                    分析
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default PreparationDetailPage

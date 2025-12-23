import React, { useState } from 'react'
import { ArrowLeft, Target, TrendingUp, AlertTriangle, Lightbulb, Edit, Calendar, Clock, Download, Printer, Share2, Loader2, FileText, User, Brain } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { ToastNotification } from './ui/notifications'
import { type Preparation } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'

interface PreparationDetailPageProps {
  preparations: Preparation[]
}

const PreparationDetailPage: React.FC<PreparationDetailPageProps> = ({ preparations }) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const preparation = preparations.find(p => p.id === id)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  if (!preparation) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-white dark:bg-black flex items-center justify-center">
        <Card className="p-8 text-center max-w-md w-full mx-4 border-gray-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-sm">
          <CardTitle className="text-xl mb-4 text-black dark:text-white">准备项未找到</CardTitle>
          <div className="mb-6 text-gray-600 dark:text-gray-400">
            抱歉，未找到您请求的准备项。
          </div>
          <Button onClick={() => navigate('/')} className="w-full cursor-pointer">
            返回主页
          </Button>
        </Card>
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleEdit = () => {
    navigate(`/edit-preparation/${preparation.id}`)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      let reportContent = `# 面试准备分析报告\n\n`
      reportContent += `## 基本信息\n`
      reportContent += `- 准备名称: ${preparation.name}\n`
      reportContent += `- 创建时间: ${formatDate(preparation.created_at)}\n`
      reportContent += `- 更新时间: ${formatDate(preparation.updated_at)}\n\n`

      if (preparation.analysis) {
        reportContent += `## AI分析结果\n`
        reportContent += `### 匹配度评分: ${preparation.analysis.matchScore}/100\n\n`

        reportContent += `### 优势分析\n`
        preparation.analysis.strengths.forEach((strength: string, index: number) => {
          reportContent += `${index + 1}. ${strength}\n`
        })
        reportContent += `\n`

        reportContent += `### 需要改进\n`
        preparation.analysis.weaknesses.forEach((weakness: string, index: number) => {
          reportContent += `${index + 1}. ${weakness}\n`
        })
        reportContent += `\n`

        reportContent += `### 面试建议\n`
        preparation.analysis.suggestions.forEach((suggestion: string, index: number) => {
          reportContent += `${index + 1}. ${suggestion}\n`
        })
      }

      const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `面试准备_${preparation.name.replace(/\s+/g, '_')}_分析报告.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast('报告导出成功', 'success')
    } catch (error) {
      console.error('Export failed:', error)
      showToast('报告导出失败', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `面试准备: ${preparation.name}`,
          text: `查看我的面试准备分析: ${preparation.name}`,
          url: window.location.href
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        showToast('链接已复制到剪贴板', 'success')
      }
    } catch (error) {
      console.error('Share failed:', error)
      showToast('分享失败', 'error')
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-white dark:bg-black print:bg-white print:text-black flex flex-col relative transition-colors duration-300">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-blue-100/40 to-transparent dark:from-blue-900/20 dark:to-transparent rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-t from-purple-100/40 to-transparent dark:from-purple-900/20 dark:to-transparent rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Top Header - Matching CollaborationMode height and positioning */}
      <div className="w-full bg-transparent z-50 flex-shrink-0" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="h-8 w-full relative flex items-center px-16">
          <button
            onClick={() => navigate('/')}
            className="p-1 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white transition-all duration-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer group"
            style={{ marginLeft: process.platform === 'darwin' ? '90px' : '0', WebkitAppRegion: 'no-drag' } as any}
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="sr-only">返回</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-6 pt-2 z-10">
        <div className="max-w-7xl mx-auto">

          {/* Page Title & Actions - Compact Header */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
                {preparation.name}
              </h1>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1 opacity-70" />
                  <span>{formatDate(preparation.created_at)}</span>
                </div>
                {preparation.updated_at !== preparation.created_at && (
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1 opacity-70" />
                    <span>更新 {formatDate(preparation.updated_at)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={handleEdit}
                variant="outline"
                size="md"
                className="h-9 text-sm border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-lg shadow-sm cursor-pointer"
              >
                <Edit className="w-4 h-4 mr-1.5" />
                编辑
              </Button>
              <div className="flex items-center gap-0.5 border-l border-gray-200 dark:border-zinc-800 pl-2 ml-1">
                <Button
                  onClick={handleExport}
                  variant="ghost"
                  disabled={isExporting}
                  className="h-9 w-9 !p-0 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  {isExporting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Download size={18} />
                  )}
                </Button>
                <Button
                  onClick={handlePrint}
                  variant="ghost"
                  className="h-9 w-9 !p-0 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Printer size={18} />
                </Button>
                <Button
                  onClick={handleShare}
                  variant="ghost"
                  className="h-9 w-9 !p-0 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Share2 size={18} />
                </Button>
              </div>
            </div>
          </div>

          {/* Score Banner - Full Width on Top */}
          {preparation.analysis && (
            <Card className="mb-4 border-gray-100 dark:border-zinc-800 shadow-md bg-gradient-to-r from-white via-white to-gray-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800 backdrop-blur-md overflow-hidden relative">
              <div className={`absolute top-0 left-0 w-full h-1 ${getScoreBgColor(preparation.analysis.matchScore)}`} />
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Target className="w-5 h-5" />
                    <span className="text-sm font-medium">岗位匹配度</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-bold tracking-tighter ${getScoreColor(preparation.analysis.matchScore)}`}>
                      {preparation.analysis.matchScore}
                    </span>
                    <span className="text-sm text-gray-400 dark:text-gray-500">/ 100</span>
                  </div>
                </div>
                <div className="hidden sm:block w-48 md:w-64 bg-gray-100 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${getScoreBgColor(preparation.analysis.matchScore)}`}
                    style={{ width: `${preparation.analysis.matchScore}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Grid - Responsive 3-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Job Description - Takes 1 column on lg */}
            <Card className="border-gray-100 dark:border-zinc-800 shadow-sm bg-white/90 dark:bg-zinc-900/70 backdrop-blur-sm hover:shadow-md transition-shadow flex flex-col">
              <CardHeader className="p-3 pb-2 border-b border-gray-100 dark:border-zinc-800">
                <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  岗位描述
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 flex-1 overflow-hidden">
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed line-clamp-[12] lg:line-clamp-[18]">
                  {preparation.job_description}
                </div>
              </CardContent>
            </Card>

            {/* Resume - Takes 1 column on lg */}
            <Card className="border-gray-100 dark:border-zinc-800 shadow-sm bg-white/90 dark:bg-zinc-900/70 backdrop-blur-sm hover:shadow-md transition-shadow flex flex-col">
              <CardHeader className="p-3 pb-2 border-b border-gray-100 dark:border-zinc-800">
                <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  个人简历
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 flex-1 overflow-hidden">
                {preparation.resume ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed line-clamp-[12] lg:line-clamp-[18]">
                    {preparation.resume}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500 h-full">
                    <FileText className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm mb-2">未上传简历</p>
                    <Button variant="link" onClick={handleEdit} className="text-blue-500 text-sm h-auto p-0 cursor-pointer">去添加</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Analysis - Takes 1 column on lg, stacked cards */}
            <div className="flex flex-col gap-3">
              {preparation.analysis ? (
                <>
                  {/* Strengths */}
                  <Card className="border-gray-100 dark:border-zinc-800 shadow-sm bg-white/90 dark:bg-zinc-900/70 backdrop-blur-sm hover:shadow-md transition-all">
                    <CardHeader className="bg-green-50 dark:bg-green-900/20 p-2.5 px-3 border-b border-green-100 dark:border-green-800/30">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-semibold">
                        <TrendingUp className="w-4 h-4" />
                        <span>核心优势</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      <ul className="space-y-2">
                        {preparation.analysis.strengths.slice(0, 3).map((strength: string, index: number) => (
                          <li key={index} className="flex items-start text-sm">
                            <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-green-600 dark:text-green-400">{index + 1}</span>
                            </div>
                            <span className="text-gray-600 dark:text-gray-300 leading-relaxed">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Weaknesses */}
                  <Card className="border-gray-100 dark:border-zinc-800 shadow-sm bg-white/90 dark:bg-zinc-900/70 backdrop-blur-sm hover:shadow-md transition-all">
                    <CardHeader className="bg-orange-50 dark:bg-orange-900/20 p-2.5 px-3 border-b border-orange-100 dark:border-orange-800/30">
                      <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 text-sm font-semibold">
                        <AlertTriangle className="w-4 h-4" />
                        <span>改进空间</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      <ul className="space-y-2">
                        {preparation.analysis.weaknesses.slice(0, 3).map((weakness: string, index: number) => (
                          <li key={index} className="flex items-start text-sm">
                            <div className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{index + 1}</span>
                            </div>
                            <span className="text-gray-600 dark:text-gray-300 leading-relaxed">{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Suggestions */}
                  <Card className="border-gray-100 dark:border-zinc-800 shadow-sm bg-white/90 dark:bg-zinc-900/70 backdrop-blur-sm hover:shadow-md transition-all">
                    <CardHeader className="bg-blue-50 dark:bg-blue-900/20 p-2.5 px-3 border-b border-blue-100 dark:border-blue-800/30">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-sm font-semibold">
                        <Lightbulb className="w-4 h-4" />
                        <span>面试建议</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      <ul className="space-y-2">
                        {preparation.analysis.suggestions.slice(0, 3).map((suggestion: string, index: number) => (
                          <li key={index} className="flex items-start text-sm">
                            <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{index + 1}</span>
                            </div>
                            <span className="text-gray-600 dark:text-gray-300 leading-relaxed">{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </>
              ) : (
                /* No Analysis State */
                <Card className="border-dashed border-2 border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-900/30 flex flex-col items-center justify-center p-8 text-center h-full min-h-[200px]">
                  <div className="w-14 h-14 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <Brain className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">暂无 AI 分析</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 max-w-[200px]">
                    完善信息后获取 AI 报告
                  </p>
                  <Button onClick={handleEdit} size="sm" className="h-9 text-sm bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-gray-100 cursor-pointer">
                    开始分析
                  </Button>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Toast通知 */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default PreparationDetailPage
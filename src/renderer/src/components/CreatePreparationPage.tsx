import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Upload, FileText, Loader2, Check, AlertCircle, Calendar, User, Brain, Mic, Volume2, Settings, RefreshCw, Wifi, WifiOff, Play, Pause, Square, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { SmartFormValidation, AutoSaveForm } from './ui/form-enhancements'
import { SkeletonLoader } from './ui/loading-states'
import { ToastNotification } from './ui/notifications'
import { preparationService, type Preparation } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface CreatePreparationPageProps {
  preparations: Preparation[]
  setPreparations: React.Dispatch<React.SetStateAction<Preparation[]>>
  onReloadData: () => Promise<void>
}

const CreatePreparationPage: React.FC<CreatePreparationPageProps> = ({
  preparations,
  setPreparations,
  onReloadData
}) => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const isEditing = !!id

  const [name, setName] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [resume, setResume] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isEditing && id) {
      const preparation = preparations.find(p => p.id === id)
      if (preparation) {
        setName(preparation.name)
        setJobDescription(preparation.job_description)
        setResume(preparation.resume || '')
        setAnalysisResult(preparation.analysis || null)
      }
    }
  }, [isEditing, id, preparations])

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setResume(content)
        showToast('文件上传成功', 'success')
      }
      reader.onerror = () => {
        showToast('文件读取失败', 'error')
      }
      reader.readAsText(file)
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !jobDescription.trim()) {
      showToast('请填写准备名称和岗位信息', 'error')
      return
    }

    setIsSaving(true)
    try {
      const preparationData = {
        name: name.trim(),
        job_description: jobDescription.trim(),
        resume: resume.trim() || undefined,
        analysis: analysisResult,
        user_id: user?.id || ''
      }

      let savedPreparation: Preparation
      if (isEditing && id) {
        savedPreparation = await preparationService.update(id, preparationData)
        const updatedPreparations = preparations.map(p =>
          p.id === id ? savedPreparation : p
        )
        setPreparations(updatedPreparations)
        showToast('更新成功', 'success')
      } else {
        savedPreparation = await preparationService.create(preparationData)
        setPreparations([...preparations, savedPreparation])
        showToast('创建成功', 'success')
      }

      await onReloadData()
      navigate(`/preparation/${savedPreparation.id}`)
    } catch (error) {
      console.error('Save failed:', error)
      showToast('保存失败，请稍后重试', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAnalyze = async () => {
    if (!name.trim() || !jobDescription.trim()) {
      showToast('请填写准备名称和岗位信息', 'error')
      return
    }

    setIsAnalyzing(true)
    try {
      // 保存准备项并标记为正在分析
      const preparationData = {
        name: name.trim(),
        job_description: jobDescription.trim(),
        resume: resume.trim() || undefined,
        is_analyzing: true,
        user_id: user?.id || ''
      }

      let savedPreparation: Preparation
      if (isEditing && id) {
        savedPreparation = await preparationService.update(id, preparationData)
        const updatedPreparations = preparations.map(p =>
          p.id === id ? savedPreparation : p
        )
        setPreparations(updatedPreparations)
      } else {
        savedPreparation = await preparationService.create(preparationData)
        setPreparations([...preparations, savedPreparation])
      }

      await onReloadData()

      // 调用 AI 分析
      let analysisResult;
      if (window.bready && window.bready.analyzePreparation) {
        analysisResult = await window.bready.analyzePreparation({
          name: name.trim(),
          jobDescription: jobDescription.trim(),
          resume: resume.trim() || undefined
        })
      } else {
        // 开发环境模拟数据
        await new Promise(resolve => setTimeout(resolve, 3000))
        analysisResult = {
          success: true,
          analysis: {
            matchScore: 85,
            strengths: [
              '技术栈匹配度高，React和TypeScript经验符合岗位要求',
              '3年工作经验满足岗位基本要求',
              '具备移动端和PC端开发经验，技能面较广'
            ],
            weaknesses: [
              '缺少大型项目架构设计经验',
              '团队协作和项目管理经验描述不够详细',
              '对新技术的学习和应用能力需要进一步体现'
            ],
            suggestions: [
              '准备具体的项目案例，重点描述技术难点和解决方案',
              '强调团队协作经验，如代码review、技术分享等',
              '展示对前端工程化工具的深度理解和实践经验',
              '准备关于性能优化、用户体验提升的具体案例'
            ],
            systemPrompt: 'mock-system-prompt'
          }
        }
      }

      if (!analysisResult.success) {
        showToast(`AI 分析失败: ${analysisResult.error}`, 'error')
        setIsAnalyzing(false)
        return
      }

      // 更新准备项，添加分析结果并移除分析状态
      const finalPreparationData = {
        name: name.trim(),
        job_description: jobDescription.trim(),
        resume: resume.trim() || undefined,
        analysis: analysisResult.analysis,
        is_analyzing: false
      }

      let finalSavedPreparation: Preparation
      if (isEditing && id) {
        finalSavedPreparation = await preparationService.update(id, finalPreparationData)
        const updatedPreparations = preparations.map(p =>
          p.id === id ? finalSavedPreparation : p
        )
        setPreparations(updatedPreparations)
      } else {
        finalSavedPreparation = await preparationService.update(savedPreparation.id, finalPreparationData)
        const updatedPreparations = preparations.map(p =>
          p.id === savedPreparation.id ? finalSavedPreparation : p
        )
        setPreparations(updatedPreparations)
      }

      await onReloadData()
      setAnalysisResult(analysisResult.analysis)
      setIsAnalyzing(false)
      showToast('AI分析完成', 'success')
    } catch (error) {
      console.error('Analysis failed:', error)
      showToast('AI 分析过程中出现错误，请稍后重试', 'error')
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-white dark:bg-black flex flex-col relative transition-colors duration-300">
      {/* 背景光晕效果 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-gray-100/50 to-transparent dark:from-zinc-900/30 dark:to-transparent rounded-[100%] blur-[100px] pointer-events-none z-0" />

      {/* 顶部拖拽区域和返回按钮 */}
      <div className="w-full bg-transparent z-50 flex-shrink-0" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="h-12 w-full relative flex items-center px-16 pt-2">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white transition-all duration-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer group"
            style={{ marginLeft: process.platform === 'darwin' ? '90px' : '0', WebkitAppRegion: 'no-drag' } as any}
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-y-auto p-6 z-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-black dark:text-white mb-2">
              {isEditing ? '编辑准备项' : '创建面试准备'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isEditing ? '修改您的面试准备信息' : '为您的面试做好充分准备'}
            </p>
          </div>

          <AutoSaveForm
            formData={{ name, jobDescription, resume }}
            onFormChange={() => { }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左侧：基本信息 */}
              <div className="space-y-6">
                {/* 准备名称 */}
                <Card className="border-gray-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      准备名称
                    </CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">
                      公司-岗位，如字节跳动-销售
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SmartFormValidation
                      value={name}
                      onChange={setName}
                      name="name"
                      label=""
                      placeholder="公司-岗位，如字节跳动-销售"
                      required
                      maxLength={50}
                    />
                  </CardContent>
                </Card>

                {/* 岗位信息 */}
                <Card className="border-gray-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      岗位信息 (JD)
                    </CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">
                      请粘贴完整的岗位描述，包括职责要求、技能要求等
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        岗位描述
                      </label>
                      <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="请在此处粘贴岗位描述..."
                        className="w-full h-40 px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 focus:border-gray-400 dark:focus:border-zinc-500 bg-white dark:bg-black/20 text-gray-900 dark:text-white resize-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 右侧：简历和分析 */}
              <div className="space-y-6">
                {/* 个人简历上传区域 */}
                <Card className="border-gray-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      个人简历 (可选)
                    </CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">
                      上传或粘贴您的简历内容
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 文件上传 */}
                      <div className="border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl p-6 hover:border-gray-400 dark:hover:border-zinc-500 hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-all group">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          </div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            点击上传简历文件
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                            支持 .pdf, .doc, .docx, .txt
                          </p>
                          <label className="cursor-pointer inline-block">
                            <span className="hidden">选择文件</span>
                            <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">
                              选择文件
                            </div>
                            <input
                              type="file"
                              accept=".txt,.pdf,.doc,.docx"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                          {uploadedFile && (
                            <div className="flex items-center justify-center mt-3 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full inline-flex">
                              <Check className="w-3 h-3 mr-1" />
                              已上传: {uploadedFile.name}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AI分析输入框 */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          或直接粘贴简历内容
                        </label>
                        <textarea
                          value={resume}
                          onChange={(e) => setResume(e.target.value)}
                          placeholder="直接粘贴简历内容或其他相关信息..."
                          className="w-full h-32 px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 focus:border-gray-400 dark:focus:border-zinc-500 bg-white dark:bg-black/20 text-gray-900 dark:text-white resize-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI 分析结果 */}
                <Card className="border-gray-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <Brain className="w-5 h-5 mr-2 text-blue-500" />
                      AI 分析
                    </CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">
                      基于您的信息进行智能分析
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analysisResult ? (
                      <div className="space-y-4">
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              匹配度评分
                            </span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {analysisResult.matchScore}
                            </span>
                          </div>
                          <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 dark:bg-blue-400 h-1.5 rounded-full shadow-sm"
                              style={{ width: `${analysisResult.matchScore}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">优势</h4>
                            <ul className="text-gray-600 dark:text-gray-400 space-y-2">
                              {analysisResult.strengths.slice(0, 2).map((strength: string, index: number) => (
                                <li key={index} className="flex items-start">
                                  <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-1.5 mt-0.5 flex-shrink-0">
                                    <Check className="w-2.5 h-2.5 text-green-600 dark:text-green-400" />
                                  </div>
                                  <span className="leading-tight">{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">改进建议</h4>
                            <ul className="text-gray-600 dark:text-gray-400 space-y-2">
                              {analysisResult.suggestions.slice(0, 2).map((suggestion: string, index: number) => (
                                <li key={index} className="flex items-start">
                                  <div className="w-4 h-4 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mr-1.5 mt-0.5 flex-shrink-0">
                                    <AlertCircle className="w-2.5 h-2.5 text-orange-600 dark:text-orange-400" />
                                  </div>
                                  <span className="leading-tight">{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="w-12 h-12 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Brain className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          点击下方按钮进行AI分析
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 操作按钮 */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !name.trim() || !jobDescription.trim()}
                    variant="outline"
                    className="flex-1 h-11 border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-white rounded-xl font-medium transition-all"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        保存
                      </>
                    )}
                  </Button>



                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || (!analysisResult && (!name.trim() || !jobDescription.trim()))}
                    className="flex-1 h-11 bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-200 dark:text-black rounded-xl font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        分析中...
                      </>
                    ) : analysisResult ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        重新分析
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        AI分析
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </AutoSaveForm>

          {/* Toast通知 */}
          {toast && (
            <ToastNotification
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </div>
      </div >
    </div >
  )
}

export default CreatePreparationPage
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Upload, FileText, Loader2, Check } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import AnalysisReportModal from './AnalysisReportModal'
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)

  useEffect(() => {
    if (isEditing && id) {
      const preparation = preparations.find(p => p.id === id)
      if (preparation) {
        setName(preparation.name)
        setJobDescription(preparation.job_description)
        setResume(preparation.resume || '')
        // 如果有分析结果，也加载它
        if (preparation.analysis) {
          setAnalysisResult(preparation.analysis)
        }
      }
    }
  }, [isEditing, id, preparations])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      // 这里可以添加文件读取逻辑
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setResume(content)
      }
      reader.readAsText(file)
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !jobDescription.trim()) {
      alert('请填写准备名称和岗位信息')
      return
    }

    try {
      const preparationData = {
        name: name.trim(),
        job_description: jobDescription.trim(),
        resume: resume.trim() || undefined,
        analysis: analysisResult, // 保持现有的分析结果
        user_id: user?.id || ''
      }

      let savedPreparation: Preparation
      if (isEditing && id) {
        // 更新现有准备项
        savedPreparation = await preparationService.update(id, preparationData)
        const updatedPreparations = preparations.map(p =>
          p.id === id ? savedPreparation : p
        )
        setPreparations(updatedPreparations)
      } else {
        // 创建新准备项
        savedPreparation = await preparationService.create(preparationData)
        setPreparations([...preparations, savedPreparation])
      }

      // 重新加载数据以确保同步
      await onReloadData()

      // 如果是编辑模式，保存后返回主页
      if (isEditing) {
        navigate('/')
      }
    } catch (error) {
      console.error('Failed to save preparation:', error)
      alert('保存失败，请稍后重试')
    }
  }

  const handleAnalyze = async () => {
    if (!name.trim() || !jobDescription.trim()) {
      alert('请填写准备名称和岗位信息')
      return
    }

    setIsAnalyzing(true)

    try {
      // 首先保存准备项并标记为正在分析
      const preparationData = {
        name: name.trim(),
        job_description: jobDescription.trim(),
        resume: resume.trim() || undefined,
        is_analyzing: true,
        user_id: user?.id || ''
      }

      let savedPreparation: Preparation
      if (isEditing && id) {
        // 更新现有准备项
        savedPreparation = await preparationService.update(id, preparationData)
        const updatedPreparations = preparations.map(p =>
          p.id === id ? savedPreparation : p
        )
        setPreparations(updatedPreparations)
      } else {
        // 创建新准备项
        savedPreparation = await preparationService.create(preparationData)
        setPreparations([...preparations, savedPreparation])
      }

      // 重新加载数据以确保同步
      await onReloadData()
      let analysisResult;

      // 检查是否在 Electron 环境中
      if (window.bready && window.bready.analyzePreparation) {
        // 调用 AI 分析
        analysisResult = await window.bready.analyzePreparation({
          name: name.trim(),
          jobDescription: jobDescription.trim(),
          resume: resume.trim() || undefined
        })
      } else {
        // 开发环境模拟数据
        await new Promise(resolve => setTimeout(resolve, 3000)) // 模拟分析时间
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
        alert(`AI 分析失败: ${analysisResult.error}`)
        setIsAnalyzing(false)
        return
      }

      // 更新准备项，添加分析结果并移除分析状态
      const finalPreparationData = {
        name: name.trim(),
        job_description: jobDescription.trim(),
        resume: resume.trim() || undefined,
        analysis: analysisResult.analysis, // 保存 AI 分析结果
        is_analyzing: false // 分析完成
      }

      let finalSavedPreparation: Preparation
      if (isEditing && id) {
        // 更新现有准备项
        finalSavedPreparation = await preparationService.update(id, finalPreparationData)
        const updatedPreparations = preparations.map(p =>
          p.id === id ? finalSavedPreparation : p
        )
        setPreparations(updatedPreparations)
      } else {
        // 如果是新建，更新刚才创建的准备项
        finalSavedPreparation = await preparationService.update(savedPreparation.id, finalPreparationData)
        const updatedPreparations = preparations.map(p =>
          p.id === savedPreparation.id ? finalSavedPreparation : p
        )
        setPreparations(updatedPreparations)
      }

      // 重新加载数据以确保同步
      await onReloadData()

      // 保存分析结果用于显示
      setAnalysisResult(analysisResult.analysis)
      setIsAnalyzing(false)

    } catch (error) {
      console.error('Analysis failed:', error)
      alert('AI 分析过程中出现错误，请稍后重试')
      setIsAnalyzing(false)
    }
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

      {/* 主要内容区域 - 固定高度适应700px窗口 */}
      <div className="p-4" style={{ height: '660px' }}>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 h-full p-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* 左侧：基本信息 */}
            <div className="flex flex-col space-y-3">
              {/* 准备名称 */}
              <div className="space-y-2">
                <label className="text-base font-semibold text-black">
                  准备名称
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="公司-岗位，如字节跳动-销售"
                  className="border-gray-200 focus:border-black focus:ring-2 focus:ring-black/5 rounded-lg h-10 text-sm transition-all duration-200"
                />
              </div>

              {/* 岗位信息 */}
              <div className="flex-1 flex flex-col space-y-2">
                <label className="text-base font-semibold text-black">
                  岗位信息 (JD)
                </label>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="请粘贴完整的岗位描述，包括职责要求、技能要求等..."
                  className="resize-none border-gray-200 focus:border-black focus:ring-2 focus:ring-black/5 rounded-lg text-sm transition-all duration-200 flex-1"
                />
              </div>
            </div>

            {/* 右侧：简历和分析 */}
            <div className="flex flex-col space-y-3">
              {/* 个人简历上传区域 */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-black">
                  个人简历 (可选)
                </label>

                {/* 文件上传 */}
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-2 hover:border-gray-300 transition-colors">
                  <div className="text-center">
                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-600 mb-1">上传简历文件</p>
                    <label className="cursor-pointer">
                      <span className="bg-black text-white px-3 py-1 rounded text-xs hover:bg-gray-800 transition-colors">
                        选择文件
                      </span>
                      <input
                        type="file"
                        accept=".txt,.pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    {uploadedFile && (
                      <p className="text-xs text-green-600 mt-1">
                        已上传: {uploadedFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* AI分析输入框 */}
              <div className="flex-1 flex flex-col space-y-1">
                <label className="text-sm font-semibold text-black">
                  AI 分析输入
                </label>
                <Textarea
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  placeholder="直接粘贴简历内容或其他相关信息..."
                  className="resize-none border-gray-200 focus:border-black focus:ring-2 focus:ring-black/5 rounded-lg text-sm transition-all duration-200 flex-1"
                />
              </div>

              {/* 按钮区域 - 右下角 */}
              <div className="flex justify-end space-x-3">
                {isEditing && (
                  <Button
                    onClick={handleSave}
                    disabled={!name.trim() || !jobDescription.trim()}
                    variant="outline"
                    className="px-6 py-2 text-sm font-medium rounded-lg"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    保存更改
                  </Button>
                )}
                <Button
                  onClick={analysisResult ? () => setShowAnalysisModal(true) : handleAnalyze}
                  disabled={isAnalyzing || (!analysisResult && (!name.trim() || !jobDescription.trim()))}
                  className="px-6 py-2 text-sm font-medium rounded-lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      分析中...
                    </>
                  ) : analysisResult ? (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      查看结果
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {isEditing ? '重新分析' : '分析'}
                    </>
                  )}
                </Button>
              </div>

              {/* AI 处理状态提示 */}
              {isAnalyzing && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-900 mb-1">
                        AI 正在分析您的准备材料
                      </h4>
                      <p className="text-sm text-blue-700">
                        正在深度分析岗位要求与您的背景匹配度，请稍候...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 分析报告弹窗 */}
        {showAnalysisModal && analysisResult && (
          <AnalysisReportModal
            analysis={analysisResult}
            onClose={() => setShowAnalysisModal(false)}
          />
        )}
      </div>
    </div>
  )
}

export default CreatePreparationPage

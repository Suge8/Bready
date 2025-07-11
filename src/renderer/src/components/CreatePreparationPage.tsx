import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Upload, FileText, Loader2, Check } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'

interface Preparation {
  id: string
  name: string
  jobDescription: string
  resume?: string
  createdAt: string
  updatedAt: string
}

interface CreatePreparationPageProps {
  preparations: Preparation[]
  setPreparations: React.Dispatch<React.SetStateAction<Preparation[]>>
}

const CreatePreparationPage: React.FC<CreatePreparationPageProps> = ({
  preparations,
  setPreparations
}) => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [name, setName] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [resume, setResume] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  useEffect(() => {
    if (isEditing && id) {
      const preparation = preparations.find(p => p.id === id)
      if (preparation) {
        setName(preparation.name)
        setJobDescription(preparation.jobDescription)
        setResume(preparation.resume || '')
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

  const handleAnalyze = async () => {
    if (!name.trim() || !jobDescription.trim()) {
      alert('请填写准备名称和岗位信息')
      return
    }

    setIsAnalyzing(true)

    // 模拟 AI 分析过程
    await new Promise(resolve => setTimeout(resolve, 2000))

    const newPreparation: Preparation = {
      id: isEditing ? id! : Date.now().toString(),
      name: name.trim(),
      jobDescription: jobDescription.trim(),
      resume: resume.trim() || undefined,
      createdAt: isEditing 
        ? preparations.find(p => p.id === id)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    let updatedPreparations: Preparation[]
    if (isEditing) {
      updatedPreparations = preparations.map(p => 
        p.id === id ? newPreparation : p
      )
    } else {
      updatedPreparations = [...preparations, newPreparation]
    }

    setPreparations(updatedPreparations)
    localStorage.setItem('bready-preparations', JSON.stringify(updatedPreparations))

    setIsAnalyzing(false)

    // 显示成功提示并返回主页
    setTimeout(() => {
      navigate('/')
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航 */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mr-4 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <h1 className="text-xl font-semibold text-black">
            {isEditing ? '编辑面试准备' : '创建面试准备'}
          </h1>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <Card className="border-gray-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-black">
              {isEditing ? '编辑面试准备' : '创建新的面试准备'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              填写面试相关信息，AI 将为您提供个性化的面试辅助
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* 准备名称 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">
                准备名称 *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：前端工程师面试准备"
                className="border-gray-200 focus:border-black"
              />
            </div>

            {/* 岗位信息 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">
                岗位信息 (JD) *
              </label>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="请粘贴完整的岗位描述，包括职责要求、技能要求等..."
                rows={8}
                className="resize-none border-gray-200 focus:border-black"
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end">
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !name.trim() || !jobDescription.trim()}
                size="lg"
                className="shadow-lg hover:shadow-xl"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    AI正在深度分析中...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    {isEditing ? '更新准备' : '完成准备'}
                  </>
                )}
              </Button>
            </div>

            {/* AI 处理状态提示 */}
            {isAnalyzing && (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 text-black animate-spin mr-3" />
                    <div>
                      <p className="text-sm font-medium text-black">
                        AI 正在分析您的准备内容
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        正在深度分析岗位要求与您的背景匹配度，请稍候...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default CreatePreparationPage

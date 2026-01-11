import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Edit,
  Brain,
  RefreshCw,
  Loader2,
  Briefcase,
  Sparkles,
} from 'lucide-react'
import { Button } from './ui/button'
import { preparationService, type Preparation } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'
import { useToast } from '../contexts/ToastContext'
import { useTheme } from './ui/theme-provider'
import { Modal } from './ui/Modal'

interface PreparationDetailModalProps {
  preparation: Preparation
  preparations: Preparation[]
  setPreparations: React.Dispatch<React.SetStateAction<Preparation[]>>
  onReloadData: () => Promise<void>
  onClose: () => void
  onEdit: () => void
}

const PreparationDetailModal: React.FC<PreparationDetailModalProps> = ({
  preparation,
  preparations,
  setPreparations,
  onReloadData,
  onClose,
  onEdit,
}) => {
  const { t, list } = useI18n()
  const { resolvedTheme } = useTheme()
  const { showToast } = useToast()
  const [isAnalyzing, setIsAnalyzing] = useState(preparation.is_analyzing || false)
  const [currentPreparation, setCurrentPreparation] = useState(preparation)
  const [displayScore, setDisplayScore] = useState(0)
  const [cardsVisible, setCardsVisible] = useState([false, false, false, false])

  const mockStrengths = list('prepEditor.mockAnalysis.strengths')
  const mockWeaknesses = list('prepEditor.mockAnalysis.weaknesses')
  const mockSuggestions = list('prepEditor.mockAnalysis.suggestions')

  const isDarkMode = resolvedTheme === 'dark'

  useEffect(() => {
    if (currentPreparation?.analysis?.matchScore && !isAnalyzing) {
      const targetScore = currentPreparation.analysis.matchScore
      const duration = 800
      const steps = 30
      const increment = targetScore / steps
      let current = 0
      const timer = setInterval(() => {
        current += increment
        if (current >= targetScore) {
          setDisplayScore(targetScore)
          clearInterval(timer)
        } else {
          setDisplayScore(Math.floor(current))
        }
      }, duration / steps)
      return () => clearInterval(timer)
    }
  }, [currentPreparation?.analysis?.matchScore, isAnalyzing])

  useEffect(() => {
    if (currentPreparation?.analysis && !isAnalyzing) {
      setCardsVisible([false, false, false, false])
      const timers = [0, 1, 2, 3].map((index) =>
        setTimeout(
          () => {
            setCardsVisible((prev) => {
              const newState = [...prev]
              newState[index] = true
              return newState
            })
          },
          80 * index + 150,
        ),
      )
      return () => timers.forEach(clearTimeout)
    }
  }, [currentPreparation?.analysis, isAnalyzing])

  useEffect(() => {
    if (isAnalyzing) {
      setCardsVisible([false, false, false, false])
      setDisplayScore(0)
    }
  }, [isAnalyzing])

  const getScoreColor = (score: number) => {
    if (score >= 80) return isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
    if (score >= 60) return isDarkMode ? 'text-amber-400' : 'text-amber-600'
    if (score >= 40) return isDarkMode ? 'text-orange-400' : 'text-orange-600'
    return isDarkMode ? 'text-red-400' : 'text-red-600'
  }

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500'
    if (score >= 60) return 'bg-amber-500'
    if (score >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '优秀'
    if (score >= 60) return '良好'
    if (score >= 40) return '一般'
    return '待提升'
  }

  const handleAnalyze = async () => {
    const analyzingState = {
      ...currentPreparation,
      analysis: undefined,
      is_analyzing: true,
    }

    setIsAnalyzing(true)
    setCurrentPreparation(analyzingState)
    setPreparations((prev) =>
      prev.map((p) => (p.id === currentPreparation.id ? analyzingState : p)),
    )

    try {
      await preparationService.update(currentPreparation.id, { is_analyzing: true })

      let analysisResultData
      if (window.bready && window.bready.analyzePreparation) {
        analysisResultData = await window.bready.analyzePreparation({
          name: currentPreparation.name,
          jobDescription: currentPreparation.job_description,
          resume: currentPreparation.resume || undefined,
        })
        console.log('AI分析原始结果:', analysisResultData)
      } else {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        analysisResultData = {
          success: true,
          analysis: {
            matchScore: 68,
            jobRequirements: [
              '3年以上游戏渠道运营经验',
              '熟悉WeGame/应用宝等主流渠道',
              '具备数据分析和用户增长能力',
              '有完整游戏发行经验优先',
              '热爱FPS游戏并有深度体验',
            ],
            strengths: mockStrengths,
            weaknesses: mockWeaknesses,
            suggestions: mockSuggestions,
            systemPrompt: 'mock-system-prompt',
          },
        }
      }

      if (!analysisResultData.success) {
        const errorMessage = analysisResultData.error
          ? t('prepEditor.toasts.analyzeFailed', { error: analysisResultData.error })
          : t('prepEditor.toasts.analyzeError')
        showToast(errorMessage, 'error')
        setIsAnalyzing(false)
        return
      }

      const analysis = analysisResultData.analysis
      console.log('分析数据 jobRequirements:', analysis?.jobRequirements)

      const updatedPreparation = await preparationService.update(currentPreparation.id, {
        analysis: analysis,
        is_analyzing: false,
      })

      setCurrentPreparation(updatedPreparation)
      setPreparations(
        preparations.map((p) => (p.id === currentPreparation.id ? updatedPreparation : p)),
      )
      await onReloadData()
      showToast(t('prepEditor.toasts.analyzeSuccess'), 'success')
    } catch (error) {
      console.error('Analysis failed:', error)
      showToast(t('prepEditor.toasts.analyzeError'), 'error')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const cardConfigs = [
    {
      key: 'jobRequirements',
      title: '岗位需求',
      icon: Briefcase,
      gradient: isDarkMode
        ? 'from-blue-500/10 via-blue-500/5 to-transparent'
        : 'from-blue-50 to-white',
      iconBg: isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100',
      iconColor: isDarkMode ? 'text-blue-400' : 'text-blue-600',
      dotColor: isDarkMode ? 'bg-blue-400' : 'bg-blue-500',
      data: currentPreparation.analysis?.jobRequirements || [],
    },
    {
      key: 'strengths',
      title: '核心优势',
      icon: TrendingUp,
      gradient: isDarkMode
        ? 'from-emerald-500/10 via-emerald-500/5 to-transparent'
        : 'from-emerald-50 to-white',
      iconBg: isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-100',
      iconColor: isDarkMode ? 'text-emerald-400' : 'text-emerald-600',
      dotColor: isDarkMode ? 'bg-emerald-400' : 'bg-emerald-500',
      data: currentPreparation.analysis?.strengths || [],
    },
    {
      key: 'weaknesses',
      title: '改进空间',
      icon: AlertTriangle,
      gradient: isDarkMode
        ? 'from-orange-500/10 via-orange-500/5 to-transparent'
        : 'from-orange-50 to-white',
      iconBg: isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100',
      iconColor: isDarkMode ? 'text-orange-400' : 'text-orange-600',
      dotColor: isDarkMode ? 'bg-orange-400' : 'bg-orange-500',
      data: currentPreparation.analysis?.weaknesses || [],
    },
    {
      key: 'suggestions',
      title: '面试建议',
      icon: Lightbulb,
      gradient: isDarkMode
        ? 'from-violet-500/10 via-violet-500/5 to-transparent'
        : 'from-violet-50 to-white',
      iconBg: isDarkMode ? 'bg-violet-500/20' : 'bg-violet-100',
      iconColor: isDarkMode ? 'text-violet-400' : 'text-violet-600',
      dotColor: isDarkMode ? 'bg-violet-400' : 'bg-violet-500',
      data: currentPreparation.analysis?.suggestions || [],
    },
  ]

  const hasAnalysis = currentPreparation.analysis && !isAnalyzing

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      className="p-0 w-[90vw] max-w-[1100px] max-h-[88vh] relative flex flex-col"
    >
      <div className="relative flex flex-col flex-1 min-h-0">
        {/* 背景装饰 */}
        <div
          className={`absolute top-0 right-0 w-60 h-60 ${isDarkMode ? 'bg-blue-500/5' : 'bg-blue-500/10'} rounded-full blur-[80px] pointer-events-none`}
        />
        <div
          className={`absolute bottom-0 left-0 w-48 h-48 ${isDarkMode ? 'bg-purple-500/5' : 'bg-purple-500/10'} rounded-full blur-[80px] pointer-events-none`}
        />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-4 flex-shrink-0 gap-3">
          {/* 左侧：标题 */}
          <h1
            className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate flex-shrink-0 max-w-[180px]`}
          >
            {currentPreparation.name}
          </h1>

          {/* 中间：分数气泡 */}
          {hasAnalysis && (
            <div
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl ${isDarkMode ? 'bg-zinc-800/80' : 'bg-gray-100/80'} flex-shrink-0`}
            >
              <Target className={`w-3.5 h-3.5 ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`} />
              <span
                className={`text-xl font-bold ${getScoreColor(currentPreparation.analysis!.matchScore)}`}
              >
                {displayScore}
              </span>
              <span className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
                / 100
              </span>
              <div
                className={`w-16 h-1.5 rounded-full ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-200'} overflow-hidden`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getScoreBarColor(currentPreparation.analysis!.matchScore)}`}
                  style={{ width: `${displayScore}%` }}
                />
              </div>
              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${getScoreBarColor(currentPreparation.analysis!.matchScore)} text-white`}
              >
                {getScoreLabel(currentPreparation.analysis!.matchScore)}
              </span>
            </div>
          )}

          {/* 右侧：按钮 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button onClick={onEdit} size="sm" variant="outline" className="h-7 px-2.5 text-xs">
              <Edit className="w-3 h-3 mr-1" />
              {t('prep.actions.edit')}
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              size="sm"
              className="h-7 px-2.5 text-xs"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  {t('prepEditor.actions.analyzing')}
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  {currentPreparation.analysis
                    ? t('prepEditor.actions.reanalyze')
                    : t('prepEditor.actions.analyze')}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1 min-h-0 overflow-y-auto px-6 pb-6 scrollbar-thin">
          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="h-full min-h-[280px] flex items-center justify-center"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-5">
                    {/* 外圈脉冲动画 */}
                    <motion.div
                      className={`absolute inset-0 w-20 h-20 -m-2 rounded-2xl ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-500/10'}`}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                      className={`w-16 h-16 rounded-2xl ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-100'} flex items-center justify-center relative z-10`}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader2
                        className={`w-8 h-8 ${isDarkMode ? 'text-white' : 'text-gray-700'} animate-spin`}
                      />
                    </motion.div>
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], rotate: [0, 15, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Sparkles className={`w-4 h-4 text-amber-400 absolute -top-1 -right-1`} />
                    </motion.div>
                  </div>
                  <motion.h3
                    className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1.5`}
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    AI 正在分析中...
                  </motion.h3>
                  <p className={`${isDarkMode ? 'text-zinc-500' : 'text-gray-500'} text-xs`}>
                    正在根据岗位描述和简历生成分析报告
                  </p>
                </div>
              </motion.div>
            ) : hasAnalysis ? (
              <div className="grid grid-cols-2 gap-4 pt-1">
                {cardConfigs.map((config, index) => (
                  <div
                    key={config.key}
                    className={`rounded-xl bg-gradient-to-br ${config.gradient} p-4 flex flex-col transition-all duration-500 hover:scale-[1.01] min-h-[160px] ${
                      cardsVisible[index] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2.5 flex-shrink-0">
                      <div className={`p-1.5 rounded-lg ${config.iconBg}`}>
                        <config.icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
                      </div>
                      <span
                        className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}
                      >
                        {config.title}
                      </span>
                      <span
                        className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-zinc-800/80 text-zinc-400' : 'bg-white/80 text-gray-500'}`}
                      >
                        {config.data.length} 项
                      </span>
                    </div>
                    <ul className="space-y-2 flex-1 overflow-y-auto">
                      {config.data.length > 0 ? (
                        config.data.map((item: string, idx: number) => (
                          <li
                            key={idx}
                            className="flex items-start text-[13px] animate-fadeIn"
                            style={{ animationDelay: `${idx * 50 + index * 60}ms` }}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${config.dotColor} mt-1.5 mr-2 flex-shrink-0`}
                            />
                            <span
                              className={`${isDarkMode ? 'text-zinc-300' : 'text-gray-700'} leading-relaxed`}
                            >
                              {item}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li
                          className={`text-[13px] ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'} italic`}
                        >
                          {!currentPreparation.resume &&
                          ['strengths', 'weaknesses', 'suggestions'].includes(config.key)
                            ? '未提供简历'
                            : '点击"重新分析"生成内容'}
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full min-h-[250px] flex items-center justify-center">
                <div className="flex flex-col items-center text-center max-w-xs">
                  <div
                    className={`w-14 h-14 ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-100'} rounded-xl flex items-center justify-center mb-3 relative`}
                  >
                    <Brain
                      className={`w-7 h-7 ${isDarkMode ? 'text-zinc-600' : 'text-gray-400'}`}
                    />
                    <Sparkles
                      className={`w-3.5 h-3.5 ${isDarkMode ? 'text-amber-400' : 'text-amber-500'} absolute -top-1 -right-1 animate-pulse`}
                    />
                  </div>
                  <h3
                    className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1.5`}
                  >
                    {t('prep.noAnalysisTitle')}
                  </h3>
                  <p className={`${isDarkMode ? 'text-zinc-500' : 'text-gray-500'} text-xs mb-4`}>
                    {t('prep.report.completeInfo')}
                  </p>
                  <Button onClick={handleAnalyze} size="sm" className="h-8 px-4 text-xs">
                    <Brain className="w-3.5 h-3.5 mr-1.5" />
                    {t('prep.actions.startAnalysis')}
                  </Button>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-6px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; opacity: 0; }
        `}</style>
      </div>
    </Modal>
  )
}

export default PreparationDetailModal

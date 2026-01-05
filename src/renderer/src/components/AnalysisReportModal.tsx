import React from 'react'
import { Target, TrendingUp, AlertTriangle, Lightbulb, Star } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Modal } from './ui/Modal'
import { useI18n } from '../contexts/I18nContext'

interface Analysis {
  matchScore: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  systemPrompt: string
}

interface AnalysisReportModalProps {
  analysis: Analysis
  onClose: () => void
}

const AnalysisReportModal: React.FC<AnalysisReportModalProps> = ({ analysis, onClose }) => {
  const { t } = useI18n()
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400'
    if (score >= 60) return 'text-amber-600 dark:text-amber-400'
    return 'text-rose-600 dark:text-rose-400'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30'
    if (score >= 60) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30'
    return 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30'
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      className="p-0 max-w-4xl max-h-[90vh] overflow-hidden"
    >
      <div className="flex items-center justify-between p-6 border-b border-[var(--bready-border)]">
        <h2 className="text-2xl font-bold text-[var(--bready-text)]">{t('prep.report.modalTitle')}</h2>
      </div>

      <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
        <div className="space-y-6">
            {/* 匹配度评分 */}
            <Card className={`border-2 rounded-2xl ${getScoreBgColor(analysis.matchScore)}`}>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <Target className="w-8 h-8 text-[var(--bready-text-muted)] mr-3" />
                  <h3 className="text-xl font-bold text-[var(--bready-text)]">{t('prep.report.matchScore')}</h3>
                </div>
                <div className={`text-6xl font-bold ${getScoreColor(analysis.matchScore)} mb-2`}>
                  {analysis.matchScore}
                </div>
                <p className="text-[var(--bready-text-muted)]">{t('prep.report.fullScore', { count: 100 })}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 优势分析 */}
              <Card className="border border-[var(--bready-border)] shadow-lg rounded-2xl bg-[var(--bready-surface)] overflow-hidden">
                <CardHeader className="bg-emerald-50 dark:bg-emerald-900/20 p-6 border-b border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex items-center">
                    <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mr-3" />
                    <CardTitle className="text-xl font-bold text-emerald-800 dark:text-emerald-200">{t('prep.report.strengths')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-3">
                    {(analysis.strengths || []).map((strength, index) => (
                      <li key={index} className="flex items-start">
                        <Star className="w-5 h-5 text-emerald-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-[var(--bready-text)]">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* 改进建议 */}
              <Card className="border border-[var(--bready-border)] shadow-lg rounded-2xl bg-[var(--bready-surface)] overflow-hidden">
                <CardHeader className="bg-amber-50 dark:bg-amber-900/20 p-6 border-b border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-center">
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 mr-3" />
                    <CardTitle className="text-xl font-bold text-amber-800 dark:text-amber-200">{t('prep.report.weaknesses')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-3">
                    {(analysis.weaknesses || []).map((weakness, index) => (
                      <li key={index} className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-[var(--bready-text)]">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* 面试建议 */}
            <Card className="border border-[var(--bready-border)] shadow-lg rounded-2xl bg-[var(--bready-surface)] overflow-hidden">
              <CardHeader className="bg-zinc-50 dark:bg-zinc-900/30 p-6 border-b border-zinc-100 dark:border-zinc-900/40">
                <div className="flex items-center">
                  <Lightbulb className="w-6 h-6 text-zinc-600 dark:text-zinc-300 mr-3" />
                  <CardTitle className="text-xl font-bold text-[var(--bready-text)]">{t('prep.report.suggestions')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-4">
                  {(analysis.suggestions || []).map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-200 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5 flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-[var(--bready-text)]">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
        </div>
      </div>

      <div className="flex justify-end p-6 border-t border-[var(--bready-border)]">
        <Button onClick={onClose} className="px-6">
          {t('common.close')}
        </Button>
      </div>
    </Modal>
  )
}

export default AnalysisReportModal

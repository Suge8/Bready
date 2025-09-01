import React from 'react'
import { X, Target, TrendingUp, AlertTriangle, Lightbulb, Star } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-black">AI 分析报告</h2>
          <Button
            variant="ghost"
            onClick={onClose}
            className="hover:bg-gray-50 rounded-xl"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* 匹配度评分 */}
            <Card className={`border-2 rounded-2xl ${getScoreBgColor(analysis.matchScore)}`}>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <Target className="w-8 h-8 text-gray-600 mr-3" />
                  <h3 className="text-xl font-bold text-black">匹配度评分</h3>
                </div>
                <div className={`text-6xl font-bold ${getScoreColor(analysis.matchScore)} mb-2`}>
                  {analysis.matchScore}
                </div>
                <p className="text-gray-600">满分 100 分</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 优势分析 */}
              <Card className="border-gray-100 shadow-lg rounded-2xl bg-white overflow-hidden">
                <CardHeader className="bg-green-50 p-6 border-b border-green-100">
                  <div className="flex items-center">
                    <TrendingUp className="w-6 h-6 text-green-600 mr-3" />
                    <CardTitle className="text-xl font-bold text-green-800">优势分析</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-3">
                    {(analysis.strengths || []).map((strength, index) => (
                      <li key={index} className="flex items-start">
                        <Star className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* 改进建议 */}
              <Card className="border-gray-100 shadow-lg rounded-2xl bg-white overflow-hidden">
                <CardHeader className="bg-orange-50 p-6 border-b border-orange-100">
                  <div className="flex items-center">
                    <AlertTriangle className="w-6 h-6 text-orange-600 mr-3" />
                    <CardTitle className="text-xl font-bold text-orange-800">需要改进</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-3">
                    {(analysis.weaknesses || []).map((weakness, index) => (
                      <li key={index} className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-orange-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* 面试建议 */}
            <Card className="border-gray-100 shadow-lg rounded-2xl bg-white overflow-hidden">
              <CardHeader className="bg-blue-50 p-6 border-b border-blue-100">
                <div className="flex items-center">
                  <Lightbulb className="w-6 h-6 text-blue-600 mr-3" />
                  <CardTitle className="text-xl font-bold text-blue-800">面试建议</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-4">
                  {(analysis.suggestions || []).map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5 flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-gray-700">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex justify-end p-6 border-t border-gray-100">
          <Button
            onClick={onClose}
            className="bg-black hover:bg-gray-900 text-white rounded-xl px-6"
          >
            关闭
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AnalysisReportModal

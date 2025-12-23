import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { Button } from './ui/button'

interface SmartRecommendationsProps {
  onItemSelected?: (item: any) => void
}

export const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({ onItemSelected }) => {
  const [recommendations, setRecommendations] = useState<any[]>([
    {
      id: 1,
      title: '技术面试常见问题',
      description: '涵盖算法、数据结构、系统设计等技术面试高频问题',
      category: '技术面试',
      relevance: 95
    },
    {
      id: 2,
      title: '行为面试STAR法则',
      description: '教你如何用情境-任务-行动-结果的结构回答行为问题',
      category: '行为面试',
      relevance: 88
    },
    {
      id: 3,
      title: '薪资谈判技巧',
      description: '掌握薪资谈判的时机、策略和沟通技巧',
      category: '薪资谈判',
      relevance: 82
    }
  ])

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">为你推荐</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map(item => (
          <Card 
            key={item.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer dark:bg-gray-800"
            onClick={() => onItemSelected?.(item)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-gray-900 dark:text-white">{item.title}</CardTitle>
                  <CardDescription className="mt-1 dark:text-gray-400">{item.description}</CardDescription>
                </div>
                <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full dark:bg-blue-900 dark:text-blue-200">
                  {item.relevance}%
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{item.category}</span>
                <Button size="sm" variant="outline" className="text-xs">
                  查看详情
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
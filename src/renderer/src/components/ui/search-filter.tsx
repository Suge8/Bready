import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, X, Filter } from 'lucide-react'

interface SmartSearchProps {
  onSearch: (query: string) => void
  placeholder?: string
  className?: string
}

export const SmartSearch: React.FC<SmartSearchProps> = ({
  onSearch,
  placeholder = '搜索准备项...',
  className = '',
}) => {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (query.length > 2) {
      // 模拟获取搜索建议
      const mockSuggestions = [
        `${query} 面试`,
        `${query} 准备`,
        `如何准备 ${query}`,
        `${query} 岗位`,
      ]
      setSuggestions(mockSuggestions)
    } else {
      setSuggestions([])
    }
  }, [query])

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    onSearch(searchQuery)
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
        {query && (
          <button
            onClick={() => handleSearch('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-50 dark:bg-gray-800 dark:border-gray-700"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSearch(suggestion)}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
            >
              {suggestion}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  )
}

interface AdvancedFilterProps {
  onFilterChange: (filters: Record<string, any>) => void
}

export const AdvancedFilter: React.FC<AdvancedFilterProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({
    status: '',
    category: '',
  })
  const [isOpen, setIsOpen] = useState(false)

  const applyFilters = () => {
    onFilterChange(filters)
    setIsOpen(false)
  }

  const resetFilters = () => {
    setFilters({ status: '', category: '' })
    onFilterChange({ status: '', category: '' })
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
      >
        <Filter className="w-4 h-4" />
        <span>筛选</span>
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 dark:bg-gray-800 dark:border-gray-700"
        >
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">高级筛选</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                状态
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">全部状态</option>
                <option value="analyzing">分析中</option>
                <option value="completed">已完成</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                类别
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">全部类别</option>
                <option value="tech">技术岗位</option>
                <option value="sales">销售岗位</option>
                <option value="management">管理岗位</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-2 mt-4">
            <button
              onClick={resetFilters}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              重置
            </button>
            <button
              onClick={applyFilters}
              className="flex-1 px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              应用
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

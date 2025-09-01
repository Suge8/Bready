import React from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Calendar, Trash2, Edit } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card'
import { type Preparation } from '../lib/supabase'

interface AllPreparationsModalProps {
  preparations: Preparation[]
  onClose: () => void
  onDelete: (id: string) => void
}

const AllPreparationsModal: React.FC<AllPreparationsModalProps> = ({
  preparations,
  onClose,
  onDelete
}) => {
  const navigate = useNavigate()

  const handleViewPreparation = (id: string) => {
    onClose()
    navigate(`/preparation/${id}`)
  }

  const handleEditPreparation = (id: string) => {
    onClose()
    navigate(`/edit-preparation/${id}`)
  }

  const handleDeletePreparation = (id: string) => {
    if (confirm('确定要删除这个准备项吗？此操作无法撤销。')) {
      onDelete(id)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-black">我的准备项</h2>
            <p className="text-sm text-gray-500 mt-1">共 {preparations.length} 个准备项</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-gray-50 rounded-xl"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preparations.map((preparation) => (
              <Card
                key={preparation.id}
                className="cursor-pointer transition-all duration-300 hover:shadow-lg group border-gray-100 bg-white rounded-xl overflow-hidden"
                onClick={() => handleViewPreparation(preparation.id)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-base font-semibold group-hover:text-black transition-colors text-gray-900 leading-tight">
                          {preparation.name}
                        </CardTitle>
                        {preparation.is_analyzing && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            分析中
                          </div>
                        )}
                      </div>
                      <CardDescription className="text-sm text-gray-500 line-clamp-2 mb-3">
                        {preparation.job_description}
                      </CardDescription>
                      <div className="flex items-center text-xs text-gray-400">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(preparation.updated_at)}
                      </div>
                    </div>
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="flex items-center justify-end mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePreparation(preparation.id)
                      }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      删除
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AllPreparationsModal

import React, { useState, useEffect } from 'react'
import { Users, Clock, ChevronDown, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { userProfileService, type UserProfile, type UserLevel } from '../lib/supabase'
import UserLevelBadge from './UserLevelBadge'

interface AdminPanelModalProps {
  onClose: () => void
}

type TabType = 'users' | 'usage'

const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ onClose }) => {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('users')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null)

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const usersPerPage = 10

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers()
    }
  }, [activeTab])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const usersData = await userProfileService.getAllUsers()
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUserLevel = async (userId: string, newLevel: UserLevel) => {
    if (profile?.user_level !== '超级' && profile?.user_level !== '管理') {
      alert('只有管理员可以修改用户角色')
      return
    }

    setLoading(true)
    try {
      await userProfileService.updateUserLevel(userId, newLevel)
      await loadUsers() // 重新加载用户列表
      setShowRoleDropdown(null)
    } catch (error) {
      console.error('Error updating user level:', error)
      alert('更新用户角色失败')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '无'
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }



  const userLevels: UserLevel[] = ['小白', '螺丝钉', '大牛', '管理', '超级']
  const canManageUser = (targetUser: UserProfile) => {
    if (profile?.user_level === '超级') return true
    if (profile?.user_level === '管理' && targetUser.user_level !== '超级' && targetUser.user_level !== '管理') return true
    return false
  }

  const tabs = [
    { id: 'users' as TabType, label: '用户管理', icon: Users },
    { id: 'usage' as TabType, label: '使用记录', icon: Clock }
  ]

  // 分页计算
  const totalPages = Math.ceil(users.length / usersPerPage)
  const startIndex = (currentPage - 1) * usersPerPage
  const endIndex = startIndex + usersPerPage
  const currentUsers = users.slice(startIndex, endIndex)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-xl w-full max-w-4xl h-[80vh] shadow-xl animate-fade-in border border-gray-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-black">管理后台</h2>
        </div>

        {/* 标签页 */}
        <div className="flex border-b border-gray-200">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-black border-b-2 border-black'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'users' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2 admin-data-content">
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">加载中...</div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">暂无用户数据</div>
                  ) : (
                    currentUsers.map(userItem => (
                      <div key={userItem.id} className="bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium text-black text-sm truncate">
                                {userItem.full_name || userItem.username || '未命名用户'}
                              </h3>
                              <UserLevelBadge
                                level={userItem.user_level}
                                size="sm"
                                showIcon={true}
                              />
                              {userItem.id === user?.id && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-600 flex-shrink-0">
                                  当前用户
                                </span>
                              )}
                              <div className="flex-1 text-right">
                                <span className="text-xs text-gray-800 truncate">{userItem.email}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-gray-600">
                              <div>
                                <span className="font-medium">注册：</span>
                                {formatDate(userItem.created_at)}
                              </div>
                              <div>
                                <span className="font-medium">剩余：</span>
                                <span className={userItem.remaining_interview_minutes > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                  {userItem.remaining_interview_minutes}分钟
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">会员：</span>
                                {userItem.membership_expires_at ? formatDate(userItem.membership_expires_at) : '无'}
                              </div>
                            </div>
                          </div>

                          {/* 操作按钮 */}
                          {canManageUser(userItem) && userItem.id !== user?.id && (
                            <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                              {/* 角色管理 */}
                              <div className="relative">
                                <button
                                  onClick={() => setShowRoleDropdown(showRoleDropdown === userItem.id ? null : userItem.id)}
                                  className="flex items-center space-x-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs hover:bg-gray-50 transition-colors"
                                >
                                  <span>修改角色</span>
                                  <ChevronDown className="w-3 h-3" />
                                </button>

                                {showRoleDropdown === userItem.id && (
                                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-20">
                                    {userLevels.map(level => {
                                      // 管理员不能设置超级等级
                                      if (profile?.user_level === '管理' && (level === '超级' || level === '管理')) {
                                        return null
                                      }

                                      return (
                                        <button
                                          key={level}
                                          onClick={() => handleUpdateUserLevel(userItem.id, level)}
                                          className={`w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                                            userItem.user_level === level ? 'bg-gray-100 font-medium' : ''
                                          }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span>{level}</span>
                                            {userItem.user_level === level && <Check className="w-3 h-3" />}
                                          </div>
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 分页控件和总用户数 */}
              <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {users.length > usersPerPage ? (
                      <>显示 {startIndex + 1}-{Math.min(endIndex, users.length)} 条，共 {users.length} 条</>
                    ) : (
                      <>共 {users.length} 位用户</>
                    )}
                  </div>
                  {users.length > usersPerPage && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-600">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="text-center py-8 text-gray-500">
                使用记录功能开发中...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPanelModal

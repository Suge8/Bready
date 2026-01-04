import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Plus, Sparkles, UserCircle, Calendar, Trash2, FileText, Users, Code, Briefcase } from 'lucide-react'
import SelectPreparationModal from './SelectPreparationModal'
import AllPreparationsModal from './AllPreparationsModal'
import UserProfileModal from './UserProfileModal'
import AdminPanelModal from './AdminPanelModal'
import PreparationDetailModal from './PreparationDetailModal'
import EditPreparationModal from './EditPreparationModal'
import CreatePreparationTypeModal, { type PreparationType } from './CreatePreparationTypeModal'
import EditSalesPreparationModal from './EditSalesPreparationModal'
import EditMeetingPreparationModal from './EditMeetingPreparationModal'
import { preparationService, type Preparation } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from './ui/theme-provider'

interface MainPageProps {
  preparations: Preparation[]
  setPreparations: React.Dispatch<React.SetStateAction<Preparation[]>>
  onReloadData: () => Promise<void>
}

// 准备项卡片图标映射
const getPreparationIcon = (index: number) => {
  const icons = [FileText, Users, Code, Briefcase]
  const Icon = icons[index % icons.length]
  return Icon
}

// 准备项卡片颜色映射 - 浅色和深色模式
const getPreparationColor = (index: number, isDark: boolean) => {
  if (isDark) {
    // 深色模式：纯黑背景上的深色卡片
    const darkColors = [
      'bg-rose-950/40', // 深粉色
      'bg-violet-950/40', // 深紫色
      'bg-emerald-950/40', // 深绿色
      'bg-amber-950/40', // 深黄色
    ]
    return darkColors[index % darkColors.length]
  } else {
    // 浅色模式：更鲜艳的渐变背景
    const lightColors = [
      'bg-gradient-to-br from-pink-100 to-rose-100', // 粉色渐变
      'bg-gradient-to-br from-violet-100 to-purple-100', // 紫色渐变
      'bg-gradient-to-br from-emerald-100 to-teal-100', // 绿色渐变
      'bg-gradient-to-br from-amber-100 to-orange-100', // 橙色渐变
    ]
    return lightColors[index % lightColors.length]
  }
}

const MainPage: React.FC<MainPageProps> = ({ preparations, setPreparations, onReloadData }) => {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { t, list, locale } = useI18n()
  const { theme } = useTheme()
  const [showSelectModal, setShowSelectModal] = useState(false)
  const [showAllPreparationsModal, setShowAllPreparationsModal] = useState(false)
  const [showUserProfileModal, setShowUserProfileModal] = useState(false)
  const [showAdminPanelModal, setShowAdminPanelModal] = useState(false)
  const [isEnteringMode, setIsEnteringMode] = useState(false)
  const [viewingPreparation, setViewingPreparation] = useState<Preparation | null>(null)
  const [editingPreparation, setEditingPreparation] = useState<Preparation | null | undefined>(undefined) // undefined = closed, null = create new
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false)
  const [editingSalesPreparation, setEditingSalesPreparation] = useState<Preparation | null | undefined>(undefined)
  const [editingMeetingPreparation, setEditingMeetingPreparation] = useState<Preparation | null | undefined>(undefined)

  const slogans = list('slogans.main')
  const currentSlogan = React.useMemo(() => {
    const pool = slogans.length ? slogans : [t('home.headline')]
    return pool[Math.floor(Math.random() * pool.length)]
  }, [slogans, t])

  const handleStartInterview = () => {
    setShowSelectModal(true)
  }

  const handleCreateNew = () => {
    setShowCreateTypeModal(true)
  }

  const handleSelectPreparationType = (type: PreparationType) => {
    setShowCreateTypeModal(false)
    if (type === 'interview') {
      setEditingPreparation(null)
    } else if (type === 'sales') {
      setEditingSalesPreparation(null)
    } else if (type === 'meeting') {
      setEditingMeetingPreparation(null)
    }
  }

  const handleViewPreparation = (id: string) => {
    const prep = preparations.find(p => p.id === id)
    if (prep) {
      setViewingPreparation(prep)
    }
  }

  const handleDeletePreparation = async (id: string) => {
    if (confirm(t('alerts.deletePreparation'))) {
      try {
        await preparationService.delete(id)
        const updatedPreparations = preparations.filter(p => p.id !== id)
        setPreparations(updatedPreparations)
        await onReloadData()
      } catch (error) {
        console.error('Failed to delete preparation:', error)
        alert(t('alerts.deleteFailed'))
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const filteredPreparations = preparations

  // 动画变体
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15
      }
    }
  }

  const cardHoverVariants = {
    rest: { scale: 1, y: 0 },
    hover: { 
      scale: 1.02,
      y: -4,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 25
      }
    }
  }

  // 动态背景类名，根据当前主题决定 - Vercel 风格纯黑
  const getBackgroundClasses = () => {
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    if (isDark) {
      return 'bg-black' // 纯黑背景
    } else {
      return 'bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100'
    }
  }

  // 判断是否为深色模式
  const isDarkMode = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <div className={`h-screen ${getBackgroundClasses()} text-[var(--bready-text)] flex flex-col transition-colors duration-500 relative overflow-hidden`}>
      {/* 装饰性背景元素 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* 细微的噪点纹理 */}
        <div className={`absolute inset-0 ${theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'opacity-[0.05]' : 'opacity-[0.02]'}`} 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }}
        />
      </div>

      {/* 顶部导航 */}
      <header className="relative z-50 flex-shrink-0">
        <div className="h-8 w-full" style={{ WebkitAppRegion: 'drag' } as any}></div>
        <div className="max-w-6xl mx-auto px-4 -ml-10 flex items-center justify-between pb-3" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {/* Logo 区域 - 左侧留出空间给 mac 按钮 */}
          <motion.div 
            className="flex items-center gap-2.5 ml-16"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className={`w-8 h-8 -my-4 ${isDarkMode ? 'bg-white' : 'bg-black'} rounded-2xl flex items-center justify-center`}>
              <Sparkles className={`w-4 h-4 ${isDarkMode ? 'text-black' : 'text-white'}`} />
            </div>
            <div className="flex flex-col leading-none">
              <span className={`text-[9px] uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} font-medium`}>Bready</span>
              <h1 className={`text-base font-semibold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('app.name')}</h1>
            </div>
          </motion.div>

          {/* 用户头像 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <button
              className={`w-12 h-12 mr-2 mt-2 flex items-center justify-center ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded-full transition-colors duration-200 cursor-pointer`}
              onClick={() => setShowUserProfileModal(true)}
            >
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="avatar" 
                  className="w-8 h-8 object-cover rounded-full"
                />
              ) : (
                <UserCircle className={`w-7 h-7 ${isDarkMode ? 'text-gray-500' : 'text-black'}`} />
              )}
            </button>
          </motion.div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="flex-1 flex flex-col px-8 overflow-hidden">
        <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto">
          {/* 上方：Hero 区域 */}
          <motion.div 
            className="flex-1 flex flex-col justify-center items-center text-center min-h-0"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="max-w-2xl" variants={itemVariants}>
              {/* 主标题 - 更大 */}
              <motion.h1 
                className="text-5xl md:text-6xl font-bold mb-4 leading-[1.1] tracking-tight"
                variants={itemVariants}
              >
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  {currentSlogan}
                </span>
              </motion.h1>

              {/* 副标题 */}
              <motion.p 
                className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} leading-relaxed mb-10 max-w-md mx-auto`}
                variants={itemVariants}
              >
                {t('home.subhead')}
              </motion.p>

              {/* 开始按钮 - 更大 */}
              <motion.div variants={itemVariants}>
                <motion.button
                  onClick={handleStartInterview}
                  className={`group relative h-12 px-10 text-base font-medium rounded-full cursor-pointer ${isDarkMode ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'} transition-colors duration-200`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <span className="flex items-center justify-center">
                    {t('home.start')}
                  </span>
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>

            {/* 下方：我的准备列表 */}
          <motion.div 
            className="w-full pb-4 flex-shrink-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          >
            <div className="space-y-3">
              {/* 标题栏 */}
              <div className="flex items-center justify-between px-1">
                <h2 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} tracking-wide`}>
                  {t('home.myPreparations')}
                </h2>
                {filteredPreparations.length > 0 && (
                  <motion.button
                    onClick={handleCreateNew}
                    className={`h-8 w-8 flex items-center justify-center ${isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} rounded-full transition-all duration-200 cursor-pointer`}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <Plus className="w-5 h-5" />
                  </motion.button>
                )}
              </div>

              {/* 准备项列表 */}
              <div>
                {filteredPreparations.length === 0 ? (
                  <motion.div 
                    className={`p-8 ${isDarkMode ? 'bg-gray-900/40 border-gray-700/40' : 'bg-white/60 border-gray-200/60'} backdrop-blur-xl border rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-sm`}
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <motion.div 
                      className={`w-14 h-14 mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-2xl flex items-center justify-center`}
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Sparkles className={`w-6 h-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    </motion.div>
                    <h3 className={`text-base mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} font-semibold`}>
                      {t('home.emptyTitle')}
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} max-w-xs mb-6 leading-relaxed`}>
                      {t('home.emptyDescription')}
                    </p>
                    <motion.button
                      onClick={handleCreateNew}
                      className={`h-10 px-6 ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'} rounded-full font-medium text-sm cursor-pointer shadow-md`}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                      <span className="flex items-center">
                        {t('home.createNow')}
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </span>
                    </motion.button>
                  </motion.div>
                ) : (
                  <>
                    {/* 准备项卡片网格 - 横向滚动显示 */}
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide py-2 px-1">
                      {filteredPreparations.map((preparation, index) => {
                        const IconComponent = getPreparationIcon(index)
                        const colorClass = getPreparationColor(index, isDarkMode)
                        
                        return (
                          <motion.div
                            key={preparation.id}
                            variants={cardHoverVariants}
                            initial="rest"
                            whileHover="hover"
                            className="group cursor-pointer flex-shrink-0 w-[280px]"
                            onClick={() => handleViewPreparation(preparation.id)}
                          >
                            <div className={`relative ${colorClass} ${isDarkMode ? 'border border-gray-800/50 group-hover:border-gray-700' : ''} rounded-3xl overflow-hidden transition-all duration-300 ${isDarkMode ? 'shadow-sm group-hover:shadow-lg' : 'group-hover:shadow-sm'}`}>
                              {/* 微妙的渐变光效 */}
                              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isDarkMode ? 'bg-gradient-to-br from-white/[0.03] to-transparent' : 'bg-gradient-to-br from-white/40 to-transparent'}`} />
                              
                              <div className="relative p-5">
                                {/* 图标 */}
                                <motion.div 
                                  className={`w-12 h-12 mb-4 ${isDarkMode ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white/70'} rounded-2xl flex items-center justify-center shadow-sm ${isDarkMode ? 'border' : ''} backdrop-blur-sm`}
                                  whileHover={{ rotate: [0, -10, 10, 0] }}
                                  transition={{ duration: 0.5 }}
                                >
                                  <IconComponent className={`w-5 h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} />
                                </motion.div>
                                
                                {/* 标题 */}
                                <div className="mb-3">
                                  <h3 className={`text-base font-semibold ${isDarkMode ? 'text-gray-100 group-hover:text-white' : 'text-gray-800 group-hover:text-gray-900'} line-clamp-2 leading-snug transition-colors mb-1.5`}>
                                    {preparation.name}
                                  </h3>
                                  {preparation.is_analyzing && (
                                    <motion.span 
                                      className={`inline-flex items-center gap-1.5 px-2 py-1 ${isDarkMode ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/30 border' : 'bg-emerald-500/10 text-emerald-600'} rounded-full text-[11px] font-medium`}
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ duration: 0.3 }}
                                    >
                                      <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600"></span>
                                      </span>
                                      {t('home.analyzing')}
                                    </motion.span>
                                  )}
                                </div>
                                
                                {/* 日期 */}
                                <div className={`flex items-center text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                  <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                  <span className="font-medium">{formatDate(preparation.updated_at)}</span>
                                </div>
                              </div>

                              {/* 删除按钮 */}
                              <motion.button
                                className={`absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl ${isDarkMode ? 'bg-gray-800/80 hover:bg-red-900/40 border-gray-700/50 border' : 'bg-white/70 hover:bg-red-50'} text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer shadow-sm backdrop-blur-sm`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeletePreparation(preparation.id)
                                }}
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* 选择准备项模态框 */}
      <AnimatePresence>
        {showSelectModal && (
          <SelectPreparationModal
            preparations={preparations}
            isLoading={isEnteringMode}
            onClose={() => !isEnteringMode && setShowSelectModal(false)}
            onSelect={async (preparation, language, purpose) => {
              setIsEnteringMode(true)

              if (preparation) {
                localStorage.setItem('bready-selected-preparation', JSON.stringify(preparation))
              } else {
                localStorage.removeItem('bready-selected-preparation')
              }
              localStorage.setItem('bready-selected-language', language)
              localStorage.setItem('bready-selected-purpose', purpose)

              try {
                if (window.bready) {
                  const success = await window.bready.enterCollaborationMode()
                  console.log('Enter collaboration mode result:', success)
                  if (!success) {
                    throw new Error('Failed to enter collaboration mode')
                  }
                } else {
                  console.log('🌐 Running in browser mode - skipping window management')
                }

                await new Promise(resolve => setTimeout(resolve, 300))

                navigate('/collaboration')

                setShowSelectModal(false)
                setIsEnteringMode(false)
              } catch (error) {
                console.error('Failed to enter collaboration mode:', error)
                alert(t('alerts.startCollabFailed'))
                setIsEnteringMode(false)
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* 查看全部准备项模态窗 */}
      {showAllPreparationsModal && (
        <AllPreparationsModal
          preparations={filteredPreparations}
          onClose={() => setShowAllPreparationsModal(false)}
          onDelete={handleDeletePreparation}
          onView={(preparation) => setViewingPreparation(preparation)}
        />
      )}

      {/* 个人中心模态窗 */}
      {showUserProfileModal && (
        <UserProfileModal
          onClose={() => setShowUserProfileModal(false)}
          onOpenAdminPanel={() => {
            setShowUserProfileModal(false)
            setShowAdminPanelModal(true)
          }}
        />
      )}

      {/* 后台模态窗 */}
      {showAdminPanelModal && (
        <AdminPanelModal
          onClose={() => setShowAdminPanelModal(false)}
          onBack={() => {
            setShowAdminPanelModal(false)
            setShowUserProfileModal(true)
          }}
        />
      )}

      {/* 查看准备项模态框 */}
      {viewingPreparation && (
        <PreparationDetailModal
          preparation={viewingPreparation}
          preparations={preparations}
          setPreparations={setPreparations}
          onReloadData={onReloadData}
          onClose={() => setViewingPreparation(null)}
          onEdit={() => {
            setEditingPreparation(viewingPreparation)
            setViewingPreparation(null)
          }}
        />
      )}

      {/* 编辑/创建准备项模态框 */}
      {editingPreparation !== undefined && (
        <EditPreparationModal
          preparation={editingPreparation || undefined}
          preparations={preparations}
          setPreparations={setPreparations}
          onReloadData={onReloadData}
          onClose={() => setEditingPreparation(undefined)}
          onSaved={(savedPreparation) => {
            setEditingPreparation(undefined)
            setViewingPreparation(savedPreparation)
          }}
        />
      )}

      {/* 选择准备类型模态框 */}
      {showCreateTypeModal && (
        <CreatePreparationTypeModal
          onClose={() => setShowCreateTypeModal(false)}
          onSelect={handleSelectPreparationType}
        />
      )}

      {/* 销售准备模态框 */}
      {editingSalesPreparation !== undefined && (
        <EditSalesPreparationModal
          preparation={editingSalesPreparation || undefined}
          preparations={preparations}
          setPreparations={setPreparations}
          onReloadData={onReloadData}
          onClose={() => setEditingSalesPreparation(undefined)}
          onSaved={(savedPreparation) => {
            setEditingSalesPreparation(undefined)
            setViewingPreparation(savedPreparation)
          }}
        />
      )}

      {/* 会议准备模态框 */}
      {editingMeetingPreparation !== undefined && (
        <EditMeetingPreparationModal
          preparation={editingMeetingPreparation || undefined}
          preparations={preparations}
          setPreparations={setPreparations}
          onReloadData={onReloadData}
          onClose={() => setEditingMeetingPreparation(undefined)}
          onSaved={(savedPreparation) => {
            setEditingMeetingPreparation(undefined)
            setViewingPreparation(savedPreparation)
          }}
        />
      )}
    </div>
  )
}

export default MainPage

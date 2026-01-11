import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useAnimation, type Variants } from 'framer-motion'
import {
  ArrowRight,
  Plus,
  Sparkles,
  UserRound,
  Trash2,
  FileText,
  Users,
  Code,
  Briefcase,
} from 'lucide-react'
import logoImage from '../assets/logo.png'
import oppoSansFont from '../assets/fonts/OPPOSans-Regular.woff2'
import dingTalkJinBuTiFont from '../assets/fonts/DingTalk-JinBuTi.woff2'
import dingTalkSansFont from '../assets/fonts/DingTalk-Sans.woff2'
import SelectPreparationModal from './SelectPreparationModal'
import AllPreparationsModal from './AllPreparationsModal'
import UserProfileModal from './user-profile/UserProfileModal'
import AdminPanelModal from './AdminPanelModal'
import PreparationDetailModal from './PreparationDetailModal'
import EditPreparationModal from './EditPreparationModal'
import CreatePreparationTypeModal, { type PreparationType } from './CreatePreparationTypeModal'
import EditSalesPreparationModal from './EditSalesPreparationModal'
import EditMeetingPreparationModal from './EditMeetingPreparationModal'

import PermissionsSetup from './PermissionsSetup'
import { PreparationCardSkeleton } from './ui/skeleton'
import { preparationService, type Preparation } from '../lib/api-client'
import { cn } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { useTheme } from './ui/theme-provider'
import { useToast } from '../contexts/ToastContext'

interface MainPageProps {
  preparations: Preparation[]
  setPreparations: React.Dispatch<React.SetStateAction<Preparation[]>>
  onReloadData: () => Promise<void>
  isLoading?: boolean
}

// 准备项卡片图标映射
const getPreparationIcon = (index: number) => {
  const icons = [FileText, Users, Code, Briefcase]
  const Icon = icons[index % icons.length]
  return Icon
}

// 视觉层次系统 - 通过颜色深度、阴影和边框创造层次感
const getCardVisualLayer = (index: number, isDark: boolean) => {
  // 定义5个视觉层次，循环使用
  const layers = isDark
    ? [
        {
          bg: 'bg-zinc-900/80',
          border: 'border-zinc-700/40',
          shadow: 'shadow-lg shadow-black/20',
          accent: 'from-blue-500/10',
        },
        {
          bg: 'bg-zinc-900/60',
          border: 'border-zinc-700/30',
          shadow: 'shadow-md shadow-black/15',
          accent: 'from-emerald-500/10',
        },
        {
          bg: 'bg-zinc-900/50',
          border: 'border-zinc-700/25',
          shadow: 'shadow-sm shadow-black/10',
          accent: 'from-violet-500/10',
        },
        {
          bg: 'bg-zinc-900/40',
          border: 'border-zinc-800/40',
          shadow: 'shadow-sm shadow-black/5',
          accent: 'from-amber-500/10',
        },
        {
          bg: 'bg-zinc-900/30',
          border: 'border-zinc-800/30',
          shadow: '',
          accent: 'from-rose-500/10',
        },
      ]
    : [
        {
          bg: 'bg-white',
          border: 'border-gray-200/80',
          shadow: 'shadow-lg shadow-gray-200/50',
          accent: 'from-blue-50',
        },
        {
          bg: 'bg-gray-50/80',
          border: 'border-gray-200/60',
          shadow: 'shadow-md shadow-gray-200/40',
          accent: 'from-emerald-50',
        },
        {
          bg: 'bg-gray-50/60',
          border: 'border-gray-200/50',
          shadow: 'shadow-sm shadow-gray-200/30',
          accent: 'from-violet-50',
        },
        {
          bg: 'bg-gray-100/50',
          border: 'border-gray-200/40',
          shadow: 'shadow-sm shadow-gray-100/20',
          accent: 'from-amber-50',
        },
        { bg: 'bg-gray-100/40', border: 'border-gray-200/30', shadow: '', accent: 'from-rose-50' },
      ]
  return layers[index % layers.length]
}

const FontStyles = () => {
  return (
    <style>{`
      @font-face {
        font-family: 'OPPOSans';
        src: url('${oppoSansFont}') format('woff2');
        font-display: swap;
      }
      @font-face {
        font-family: 'DingTalkJinBuTi';
        src: url('${dingTalkJinBuTiFont}') format('woff2');
        font-display: swap;
      }
      @font-face {
        font-family: 'DingTalkSans';
        src: url('${dingTalkSansFont}') format('woff2');
        font-display: swap;
      }
      .font-cn {
        font-family: 'OPPOSans', 'Inter', system-ui, sans-serif !important;
      }
      .font-logo {
        font-family: 'DingTalkJinBuTi', 'OPPOSans', sans-serif !important;
      }
      .font-logo-en {
        font-family: 'DingTalkSans', 'Inter', sans-serif !important;
      }
    `}</style>
  )
}

const MainPage: React.FC<MainPageProps> = ({
  preparations,
  setPreparations,
  onReloadData,
  isLoading = false,
}) => {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { t, list } = useI18n()
  const { resolvedTheme } = useTheme()
  const { showToast } = useToast()
  const [showSelectModal, setShowSelectModal] = useState(false)
  const [showAllPreparationsModal, setShowAllPreparationsModal] = useState(false)
  const [showUserProfileModal, setShowUserProfileModal] = useState(false)
  const [showAdminPanelModal, setShowAdminPanelModal] = useState(false)
  const [isEnteringMode, setIsEnteringMode] = useState(false)
  const [viewingPreparation, setViewingPreparation] = useState<Preparation | null>(null)
  const [editingPreparation, setEditingPreparation] = useState<Preparation | null | undefined>(
    undefined,
  ) // undefined = closed, null = create new
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false)
  const [editingSalesPreparation, setEditingSalesPreparation] = useState<
    Preparation | null | undefined
  >(undefined)
  const [editingMeetingPreparation, setEditingMeetingPreparation] = useState<
    Preparation | null | undefined
  >(undefined)
  const [showPermissionsSetup, setShowPermissionsSetup] = useState(false)
  const [pendingCollaboration, setPendingCollaboration] = useState<{
    preparation: Preparation | null
    language: string
    purpose: string
  } | null>(null)

  const controls = useAnimation()

  useEffect(() => {
    controls.start('visible')
  }, [controls])

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
    const prep = preparations.find((p) => p.id === id)
    if (prep) {
      setViewingPreparation(prep)
    }
  }

  const handleDeletePreparation = async (id: string) => {
    if (confirm(t('alerts.deletePreparation'))) {
      try {
        await preparationService.delete(id)
        const updatedPreparations = preparations.filter((p) => p.id !== id)
        setPreparations(updatedPreparations)
        await onReloadData()
      } catch (error) {
        console.error('Failed to delete preparation:', error)
        alert(t('alerts.deleteFailed'))
      }
    }
  }

  const filteredPreparations = preparations

  // 动画变体
  const pageVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
  }

  const logoVariants: Variants = {
    hidden: { x: -50, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { delay: 0.1, type: 'spring', stiffness: 100, damping: 10 },
    },
  }

  const avatarVariants: Variants = {
    hidden: { x: 50, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { delay: 0.2, type: 'spring', stiffness: 100, damping: 10 },
    },
  }

  const heroVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
      },
    },
  }

  const cardsVariants: Variants = {
    hidden: { y: 100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        delay: 0.5,
        type: 'spring',
        stiffness: 80,
        damping: 15,
      },
    },
  }

  const getBackgroundClasses = () => 'bg-[var(--bready-bg)]'

  const isDarkMode = resolvedTheme === 'dark'

  return (
    <motion.div
      className={`h-screen font-cn ${getBackgroundClasses()} text-[var(--bready-text)] flex flex-col transition-colors duration-500 relative`}
      initial="hidden"
      animate={controls}
      variants={pageVariants}
    >
      <FontStyles />
      {/* 装饰性背景元素 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* 细微的噪点纹理 */}
        <div
          className={`absolute inset-0 ${isDarkMode ? 'opacity-[0.05]' : 'opacity-[0.02]'}`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* 顶部导航 */}
      <header className="relative z-50 flex-shrink-0">
        <div className="h-8 w-full app-drag"></div>
        <div className="max-w-6xl mx-auto px-4 -ml-10 flex items-center justify-between pb-3 app-no-drag">
          {/* Logo 区域 - 左侧留出空间给 mac 按钮 */}
          <motion.div className="flex items-center gap-3 ml-16" variants={logoVariants}>
            <img
              src={logoImage}
              alt="Bready Logo"
              className="w-9 h-9 -my-4 rounded-xl object-contain"
            />
            <h1
              className={`text-xl font-bold tracking-tight font-logo ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              面宝
            </h1>
          </motion.div>

          {/* 用户头像 */}
          <motion.div variants={avatarVariants}>
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
                <UserRound className={`w-7 h-7 ${isDarkMode ? 'text-gray-500' : 'text-black'}`} />
              )}
            </button>
          </motion.div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="flex-1 flex flex-col overflow-y-auto scrollbar-hide">
        <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-8">
          {/* 上方：Hero 区域 */}
          <div className="flex-1 flex flex-col justify-center items-center text-center min-h-0">
            <motion.div className="max-w-2xl" variants={heroVariants}>
              {/* 主标题 - 更大 */}
              <motion.h1
                className="text-5xl md:text-6xl font-bold mb-4 leading-[1.1] tracking-tight"
                variants={itemVariants}
              >
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{currentSlogan}</span>
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
                  <span className="flex items-center justify-center">{t('home.start')}</span>
                </motion.button>
              </motion.div>
            </motion.div>
          </div>

          {/* 下方：我的准备列表 */}
          <motion.div className="w-full pb-4 flex-shrink-0" variants={cardsVariants}>
            <div className="space-y-3">
              {/* 标题栏 */}
              <div className="flex items-center justify-between px-1">
                <h2
                  className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} tracking-wide`}
                >
                  {t('home.myPreparations')}
                </h2>
                <div className="flex items-center gap-2">
                  {filteredPreparations.length > 4 && (
                    <motion.button
                      onClick={() => setShowAllPreparationsModal(true)}
                      className={`h-8 px-3 flex items-center gap-1.5 text-xs font-medium ${isDarkMode ? 'text-gray-400 hover:text-gray-200 bg-zinc-800/60 hover:bg-zinc-700/80' : 'text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-full transition-all duration-200 cursor-pointer`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span>查看全部</span>
                      <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {filteredPreparations.length}
                      </span>
                    </motion.button>
                  )}
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
              </div>

              {/* 准备项列表 */}
              <div>
                {isLoading ? (
                  <div className="grid grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <PreparationCardSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredPreparations.length === 0 ? (
                  <motion.div
                    className={`p-8 ${isDarkMode ? 'bg-gray-900/60 border-gray-700/40' : 'bg-white/80 border-gray-200/60'} border rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-sm`}
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <motion.div
                      className={`w-14 h-14 mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-2xl flex items-center justify-center`}
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Sparkles
                        className={`w-6 h-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                      />
                    </motion.div>
                    <h3
                      className={`text-base mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} font-semibold`}
                    >
                      {t('home.emptyTitle')}
                    </h3>
                    <p
                      className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} max-w-xs mb-6 leading-relaxed`}
                    >
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
                    <div className="grid grid-cols-4 gap-3">
                      {filteredPreparations.slice(0, 4).map((preparation, index) => {
                        const IconComponent = getPreparationIcon(index)
                        const visualLayer = getCardVisualLayer(index, isDarkMode)
                        const hasScore = preparation.analysis?.matchScore !== undefined
                        const score = preparation.analysis?.matchScore || 0

                        return (
                          <motion.div
                            key={preparation.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
                            className="group cursor-pointer"
                            onClick={() => handleViewPreparation(preparation.id)}
                          >
                            <div
                              className={cn(
                                'relative h-[145px] border rounded-2xl overflow-hidden transition-all duration-200',
                                visualLayer.bg,
                                visualLayer.border,
                                isDarkMode
                                  ? 'shadow-sm shadow-black/10 group-hover:border-zinc-600 group-hover:shadow-xl group-hover:shadow-black/30'
                                  : 'shadow-[0_0_0_0_transparent] group-hover:border-gray-300 group-hover:shadow-lg group-hover:shadow-gray-200/50',
                              )}
                            >
                              <AnimatePresence mode="wait">
                                {preparation.is_analyzing && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85"
                                  >
                                    <motion.div
                                      className="w-12 h-12 rounded-full border-2 border-emerald-400 border-t-transparent"
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    />
                                    <span className="mt-3 text-xs font-medium text-emerald-400">
                                      {t('home.analyzing')}
                                    </span>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              <div
                                className={`absolute inset-0 bg-gradient-to-br ${visualLayer.accent} to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500`}
                              />

                              <motion.div
                                className={`absolute -top-8 -right-8 w-20 h-20 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-black/5'} blur-2xl`}
                                initial={{ scale: 0.8, opacity: 0 }}
                                whileHover={{ scale: 1.5, opacity: 0.3 }}
                              />

                              <div className="relative h-full p-3.5 flex flex-col z-10">
                                <div className="flex items-start justify-between mb-2">
                                  <motion.div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-zinc-800 border-zinc-700/60' : 'bg-white border-gray-200'} border shadow-sm`}
                                    whileHover={{ rotate: 12, scale: 1.1 }}
                                    transition={{ type: 'spring', stiffness: 400 }}
                                  >
                                    <IconComponent
                                      className={`w-4 h-4 ${isDarkMode ? 'text-zinc-300' : 'text-gray-600'}`}
                                    />
                                  </motion.div>

                                  <motion.button
                                    className={`w-6 h-6 flex items-center justify-center rounded-lg ${isDarkMode ? 'bg-zinc-800/80 hover:bg-red-900/50 text-zinc-500 hover:text-red-400' : 'bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500'} opacity-0 group-hover:opacity-100 transition-all`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeletePreparation(preparation.id)
                                    }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </motion.button>
                                </div>

                                <h3
                                  className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} line-clamp-1 mb-1`}
                                >
                                  {preparation.name}
                                </h3>

                                {preparation.job_description && (
                                  <p
                                    className={`text-[10px] ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'} line-clamp-1 mb-2`}
                                  >
                                    {preparation.job_description.slice(0, 40)}
                                  </p>
                                )}

                                <div className="flex-1" />

                                <div className="flex items-end justify-between">
                                  {hasScore ? (
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`text-2xl font-black tabular-nums ${score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-red-500'}`}
                                      >
                                        {score}
                                      </div>
                                      <div className="flex flex-col">
                                        <span
                                          className={`text-[9px] font-medium ${isDarkMode ? 'text-zinc-500' : 'text-gray-400'}`}
                                        >
                                          匹配度
                                        </span>
                                        <div className="w-12 h-1 bg-gray-500/20 rounded-full overflow-hidden">
                                          <motion.div
                                            className={`h-full rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${score}%` }}
                                            transition={{ duration: 0.8, delay: 0.2 }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <span
                                      className={`text-[10px] ${isDarkMode ? 'text-zinc-600' : 'text-gray-400'}`}
                                    >
                                      {t('home.notAnalyzed')}
                                    </span>
                                  )}

                                  <span
                                    className={`text-[8px] px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-zinc-800/80 text-zinc-500' : 'bg-gray-100 text-gray-400'}`}
                                  >
                                    {new Date(preparation.updated_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
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
                  const permissions = await window.bready.checkPermissions()
                  const corePermissionsGranted =
                    permissions.screenRecording.granted && permissions.microphone.granted

                  if (!corePermissionsGranted) {
                    setPendingCollaboration({ preparation, language, purpose })
                    setShowPermissionsSetup(true)
                    setShowSelectModal(false)
                    setIsEnteringMode(false)
                    return
                  }

                  const aiStatus = await window.bready.checkAiReady()
                  if (!aiStatus.ready) {
                    const isAdmin =
                      profile?.role === 'admin' ||
                      profile?.user_level === '管理' ||
                      profile?.user_level === '超级'
                    showToast(
                      isAdmin ? t('alerts.aiNotConfigured') : t('alerts.serverError'),
                      'error',
                    )
                    setIsEnteringMode(false)
                    return
                  }

                  const success = await window.bready.enterCollaborationMode()
                  console.log('Enter collaboration mode result:', success)
                  if (!success) {
                    throw new Error('Failed to enter collaboration mode')
                  }
                } else {
                  console.log('🌐 Running in browser mode - skipping window management')
                }

                await new Promise((resolve) => setTimeout(resolve, 300))

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
      <UserProfileModal
        isOpen={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
        onOpenAdminPanel={() => {
          setShowUserProfileModal(false)
          setShowAdminPanelModal(true)
        }}
      />

      {/* 权限设置模态窗 */}
      <PermissionsSetup
        isOpen={showPermissionsSetup}
        onClose={() => {
          setShowPermissionsSetup(false)
          setPendingCollaboration(null)
        }}
        onComplete={async () => {
          setShowPermissionsSetup(false)
          if (pendingCollaboration && window.bready) {
            setIsEnteringMode(true)
            try {
              const success = await window.bready.enterCollaborationMode()
              if (success) {
                await new Promise((resolve) => setTimeout(resolve, 300))
                navigate('/collaboration')
              } else {
                showToast(t('alerts.startCollabFailed'), 'error')
              }
            } catch (error) {
              console.error('Failed to enter collaboration mode:', error)
              showToast(t('alerts.startCollabFailed'), 'error')
            } finally {
              setIsEnteringMode(false)
              setPendingCollaboration(null)
            }
          }
        }}
      />

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
    </motion.div>
  )
}

export default MainPage

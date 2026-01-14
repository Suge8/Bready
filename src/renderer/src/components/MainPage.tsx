import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  animate,
  type Variants,
  type TargetAndTransition,
} from 'framer-motion'
import {
  Plus,
  Sparkles,
  UserRound,
  Trash2,
  FileText,
  Users,
  Code,
  Briefcase,
  Zap,
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
import { cn, useVisibilityWatchdog } from '../lib/utils'
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

const AnimatedScore = ({ score, color }: { score: number; color: string }) => {
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (v) => Math.round(v))
  const [displayValue, setDisplayValue] = React.useState(0)

  React.useEffect(() => {
    const controls = animate(motionValue, score, {
      duration: 1.5,
      ease: [0.25, 0.1, 0.25, 1],
    })

    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v))

    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [score, motionValue, rounded])

  return <div className={`text-2xl font-bold tabular-nums ${color}`}>{displayValue}</div>
}

const AnimatedProgressBar = ({ score, color }: { score: number; color: string }) => {
  const widthValue = useMotionValue(0)
  const width = useTransform(widthValue, (v) => `${v}%`)

  React.useEffect(() => {
    const controls = animate(widthValue, score, {
      duration: 1.2,
      ease: [0.25, 0.1, 0.25, 1],
    })

    return () => controls.stop()
  }, [score, widthValue])

  return (
    <div className="h-2 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
      <motion.div className={`h-full ${color} rounded-full`} style={{ width }} />
    </div>
  )
}

const getPreparationIcon = (index: number) => {
  const icons = [FileText, Users, Code, Briefcase]
  return icons[index % icons.length]
}

const getIconColor = (index: number, isDark: boolean) => {
  const colors = isDark
    ? ['text-blue-400', 'text-emerald-400', 'text-violet-400', 'text-amber-400']
    : ['text-blue-500', 'text-emerald-500', 'text-violet-500', 'text-amber-500']
  return colors[index % colors.length]
}

const getIconBgColor = (index: number, isDark: boolean) => {
  const colors = isDark
    ? ['bg-blue-500/10', 'bg-emerald-500/10', 'bg-violet-500/10', 'bg-amber-500/10']
    : ['bg-blue-50', 'bg-emerald-50', 'bg-violet-50', 'bg-amber-50']
  return colors[index % colors.length]
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(date)
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
      .text-glow {
        text-shadow: 0 0 20px rgba(var(--primary-rgb), 0.5);
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
  const { profile, isSigningOut } = useAuth()
  const { t, list } = useI18n()
  const { resolvedTheme } = useTheme()
  const { showToast } = useToast()

  const [showSelectModal, setShowSelectModal] = useState(false)
  const [showAllPreparationsModal, setShowAllPreparationsModal] = useState(false)
  const [showUserProfileModal, setShowUserProfileModal] = useState(false)
  const [showAdminPanelModal, setShowAdminPanelModal] = useState(false)
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false)
  const [showPermissionsSetup, setShowPermissionsSetup] = useState(false)

  const [isEnteringMode, setIsEnteringMode] = useState(false)
  const [viewingPreparation, setViewingPreparation] = useState<Preparation | null>(null)

  const [editingPreparation, setEditingPreparation] = useState<Preparation | null | undefined>(
    undefined,
  )
  const [editingSalesPreparation, setEditingSalesPreparation] = useState<
    Preparation | null | undefined
  >(undefined)
  const [editingMeetingPreparation, setEditingMeetingPreparation] = useState<
    Preparation | null | undefined
  >(undefined)

  const [pendingCollaboration, setPendingCollaboration] = useState<{
    preparation: Preparation | null
    language: string
    purpose: string
  } | null>(null)

  const isDarkMode = resolvedTheme === 'dark'
  const animateState = isSigningOut ? 'exit' : 'visible'

  useVisibilityWatchdog([
    '[data-testid="start-button"]',
    '[data-testid="logo"]',
    '[data-testid="profile-button"]',
  ])

  const slogans = list('slogans.main')
  const currentSlogan = useMemo(() => {
    const pool = slogans.length ? slogans : [t('home.headline')]
    return pool[Math.floor(Math.random() * pool.length)]
  }, [slogans, t])

  const filteredPreparations = preparations

  const handleStartInterview = () => setShowSelectModal(true)
  const handleCreateNew = () => setShowCreateTypeModal(true)

  const handleSelectPreparationType = (type: PreparationType) => {
    setShowCreateTypeModal(false)
    if (type === 'interview') setEditingPreparation(null)
    else if (type === 'sales') setEditingSalesPreparation(null)
    else if (type === 'meeting') setEditingMeetingPreparation(null)
  }

  const handleViewPreparation = (id: string) => {
    const prep = preparations.find((p) => p.id === id)
    if (prep) setViewingPreparation(prep)
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

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 1,
      transition: {
        duration: 0.4,
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  }

  const itemFadeUp: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
    },
    exit: {
      opacity: 0,
      y: 16,
      transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
    },
  }

  const logoVariants: Variants = {
    hidden: { opacity: 0, x: -20, scale: 0.9 },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
    },
    exit: {
      opacity: 0,
      x: -20,
      scale: 0.9,
      transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
    },
  }

  const profileButtonVariants: Variants = {
    hidden: { opacity: 0, x: 20, scale: 0.9 },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 },
    },
    exit: {
      opacity: 0,
      x: 20,
      scale: 0.9,
      transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
    },
  }

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
    },
    exit: {
      opacity: 0,
      y: 20,
      scale: 0.95,
      transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
    },
  }

  const cardHover: TargetAndTransition = {
    scale: 1.02,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  }

  return (
    <motion.div
      className={cn(
        'h-screen font-cn text-[var(--bready-text)] flex flex-col transition-colors duration-500 relative overflow-hidden',
        isDarkMode ? 'bg-[#000000]' : 'bg-[#ffffff]',
      )}
      initial="hidden"
      animate={animateState}
      variants={containerVariants}
    >
      <FontStyles />

      <div className="absolute inset-0 pointer-events-none">
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[120px] opacity-20 ${
            isDarkMode ? 'bg-indigo-900/40' : 'bg-blue-100/60'
          }`}
        />
        <div
          className={`absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full blur-[100px] opacity-10 ${
            isDarkMode ? 'bg-purple-900/30' : 'bg-purple-100/50'
          }`}
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
      </div>

      <header className="relative z-50 flex-shrink-0 pt-10 px-8">
        <div className="h-10 w-full app-drag absolute top-0 left-0" />
        <div className="max-w-6xl mx-auto flex items-center justify-between app-no-drag">
          <motion.div
            className="flex items-center gap-1.5"
            variants={logoVariants}
            initial="hidden"
            animate={animateState}
            data-testid="logo"
          >
            <motion.div
              className="relative group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src={logoImage}
                alt="Bready Logo"
                className="w-10 h-10 rounded-xl object-contain relative z-10"
              />
            </motion.div>
            <h1
              className={`text-xl font-bold tracking-tight font-logo ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              面宝
            </h1>
          </motion.div>

          <motion.button
            variants={profileButtonVariants}
            initial="hidden"
            animate={animateState}
            data-testid="profile-button"
            className={`w-12 h-12 flex items-center justify-center rounded-full cursor-pointer ${
              isDarkMode
                ? 'bg-gradient-to-br from-violet-500/25 to-fuchsia-500/25 hover:from-violet-500/35 hover:to-fuchsia-500/35'
                : 'bg-gradient-to-br from-violet-100 to-fuchsia-100 hover:from-violet-200 hover:to-fuchsia-200'
            }`}
            onClick={() => setShowUserProfileModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                className="w-9 h-9 object-cover rounded-full"
              />
            ) : (
              <UserRound
                className={`w-7 h-7 stroke-[2.5] ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}
              />
            )}
          </motion.button>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative z-10 overflow-y-auto px-6 pb-4">
        <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col justify-center items-center text-center min-h-0">
            <motion.div
              initial="hidden"
              animate={animateState}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.15, delayChildren: 0.2 },
                },
                exit: {
                  opacity: 1,
                  transition: { staggerChildren: 0.08, staggerDirection: -1 },
                },
              }}
              className="space-y-6 max-w-3xl"
            >
              <motion.div
                className="overflow-hidden"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1 },
                  exit: { opacity: 0 },
                }}
              >
                <motion.h1
                  className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]"
                  variants={{
                    hidden: { y: 60, opacity: 0 },
                    visible: {
                      y: 0,
                      opacity: 1,
                      transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
                    },
                    exit: {
                      y: 60,
                      opacity: 0,
                      transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
                    },
                  }}
                >
                  <span
                    className={`inline-block bg-clip-text text-transparent bg-gradient-to-br ${
                      isDarkMode
                        ? 'from-white via-zinc-200 to-zinc-500'
                        : 'from-zinc-900 via-zinc-700 to-zinc-500'
                    }`}
                  >
                    {currentSlogan}
                  </span>
                </motion.h1>
              </motion.div>

              <motion.p
                className={`text-lg md:text-xl font-light max-w-xl mx-auto ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
                  },
                  exit: {
                    opacity: 0,
                    y: 20,
                    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
                  },
                }}
              >
                {t('home.subhead')}
              </motion.p>

              <motion.div
                className="pt-4"
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.9 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
                  },
                  exit: {
                    opacity: 0,
                    y: 20,
                    scale: 0.9,
                    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
                  },
                }}
              >
                <motion.button
                  onClick={handleStartInterview}
                  data-testid="start-button"
                  className={`group relative h-14 px-12 text-lg font-medium rounded-full cursor-pointer shadow-xl shadow-indigo-500/10 overflow-hidden ${
                    isDarkMode ? 'bg-white text-black' : 'bg-black text-white'
                  }`}
                  whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.97 }}
                >
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-r ${
                      isDarkMode ? 'from-indigo-100 to-white' : 'from-zinc-800 to-black'
                    }`}
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  <span className="relative flex items-center justify-center gap-2">
                    <Zap className="w-5 h-5 fill-current" />
                    {t('home.start')}
                  </span>
                </motion.button>
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            initial="hidden"
            animate={animateState}
            variants={containerVariants}
            className="space-y-4 pb-4 flex-shrink-0"
          >
            <motion.div variants={itemFadeUp} className="flex items-center justify-between px-1">
              <h2
                className={`text-sm font-semibold tracking-wide flex items-center gap-2 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}
              >
                <Briefcase className="w-4 h-4" />
                {t('home.myPreparations')}
              </h2>

              <div className="flex items-center gap-2">
                {filteredPreparations.length > 4 && (
                  <motion.button
                    onClick={() => setShowAllPreparationsModal(true)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-150 cursor-pointer ${
                      isDarkMode
                        ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {t('home.viewAll', { count: filteredPreparations.length })}
                  </motion.button>
                )}
                {filteredPreparations.length > 0 && (
                  <motion.button
                    onClick={handleCreateNew}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 cursor-pointer ${
                      isDarkMode
                        ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                        : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-black'
                    }`}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </motion.div>

            {isLoading ? (
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <PreparationCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredPreparations.length === 0 ? (
              <motion.div
                variants={itemFadeUp}
                onClick={handleCreateNew}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`max-w-md mx-auto py-8 px-6 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center relative overflow-hidden cursor-pointer transition-colors duration-200 ${
                  isDarkMode
                    ? 'border-zinc-800 bg-zinc-900/20 hover:bg-zinc-800/40 hover:border-zinc-700'
                    : 'border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/80 hover:border-zinc-300'
                }`}
              >
                <motion.div
                  className={`w-12 h-12 mb-4 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-zinc-800' : 'bg-white shadow-sm'}`}
                  animate={{
                    y: [0, -6, 0],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles
                    className={`w-6 h-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'}`}
                  />
                </motion.div>

                <h3
                  className={`text-base font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}
                >
                  开启你的第一个准备项
                </h3>
                <p
                  className={`text-sm max-w-xs leading-relaxed ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}
                >
                  上传相关资料，面宝会分析并指导帮助你哦
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={itemFadeUp}
                className="grid grid-cols-4 gap-4"
              >
                {filteredPreparations.slice(0, 4).map((preparation, index) => {
                  const IconComponent = getPreparationIcon(index)
                  const score = preparation.analysis?.matchScore || 0
                  const hasScore = preparation.analysis?.matchScore !== undefined

                  return (
                    <motion.div
                      key={preparation.id}
                      initial="hidden"
                      animate="visible"
                      variants={cardVariants}
                      whileHover={cardHover}
                      whileTap={{ scale: 0.98 }}
                      className="group relative cursor-pointer"
                      onClick={() => handleViewPreparation(preparation.id)}
                    >
                      <div
                        className={cn(
                          'h-[160px] p-5 rounded-2xl border flex flex-col relative overflow-hidden transition-all duration-200 ease-out',
                          isDarkMode
                            ? 'bg-zinc-900/60 border-zinc-800/60 group-hover:border-zinc-700 group-hover:bg-zinc-800/60'
                            : 'bg-white border-zinc-200/60 group-hover:border-zinc-300 group-hover:bg-zinc-50',
                        )}
                      >
                        <AnimatePresence>
                          {preparation.is_analyzing && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
                            >
                              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-105 ${getIconBgColor(index, isDarkMode)}`}
                          >
                            <IconComponent
                              className={`w-5 h-5 ${getIconColor(index, isDarkMode)}`}
                            />
                          </div>

                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeletePreparation(preparation.id)
                            }}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                              isDarkMode
                                ? 'hover:bg-red-900/30 text-zinc-600 hover:text-red-400'
                                : 'hover:bg-red-50 text-zinc-400 hover:text-red-500'
                            }`}
                            whileHover={{ scale: 1.1 }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>

                        <div className="relative z-10 flex-1">
                          <h3
                            className={`font-bold text-base mb-1 line-clamp-1 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}
                          >
                            {preparation.name}
                          </h3>
                          <p
                            className={`text-xs line-clamp-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}
                          >
                            {preparation.job_description || t('home.noJobDescription')}
                          </p>
                        </div>

                        <div className="relative z-10 flex items-end justify-between mt-auto">
                          {hasScore ? (
                            <div className="flex items-center gap-3">
                              <AnimatedScore
                                score={score}
                                color={
                                  score >= 80
                                    ? 'text-emerald-500'
                                    : score >= 60
                                      ? 'text-amber-500'
                                      : 'text-rose-500'
                                }
                              />
                              <AnimatedProgressBar
                                score={score}
                                color={
                                  score >= 80
                                    ? 'bg-emerald-500'
                                    : score >= 60
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                }
                              />
                            </div>
                          ) : (
                            <span
                              className={`text-[10px] px-2 py-1 rounded-md ${isDarkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'}`}
                            >
                              {t('home.notAnalyzed')}
                            </span>
                          )}

                          <span
                            className={`text-[10px] ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}
                          >
                            {formatDate(preparation.updated_at)}
                          </span>
                        </div>

                        <div
                          className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${
                            isDarkMode ? 'bg-indigo-500/20' : 'bg-blue-400/20'
                          }`}
                        />
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>

      <AnimatePresence>
        {showSelectModal && (
          <SelectPreparationModal
            preparations={preparations}
            isLoading={isEnteringMode}
            onClose={() => !isEnteringMode && setShowSelectModal(false)}
            onSelect={async (preparation, language, purpose) => {
              if ((profile?.remaining_interview_minutes ?? 0) <= 0) {
                showToast(t('alerts.noRemainingTime'), 'error')
                return
              }

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
                  if (!success) throw new Error('Failed to enter collaboration mode')
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

      {showAllPreparationsModal && (
        <AllPreparationsModal
          preparations={filteredPreparations}
          onClose={() => setShowAllPreparationsModal(false)}
          onDelete={handleDeletePreparation}
          onView={(preparation) => setViewingPreparation(preparation)}
        />
      )}

      <UserProfileModal
        isOpen={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
        onOpenAdminPanel={() => {
          setShowUserProfileModal(false)
          setShowAdminPanelModal(true)
        }}
      />

      <PermissionsSetup
        isOpen={showPermissionsSetup}
        onClose={() => {
          setShowPermissionsSetup(false)
          setPendingCollaboration(null)
        }}
        onComplete={async () => {
          setShowPermissionsSetup(false)
          if (pendingCollaboration && window.bready) {
            if ((profile?.remaining_interview_minutes ?? 0) <= 0) {
              showToast(t('alerts.noRemainingTime'), 'error')
              setPendingCollaboration(null)
              return
            }
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

      {showAdminPanelModal && (
        <AdminPanelModal
          onClose={() => setShowAdminPanelModal(false)}
          onBack={() => {
            setShowAdminPanelModal(false)
            setShowUserProfileModal(true)
          }}
        />
      )}

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

      <AnimatePresence>
        {showCreateTypeModal && (
          <CreatePreparationTypeModal
            onClose={() => setShowCreateTypeModal(false)}
            onSelect={handleSelectPreparationType}
          />
        )}
      </AnimatePresence>

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

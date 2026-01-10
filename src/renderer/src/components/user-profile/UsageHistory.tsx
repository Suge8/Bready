import React, { memo, useRef } from 'react'
import { motion } from 'framer-motion'
import { Clock, Calendar, Mic, Video, FileText, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'
import { type InterviewUsageRecord } from '../../lib/supabase'
import { useUsageHistory } from './hooks/useUsageHistory'
import { HistoryListSkeleton } from './SkeletonLoaders'

interface UsageHistoryProps {
  isDarkMode?: boolean
}

// 会话类型图标映射
const sessionTypeIcons = {
  collaboration: Mic,
  live_interview: Video,
}

// 按日期分组记录 - 使用本地日期 key 确保本地天数分组
const groupByDate = (records: InterviewUsageRecord[], locale: string) => {
  const groups: {
    [localDateKey: string]: { displayDate: string; records: InterviewUsageRecord[] }
  } = {}

  records.forEach((record) => {
    const date = new Date(record.started_at)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const localDateKey = `${year}-${month}-${day}`
    const displayDate = date.toLocaleDateString(locale)

    if (!groups[localDateKey]) {
      groups[localDateKey] = { displayDate, records: [] }
    }
    groups[localDateKey].records.push(record)
  })

  // 按本地日期 key 排序（降序）
  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, group]) => ({ key, displayDate: group.displayDate, records: group.records }))
}

// 单条记录组件
const UsageRecordItem: React.FC<{
  record: InterviewUsageRecord
  isDarkMode: boolean
  index: number
}> = memo(({ record, isDarkMode, index }) => {
  const { t, locale } = useI18n()
  const Icon = sessionTypeIcons[record.session_type] || FileText

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const sessionTypeLabel =
    record.session_type === 'collaboration'
      ? t('profile.history.collaboration') || '协作模式'
      : t('profile.history.liveInterview') || '实时面试'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        scale: 1.005,
        backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.4)' : 'rgba(243, 244, 246, 0.6)',
      }}
      transition={{
        delay: index * 0.05,
        duration: 0.2,
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border group',
        'transition-colors duration-200 cursor-default',
        isDarkMode
          ? 'border-gray-800/50 bg-gray-900/20 hover:border-gray-700'
          : 'border-gray-200/60 bg-white hover:border-gray-300/80',
      )}
    >
      {/* 图标 */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors',
          record.session_type === 'collaboration'
            ? 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/15'
            : 'bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/15',
        )}
      >
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-3">
        <span
          className={cn(
            'font-medium text-sm truncate',
            isDarkMode ? 'text-gray-200' : 'text-gray-700',
          )}
        >
          {sessionTypeLabel}
        </span>

        <div className={cn('h-1 w-1 rounded-full', isDarkMode ? 'bg-gray-700' : 'bg-gray-300')} />

        <div
          className={cn(
            'text-xs flex items-center gap-1.5 font-mono',
            isDarkMode ? 'text-gray-500' : 'text-gray-400',
          )}
        >
          <span>{formatTime(record.started_at)}</span>
          {record.ended_at && (
            <>
              <span className="text-gray-600">-</span>
              <span>{formatTime(record.ended_at)}</span>
            </>
          )}
        </div>
      </div>

      {/* 使用时长 */}
      <div className="text-right flex-shrink-0 flex items-center gap-2">
        <div
          className={cn(
            'font-medium text-sm tabular-nums',
            isDarkMode ? 'text-gray-300' : 'text-gray-700',
          )}
        >
          {record.minutes_used}
          <span
            className={cn(
              'ml-1 text-xs font-normal',
              isDarkMode ? 'text-gray-600' : 'text-gray-400',
            )}
          >
            {t('common.minutes', { count: '' }).replace('{{count}}', '').trim()}
          </span>
        </div>
      </div>
    </motion.div>
  )
})

UsageRecordItem.displayName = 'UsageRecordItem'

export const UsageHistory: React.FC<UsageHistoryProps> = memo(({ isDarkMode = false }) => {
  const { t, locale } = useI18n()
  const { records, loading, error, hasMore, loadMore } = useUsageHistory()
  const containerRef = useRef<HTMLDivElement>(null)

  if (loading && records.length === 0) {
    return (
      <div className="space-y-4">
        <HistoryListSkeleton isDarkMode={isDarkMode} count={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('text-center py-8', isDarkMode ? 'text-gray-500' : 'text-gray-400')}>
        {error}
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'text-center py-12 rounded-xl border',
          isDarkMode ? 'border-gray-800 bg-gray-900/30' : 'border-gray-200 bg-gray-50',
        )}
      >
        <Clock
          className={cn('w-12 h-12 mx-auto mb-3', isDarkMode ? 'text-gray-700' : 'text-gray-300')}
        />
        <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
          {t('profile.history.noUsage') || '暂无使用记录'}
        </p>
      </motion.div>
    )
  }

  // 按日期分组
  const groupedRecords = groupByDate(records, locale)

  return (
    <div ref={containerRef} className="space-y-5">
      {/* 按日期分组展示 */}
      {groupedRecords.map((group, groupIndex) => (
        <motion.div
          key={group.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: groupIndex * 0.1, duration: 0.3 }}
        >
          {/* 日期标题 */}
          <div
            className={cn(
              'flex items-center gap-2 mb-2 px-1 text-xs font-semibold tracking-wider uppercase opacity-80',
              isDarkMode ? 'text-gray-500' : 'text-gray-400',
            )}
          >
            <Calendar className="w-3 h-3" />
            <span>{group.displayDate}</span>
          </div>

          {/* 记录列表 */}
          <div className="space-y-1.5">
            {group.records.map((record, index) => (
              <UsageRecordItem
                key={record.id}
                record={record}
                isDarkMode={isDarkMode}
                index={index}
              />
            ))}
          </div>
        </motion.div>
      ))}

      {/* 加载更多 */}
      {hasMore && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={loadMore}
          disabled={loading}
          className={cn(
            'w-full py-2.5 rounded-lg border text-sm font-medium flex items-center justify-center gap-2',
            'transition-all duration-200',
            isDarkMode
              ? 'border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700',
          )}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>{t('profile.history.loadMore') || '加载更多'}</span>
            </>
          )}
        </motion.button>
      )}
    </div>
  )
})

UsageHistory.displayName = 'UsageHistory'

export default UsageHistory

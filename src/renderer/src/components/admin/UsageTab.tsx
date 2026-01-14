import React from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, TrendingUp } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { UsageRecordWithUser } from './types'

interface UsageTabProps {
  isDarkMode: boolean
  usageRecords: UsageRecordWithUser[]
  usageLoading: boolean
  expandedUsageUsers: Set<string>
  setExpandedUsageUsers: React.Dispatch<React.SetStateAction<Set<string>>>
  t: (key: string) => string
  locale: string
}

export const UsageTab: React.FC<UsageTabProps> = ({
  isDarkMode,
  usageRecords,
  usageLoading,
  expandedUsageUsers,
  setExpandedUsageUsers,
  t,
  locale,
}) => {
  const formatNumber = (num: number) => num.toLocaleString(locale)

  const totalMinutes = usageRecords.reduce((sum, r) => sum + r.minutes_used, 0)
  const uniqueUsers = new Set(usageRecords.map((r) => r.user_id)).size
  const avgMinutes = usageRecords.length > 0 ? Math.round(totalMinutes / uniqueUsers) : 0

  const stats = [
    { label: t('admin.usageTitle') || '使用概览', value: formatNumber(usageRecords.length) },
    { label: t('admin.totalMinutes') || '总使用时长', value: `${formatNumber(totalMinutes)} min` },
    { label: t('admin.avgMinutes') || '人均使用', value: `${avgMinutes} min` },
  ]

  const groupedRecords = usageRecords.reduce(
    (acc, record) => {
      const key = record.user_id
      if (!acc[key]) {
        acc[key] = {
          name: record.full_name || record.username || record.email || 'Unknown',
          email: record.email || '',
          totalMinutes: 0,
          records: [],
        }
      }
      acc[key].totalMinutes += record.minutes_used
      acc[key].records.push(record)
      return acc
    },
    {} as Record<
      string,
      { name: string; email: string; totalMinutes: number; records: UsageRecordWithUser[] }
    >,
  )

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div
        className={cn(
          'px-4 py-3 border-b flex-shrink-0',
          isDarkMode ? 'border-neutral-800' : 'border-neutral-200',
        )}
      >
        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'p-2 rounded-lg border',
                isDarkMode
                  ? 'border-neutral-800 bg-neutral-900/50'
                  : 'border-neutral-200 bg-neutral-50',
              )}
            >
              <span className="text-[10px] text-gray-500 uppercase">{stat.label}</span>
              <div
                className={cn('text-lg font-semibold', isDarkMode ? 'text-white' : 'text-black')}
              >
                {stat.value}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {usageLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : usageRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">{t('admin.noUsage') || '暂无使用记录'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(groupedRecords)
              .sort(([, a], [, b]) => b.totalMinutes - a.totalMinutes)
              .map(([visitorId, data]) => (
                <div
                  key={visitorId}
                  className={cn(
                    'p-3 rounded-xl border',
                    isDarkMode
                      ? 'border-neutral-800 bg-neutral-900/50'
                      : 'border-neutral-200 bg-white',
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium',
                          isDarkMode ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-black',
                        )}
                      >
                        {data.name[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div
                          className={cn(
                            'text-sm font-medium',
                            isDarkMode ? 'text-white' : 'text-black',
                          )}
                        >
                          {data.name}
                        </div>
                        <div className="text-xs text-gray-500">{data.email}</div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'text-sm font-semibold px-2 py-0.5 rounded-full',
                        isDarkMode
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-emerald-100 text-emerald-600',
                      )}
                    >
                      {data.totalMinutes} min
                    </div>
                  </div>
                  <div className="space-y-1">
                    {data.records
                      .slice(0, expandedUsageUsers.has(visitorId) ? undefined : 3)
                      .map((record) => (
                        <div
                          key={record.id}
                          className={cn(
                            'flex items-center justify-between text-xs py-1.5 px-2 rounded-lg',
                            isDarkMode ? 'bg-neutral-800/50' : 'bg-neutral-50',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] font-medium',
                                record.session_type === 'collaboration'
                                  ? isDarkMode
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-blue-100 text-blue-600'
                                  : isDarkMode
                                    ? 'bg-violet-500/20 text-violet-400'
                                    : 'bg-violet-100 text-violet-600',
                              )}
                            >
                              {record.session_type === 'collaboration'
                                ? t('profile.history.collaboration') || '协作'
                                : t('profile.history.liveInterview') || '面试'}
                            </span>
                            <span className="text-gray-500">
                              {new Date(record.started_at).toLocaleDateString(locale)}
                            </span>
                          </div>
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                            {record.minutes_used} min
                          </span>
                        </div>
                      ))}
                    {data.records.length > 3 && (
                      <motion.button
                        onClick={() => {
                          setExpandedUsageUsers((prev) => {
                            const next = new Set(prev)
                            if (next.has(visitorId)) next.delete(visitorId)
                            else next.add(visitorId)
                            return next
                          })
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          'w-full text-xs py-1.5 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1',
                          isDarkMode
                            ? 'text-gray-400 hover:text-white hover:bg-white/5'
                            : 'text-gray-500 hover:text-black hover:bg-black/5',
                        )}
                      >
                        {expandedUsageUsers.has(visitorId) ? (
                          <>
                            <ChevronDown className="w-3 h-3 rotate-180 transition-transform" />
                            <span>{t('common.collapse') || '收起'}</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3 transition-transform" />
                            <span>
                              +{data.records.length - 3}{' '}
                              {t('profile.history.loadMore') || '更多记录'}
                            </span>
                          </>
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

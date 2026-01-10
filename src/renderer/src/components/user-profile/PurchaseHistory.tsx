import React, { memo } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, CheckCircle, Clock, XCircle, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useI18n } from '../../contexts/I18nContext'
import { type PurchaseRecord } from '../../lib/supabase'
import { usePurchaseHistory } from './hooks/usePurchaseHistory'
import { HistoryListSkeleton } from './SkeletonLoaders'

interface PurchaseHistoryProps {
  isDarkMode?: boolean
}

// 状态配置
const statusConfig = {
  completed: {
    icon: CheckCircle,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    label: '已完成',
  },
  pending: {
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    label: '处理中',
  },
  cancelled: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    label: '已取消',
  },
}

// 单条购买记录组件
const PurchaseRecordItem: React.FC<{
  record: PurchaseRecord
  isDarkMode: boolean
  index: number
}> = memo(({ record, isDarkMode, index }) => {
  const { t, locale } = useI18n()
  const config = statusConfig[record.status] || statusConfig.pending
  const StatusIcon = config.icon

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'CNY',
    }).format(amount)
  }

  const hasDiscount = record.original_price !== record.actual_price

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
          isDarkMode
            ? 'bg-gray-800 text-gray-400 group-hover:bg-gray-700 group-hover:text-gray-300'
            : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-600',
        )}
      >
        <CreditCard className="w-4 h-4" />
      </div>

      {/* 主要信息 */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className="flex flex-col gap-0.5">
          <span
            className={cn(
              'font-medium text-sm truncate',
              isDarkMode ? 'text-gray-200' : 'text-gray-700',
            )}
          >
            {record.interview_minutes}{' '}
            {t('common.minutes', { count: '' }).replace('{{count}}', '').trim()}
          </span>
          <div
            className={cn(
              'text-xs flex items-center gap-1.5',
              isDarkMode ? 'text-gray-500' : 'text-gray-400',
            )}
          >
            <span>{formatDate(record.created_at)}</span>
          </div>
        </div>

        <span
          className={cn(
            'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium uppercase tracking-wide border bg-opacity-10 border-opacity-20 border-current',
            config.color,
            config.bgColor,
          )}
        >
          <StatusIcon className="w-3 h-3" />
          <span>{t(`profile.history.status.${record.status}`) || config.label}</span>
        </span>
      </div>

      {/* 金额信息 */}
      <div className="text-right flex-shrink-0">
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-baseline gap-1.5">
            {hasDiscount && (
              <span
                className={cn(
                  'text-xs line-through opacity-60',
                  isDarkMode ? 'text-gray-500' : 'text-gray-400',
                )}
              >
                {formatCurrency(record.original_price)}
              </span>
            )}
            <span
              className={cn(
                'font-medium text-sm tabular-nums',
                record.status === 'completed'
                  ? isDarkMode
                    ? 'text-emerald-400'
                    : 'text-emerald-600'
                  : isDarkMode
                    ? 'text-gray-200'
                    : 'text-gray-900',
              )}
            >
              {formatCurrency(record.actual_price)}
            </span>
          </div>

          {record.expires_at && (
            <div className={cn('text-[10px]', isDarkMode ? 'text-gray-600' : 'text-gray-400')}>
              {t('profile.history.expiresAt') || '有效期至'} {formatDate(record.expires_at)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
})

PurchaseRecordItem.displayName = 'PurchaseRecordItem'

export const PurchaseHistory: React.FC<PurchaseHistoryProps> = memo(({ isDarkMode = false }) => {
  const { t } = useI18n()
  const { records, loading, error, hasMore, loadMore } = usePurchaseHistory()

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
        <CreditCard
          className={cn('w-12 h-12 mx-auto mb-3', isDarkMode ? 'text-gray-700' : 'text-gray-300')}
        />
        <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
          {t('profile.history.noPurchase') || '暂无购买记录'}
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-1.5">
      {/* 记录列表 */}
      {records.map((record, index) => (
        <PurchaseRecordItem key={record.id} record={record} isDarkMode={isDarkMode} index={index} />
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
            'w-full py-2.5 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 mt-3',
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

PurchaseHistory.displayName = 'PurchaseHistory'

export default PurchaseHistory

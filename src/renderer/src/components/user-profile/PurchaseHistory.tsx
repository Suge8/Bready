import React, { memo } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Calendar, CheckCircle, Clock, XCircle, ChevronDown } from 'lucide-react'
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
        label: '已完成'
    },
    pending: {
        icon: Clock,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        label: '处理中'
    },
    cancelled: {
        icon: XCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        label: '已取消'
    }
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
            day: 'numeric'
        })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'CNY'
        }).format(amount)
    }

    const hasDiscount = record.original_price !== record.actual_price

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
            className={cn(
                'flex items-center gap-4 p-4 rounded-xl border',
                'transition-colors duration-200',
                isDarkMode
                    ? 'border-gray-800 bg-gray-900/30 hover:bg-gray-900/50'
                    : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/50'
            )}
        >
            {/* 图标 */}
            <div className={cn(
                'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                isDarkMode ? 'bg-gray-800' : 'bg-gray-200'
            )}>
                <CreditCard className={cn(
                    'w-5 h-5',
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                )} />
            </div>

            {/* 主要信息 */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        'font-medium truncate',
                        isDarkMode ? 'text-white' : 'text-gray-900'
                    )}>
                        {record.interview_minutes} {t('common.minutes', { count: '' }).replace('{{count}}', '').trim()}
                    </span>
                    {/* 状态徽章 */}
                    <span className={cn(
                        'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
                        config.bgColor,
                        config.color
                    )}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{t(`profile.history.status.${record.status}`) || config.label}</span>
                    </span>
                </div>
                <div className={cn(
                    'text-xs flex items-center gap-2 mt-0.5',
                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                )}>
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(record.created_at)}</span>
                    {record.expires_at && (
                        <>
                            <span>·</span>
                            <span>{t('profile.history.expiresAt') || '有效期至'} {formatDate(record.expires_at)}</span>
                        </>
                    )}
                </div>
            </div>

            {/* 金额信息 */}
            <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-2 justify-end">
                    {hasDiscount && (
                        <span className={cn(
                            'text-xs line-through',
                            isDarkMode ? 'text-gray-600' : 'text-gray-400'
                        )}>
                            {formatCurrency(record.original_price)}
                        </span>
                    )}
                    <span className={cn(
                        'font-semibold',
                        record.status === 'completed'
                            ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')
                            : (isDarkMode ? 'text-white' : 'text-gray-900')
                    )}>
                        {formatCurrency(record.actual_price)}
                    </span>
                </div>
                {hasDiscount && (
                    <div className={cn(
                        'text-xs mt-0.5',
                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    )}>
                        {t('profile.history.saved') || '节省'} {formatCurrency(record.original_price - record.actual_price)}
                    </div>
                )}
            </div>
        </motion.div>
    )
})

PurchaseRecordItem.displayName = 'PurchaseRecordItem'

export const PurchaseHistory: React.FC<PurchaseHistoryProps> = memo(({
    isDarkMode = false
}) => {
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
            <div className={cn(
                'text-center py-8',
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
            )}>
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
                    isDarkMode
                        ? 'border-gray-800 bg-gray-900/30'
                        : 'border-gray-200 bg-gray-50'
                )}
            >
                <CreditCard className={cn(
                    'w-12 h-12 mx-auto mb-3',
                    isDarkMode ? 'text-gray-700' : 'text-gray-300'
                )} />
                <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
                    {t('profile.history.noPurchase') || '暂无购买记录'}
                </p>
            </motion.div>
        )
    }

    return (
        <div className="space-y-3">
            {/* 记录列表 */}
            {records.map((record, index) => (
                <PurchaseRecordItem
                    key={record.id}
                    record={record}
                    isDarkMode={isDarkMode}
                    index={index}
                />
            ))}

            {/* 加载更多 */}
            {hasMore && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={loadMore}
                    disabled={loading}
                    className={cn(
                        'w-full py-3 rounded-xl border flex items-center justify-center gap-2',
                        'transition-colors',
                        isDarkMode
                            ? 'border-gray-800 text-gray-400 hover:bg-gray-900/50'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
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

import React from 'react'
import { Calendar, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Modal } from './ui/Modal'
import { type Preparation } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'

interface AllPreparationsModalProps {
  preparations: Preparation[]
  onClose: () => void
  onDelete: (id: string) => void
  onView: (preparation: Preparation) => void
}

const AllPreparationsModal: React.FC<AllPreparationsModalProps> = ({
  preparations,
  onClose,
  onDelete,
  onView,
}) => {
  const { t, locale } = useI18n()

  const handleViewPreparation = (preparation: Preparation) => {
    onClose()
    onView(preparation)
  }

  const handleDeletePreparation = (id: string) => {
    if (confirm(t('alerts.deletePreparation'))) {
      onDelete(id)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Modal isOpen onClose={onClose} size="xl" className="p-0 max-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-[var(--bready-border)]">
        <div>
          <h2 className="text-xl font-bold text-[var(--bready-text)]">{t('prepList.title')}</h2>
          <p className="text-sm text-[var(--bready-text-muted)] mt-1">
            {t('prepList.count', { count: preparations.length })}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-6 overflow-y-auto scrollbar-thin">
        {preparations.length === 0 ? (
          <div className="text-center text-[var(--bready-text-muted)] py-12">
            {t('prepList.empty')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preparations.map((preparation) => (
              <Card
                key={preparation.id}
                className="cursor-pointer transition-all duration-300 hover:shadow-lg group border border-[var(--bready-border)] bg-[var(--bready-surface)] rounded-xl overflow-hidden"
                onClick={() => handleViewPreparation(preparation)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-base font-semibold group-hover:text-[var(--bready-text)] transition-colors text-[var(--bready-text)] leading-tight">
                          {preparation.name}
                        </CardTitle>
                        {preparation.is_analyzing && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 rounded-full text-xs">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            {t('prepList.analyzing')}
                          </div>
                        )}
                      </div>
                      <CardDescription className="text-sm text-[var(--bready-text-muted)] line-clamp-2 mb-3">
                        {preparation.job_description}
                      </CardDescription>
                      <div className="flex items-center text-xs text-[var(--bready-text-muted)]">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(preparation.updated_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-[var(--bready-text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePreparation(preparation.id)
                      }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      {t('common.delete')}
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default AllPreparationsModal

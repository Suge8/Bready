import React from 'react'
import { Loader2 } from 'lucide-react'
import { useI18n } from '../../contexts/I18nContext'

interface InitializingOverlayProps {
  status: string
}

export const InitializingOverlay: React.FC<InitializingOverlayProps> = ({ status }) => {
  const { t } = useI18n()

  return (
    <div className="fixed inset-0 bg-[var(--bready-bg)] flex items-center justify-center z-[9999]">
      <div className="text-center p-6">
        <div className="w-16 h-16 mx-auto mb-4 relative">
          <div className="absolute inset-0 rounded-full bg-[var(--bready-border)] opacity-50 animate-ping" />
          <div
            className="absolute inset-2 rounded-full bg-[var(--bready-border)] opacity-70 animate-ping"
            style={{ animationDelay: '0.5s' }}
          />
          <div className="absolute inset-4 rounded-full bg-[var(--bready-surface)] border border-[var(--bready-border)] flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[var(--bready-text)] animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-[var(--bready-text)] mb-2">{status}</h2>
        <p className="text-[var(--bready-text-muted)]">{t('collaboration.status.preparing')}</p>
      </div>
    </div>
  )
}

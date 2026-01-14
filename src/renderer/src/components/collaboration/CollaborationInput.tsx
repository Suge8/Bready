import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Send, X, Sparkles } from 'lucide-react'
import { Button } from '../ui/button'
import { useI18n } from '../../contexts/I18nContext'

interface CollaborationInputProps {
  onSendMessage: (message: string) => void
  isWaitingForAI: boolean
  disabled?: boolean
}

export const CollaborationInput: React.FC<CollaborationInputProps> = ({
  onSendMessage,
  isWaitingForAI,
  disabled = false,
}) => {
  const { t } = useI18n()
  const [inputText, setInputText] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if (!inputText.trim() || isWaitingForAI || disabled) return
    onSendMessage(inputText.trim())
    setInputText('')
  }

  const handleClear = () => {
    setInputText('')
    inputRef.current?.focus()
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pb-6 pt-2">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 30,
        }}
        className="relative group"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: isFocused ? 1 : 0,
            y: isFocused ? -24 : 0,
          }}
          transition={{ duration: 0.2 }}
          className="absolute left-6 top-0 pointer-events-none"
        >
          <span className="text-[10px] uppercase tracking-widest font-semibold text-[var(--bready-text-muted)] flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[var(--bready-accent)]" />
            {t('collaboration.input.helper') || 'Ask AI Assistant'}
          </span>
        </motion.div>

        <motion.div
          layout
          animate={{
            scale: isFocused ? 1.02 : 1,
            boxShadow: isFocused
              ? '0 8px 32px -8px rgba(0, 0, 0, 0.12), 0 0 0 1px var(--bready-border)'
              : '0 4px 12px -4px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--bready-border)',
            backgroundColor: isFocused ? 'var(--bready-surface)' : 'var(--bready-surface-2)',
          }}
          transition={{ duration: 0.2 }}
          className="relative flex items-center rounded-[24px] overflow-hidden"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isFocused ? '' : t('collaboration.input.placeholder')}
            disabled={disabled}
            className="w-full bg-transparent border-none outline-none pl-6 pr-2 py-4 text-[15px] leading-relaxed text-[var(--bready-text)] placeholder:text-[var(--bready-text-muted)] disabled:opacity-50 font-medium tracking-wide selection:bg-[var(--bready-accent)] selection:text-white"
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isComposing && inputText.trim()) {
                e.preventDefault()
                handleSend()
              }
            }}
          />

          <div className="flex items-center gap-1 pr-2 pl-2">
            {inputText && (
              <motion.button
                key="clear-btn"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClear}
                className="p-2 rounded-full text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] hover:bg-[var(--bready-surface-3)] cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}

            <motion.div
              animate={{
                scale: inputText.trim() && !isWaitingForAI ? 1 : 0.9,
                opacity: inputText.trim() && !isWaitingForAI ? 1 : 0.6,
              }}
            >
              <Button
                onClick={handleSend}
                disabled={!inputText.trim() || isWaitingForAI || disabled}
                size="icon"
                className={`
                  relative rounded-full w-10 h-10 transition-all duration-300
                  ${
                    inputText.trim() && !isWaitingForAI
                      ? 'bg-[var(--bready-text)] text-[var(--bready-bg)] shadow-lg shadow-[var(--bready-text)]/20 hover:shadow-xl hover:scale-105'
                      : 'bg-[var(--bready-surface-3)] text-[var(--bready-text-muted)] hover:bg-[var(--bready-surface-3)]'
                  }
                `}
              >
                <motion.div
                  whileTap={{ scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <Send className={`w-4 h-4 ${inputText.trim() ? 'ml-0.5' : ''}`} />
                </motion.div>
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {isFocused && (
          <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-[var(--bready-accent)]/10 via-[var(--bready-text)]/5 to-[var(--bready-accent)]/10 -z-10 transition-opacity" />
        )}
      </motion.div>
    </div>
  )
}

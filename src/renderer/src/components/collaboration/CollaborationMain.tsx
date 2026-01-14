import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, User, Sparkles } from 'lucide-react'
import { StreamingText } from './StreamingText'
import { StreamingMarkdown } from './StreamingMarkdown'
import { BreadyLogo } from './BreadyLogo'
import { useI18n } from '../../contexts/I18nContext'
import type { ConversationEntry } from './hooks'

interface CollaborationMainProps {
  conversationHistory: ConversationEntry[]
  currentVoiceInput: string
  currentAIResponse: string
  isWaitingForAI: boolean
  isInitialState: boolean
}

const floatingAnimationStyles = `
  @keyframes float-up-char {
    0% { opacity: 0; transform: translateY(10px) rotateX(20deg); }
    100% { opacity: 1; transform: translateY(0) rotateX(0); }
  }
  .float-char-anim > span > span {
    animation: float-up-char 0.4s cubic-bezier(0.2, 0.65, 0.3, 0.9) forwards;
    display: inline-block;
  }
  .char-fade > span {
     animation: float-up-char 0.4s cubic-bezier(0.2, 0.65, 0.3, 0.9) forwards;
  }
`

export const CollaborationMain: React.FC<CollaborationMainProps> = ({
  conversationHistory,
  currentVoiceInput,
  currentAIResponse,
  isWaitingForAI,
  isInitialState,
}) => {
  const latestUserMessage = [...conversationHistory].reverse().find((m) => m.type === 'user')
  const latestAIMessage = [...conversationHistory].reverse().find((m) => m.type === 'ai')

  const userContent = currentVoiceInput.trim() || latestUserMessage?.content
  const aiContent = currentAIResponse.trim() || latestAIMessage?.content

  return (
    <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-[var(--bready-bg)] font-sans">
      <style>{floatingAnimationStyles}</style>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.03, 0.05, 0.03],
            x: [0, 20, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[20%] -right-[20%] w-[80%] h-[80%] rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.02, 0.04, 0.02],
            x: [0, -30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-[20%] -left-[20%] w-[80%] h-[80%] rounded-full bg-gradient-to-tr from-purple-500/20 to-orange-500/20"
        />
      </div>

      <AnimatePresence mode="wait">
        {isInitialState ? (
          <InitialStateView key="initial" />
        ) : (
          <ActiveStateView
            key="active"
            userContent={userContent}
            aiContent={aiContent}
            isListening={!!currentVoiceInput}
            isWaitingForAI={isWaitingForAI}
            isStreaming={!!currentAIResponse.trim()}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

const InitialStateView: React.FC = () => {
  const { t } = useI18n()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 flex flex-col items-center justify-center relative z-10"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.6, type: 'spring' }}
        className="relative group cursor-pointer"
        whileHover={{ scale: 1.05 }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/30 to-blue-500/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 scale-150" />
        <BreadyLogo size="xl" />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="mt-8 text-center"
      >
        <h2 className="text-2xl font-light tracking-tight text-[var(--bready-text)] mb-2">
          {t('collaboration.main.ready')}
        </h2>
        <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[var(--bready-surface)]/70 border border-[var(--bready-border)]/50">
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
          />
          <span className="text-xs font-medium text-[var(--bready-text-muted)] tracking-wide uppercase">
            {t('collaboration.main.listeningPrompt')}
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}

interface ActiveStateViewProps {
  userContent?: string
  aiContent?: string
  isListening: boolean
  isWaitingForAI: boolean
  isStreaming: boolean
}

const ActiveStateView: React.FC<ActiveStateViewProps> = ({
  userContent,
  aiContent,
  isListening,
  isWaitingForAI,
  isStreaming,
}) => {
  const { t } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [aiContent, userContent])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col h-full z-10"
    >
      <div className="flex-none p-6 pb-2">
        <div className="max-w-3xl mx-auto w-full">
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-6 flex items-center justify-center"
            >
              <div
                className={`
                  flex items-center gap-2 px-4 py-1.5 rounded-full 
                  border transition-colors duration-300 cursor-pointer
                  ${
                    isListening
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-[var(--bready-surface)] border-[var(--bready-border)] text-[var(--bready-text-muted)]'
                  }
                `}
              >
                {isListening ? (
                  <>
                    <Mic className="w-3.5 h-3.5 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {t('collaboration.labels.listening')}
                    </span>
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {t('collaboration.labels.you')}
                    </span>
                  </>
                )}
              </div>
            </motion.div>

            <div className="min-h-[60px] w-full flex items-start justify-start">
              {!userContent ? (
                <span className="text-[var(--bready-text-muted)]/20 text-2xl font-light italic">
                  ...
                </span>
              ) : (
                <div className="w-full text-left">
                  <StreamingText
                    text={userContent}
                    className="text-xl md:text-2xl font-light text-[var(--bready-text)]/90 leading-relaxed"
                    isInput
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-none flex items-center justify-center py-2 opacity-10">
        <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-[var(--bready-text)] to-transparent" />
      </div>

      <div className="flex-1 flex flex-col items-center relative overflow-hidden px-6">
        <div
          ref={scrollRef}
          className="w-full h-full overflow-y-auto custom-scrollbar flex flex-col items-center"
        >
          <div className="max-w-3xl w-full py-4 flex-1 flex flex-col justify-center min-h-0">
            {!aiContent && !isWaitingForAI && (
              <div className="flex flex-col items-center justify-center gap-4 opacity-30 select-none flex-1">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[var(--bready-surface)] to-[var(--bready-surface-2)] flex items-center justify-center rotate-3 transition-transform hover:rotate-6 cursor-pointer border border-[var(--bready-border)]">
                  <BreadyLogo size="sm" />
                </div>
                <span className="text-xs font-medium tracking-[0.2em] uppercase text-[var(--bready-text-muted)]">
                  {t('collaboration.labels.readyStatus')}
                </span>
              </div>
            )}

            <AnimatePresence>
              {!aiContent && isWaitingForAI && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-4 flex-1 justify-center"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                    <div className="relative w-12 h-12 rounded-full bg-[var(--bready-surface)] border border-blue-500/30 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-blue-500/80 animate-pulse tracking-wide">
                    {t('collaboration.labels.thinking')}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {aiContent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
                className="w-full"
              >
                <div className="flex items-center justify-center mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--bready-surface)] to-[var(--bready-surface-2)] flex items-center justify-center border border-[var(--bready-border)]/50 shadow-sm">
                    <BreadyLogo size="sm" />
                  </div>
                </div>

                <div className="bg-[var(--bready-surface)]/50 border border-[var(--bready-border)]/50 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow duration-500 cursor-default group">
                  <StreamingMarkdown
                    text={aiContent}
                    className="w-full leading-relaxed font-medium text-[var(--bready-text)] prose-headings:font-light prose-p:leading-8 float-char-anim"
                    isStreaming={isStreaming}
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

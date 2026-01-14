import React, { useEffect, useRef, useState } from 'react'
import { Mic, Keyboard, MessageSquare, Copy, Check, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { motion, AnimatePresence } from 'framer-motion'
import { BreadyLogo } from './BreadyLogo'

interface ConversationEntry {
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  source: 'voice' | 'text'
}

interface CollaborationSidebarProps {
  conversationHistory: ConversationEntry[]
  copyToClipboard: (text: string) => void
  t: (key: string) => string
}

const CollaborationSidebar: React.FC<CollaborationSidebarProps> = ({
  conversationHistory,
  copyToClipboard,
  t,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [overlayTop, setOverlayTop] = useState<number>(0)
  const listRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isOverOverlayRef = useRef(false)

  useEffect(() => {
    const list = listRef.current
    if (list) {
      list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
    }
  }, [conversationHistory.length])

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    }
  }, [])

  const handleCopy = (text: string, index: number) => {
    copyToClipboard(text)
    setCopiedIndex(index)
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    copyTimeoutRef.current = setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleMouseEnter = (e: React.MouseEvent, index: number, content: string) => {
    if (content.length <= 80) return

    const rect = e.currentTarget.getBoundingClientRect()
    const top = rect.top

    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredIndex(index)
      setOverlayTop(top)
    }, 300)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    leaveTimeoutRef.current = setTimeout(() => {
      if (!isOverOverlayRef.current) {
        setHoveredIndex(null)
      }
    }, 100)
  }

  const handleOverlayEnter = () => {
    isOverOverlayRef.current = true
  }

  const handleOverlayLeave = () => {
    isOverOverlayRef.current = false
    setHoveredIndex(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-1/4 min-w-[220px] max-w-[320px] flex-shrink-0 flex flex-col bg-[var(--bready-surface)]/95 border-r border-[var(--bready-border)]/50 h-full ml-0"
    >
      <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--bready-border)]/30 bg-[var(--bready-surface)]/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[var(--bready-accent)]" />
          <h3 className="text-xs font-semibold tracking-wide uppercase text-[var(--bready-text-muted)]">
            {t('collaboration.sidebar.title')}
          </h3>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-[var(--bready-surface-3)]/50 border border-[var(--bready-border)]/50">
          <span className="text-[10px] font-medium text-[var(--bready-text)] tabular-nums">
            {conversationHistory.length}
          </span>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 custom-scrollbar"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {conversationHistory.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center h-full text-[var(--bready-text-muted)] py-10"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--bready-surface)]/50 flex items-center justify-center mb-3 ring-1 ring-[var(--bready-border)]">
                <MessageSquare className="w-5 h-5 opacity-40" />
              </div>
              <p className="text-xs font-medium opacity-60">{t('collaboration.sidebar.empty')}</p>
            </motion.div>
          ) : (
            conversationHistory.map((entry, index) => {
              const isUser = entry.type === 'user'
              const isTruncated = entry.content.length > 80

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  layout
                  className="group relative"
                  onMouseEnter={(e) => handleMouseEnter(e, index, entry.content)}
                  onMouseLeave={handleMouseLeave}
                >
                  <motion.div
                    whileHover={{ scale: 1.01, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCopy(entry.content, index)}
                    className={`
                      relative p-3 rounded-xl border cursor-pointer transition-colors duration-200
                      ${
                        isUser
                          ? 'bg-[var(--bready-surface)]/40 border-[var(--bready-border)]/30 hover:bg-[var(--bready-surface)]/60 hover:border-[var(--bready-accent)]/20 hover:shadow-lg hover:shadow-[var(--bready-accent)]/5'
                          : 'bg-transparent border-transparent hover:bg-[var(--bready-surface)]/30 hover:border-[var(--bready-border)]/30'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`
                          w-5 h-5 rounded-md flex items-center justify-center shadow-sm
                          ${
                            isUser
                              ? 'bg-[var(--bready-accent)] text-[var(--bready-accent-contrast)]'
                              : 'bg-gradient-to-br from-[var(--bready-surface-3)] to-[var(--bready-surface)] text-[var(--bready-text)] border border-[var(--bready-border)]/50'
                          }
                        `}
                        >
                          {isUser ? (
                            entry.source === 'voice' ? (
                              <Mic size={10} />
                            ) : (
                              <Keyboard size={10} />
                            )
                          ) : (
                            <BreadyLogo size="xs" />
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-[var(--bready-text-muted)] opacity-70 tabular-nums">
                          {entry.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {copiedIndex === index ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <Check className="w-3 h-3 text-green-500" />
                          </motion.div>
                        ) : (
                          <Copy className="w-3 h-3 text-[var(--bready-text-muted)]" />
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-[var(--bready-text)] leading-relaxed opacity-90 line-clamp-3 font-normal">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {isTruncated ? entry.content.substring(0, 80) + '...' : entry.content}
                      </ReactMarkdown>
                    </div>
                  </motion.div>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {hoveredIndex !== null && conversationHistory[hoveredIndex] && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -5, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed left-[calc(25%+1rem)] z-50 w-[380px] max-w-[50vw]"
            style={{
              top: Math.min(Math.max(20, overlayTop), window.innerHeight - 400),
            }}
            onMouseEnter={handleOverlayEnter}
            onMouseLeave={handleOverlayLeave}
          >
            <div className="bg-[var(--bready-surface)] rounded-2xl shadow-2xl border border-[var(--bready-border)] p-0 overflow-hidden">
              <div className="px-4 py-3 bg-[var(--bready-surface-2)]/30 border-b border-[var(--bready-border)]/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`
                    w-4 h-4 rounded-full flex items-center justify-center
                    ${
                      conversationHistory[hoveredIndex].type === 'user'
                        ? 'bg-[var(--bready-accent)] text-[var(--bready-accent-contrast)]'
                        : 'bg-[var(--bready-surface-3)] text-[var(--bready-text)]'
                    }
                  `}
                  >
                    {conversationHistory[hoveredIndex].type === 'user' ? (
                      conversationHistory[hoveredIndex].source === 'voice' ? (
                        <Mic size={8} />
                      ) : (
                        <Keyboard size={8} />
                      )
                    ) : (
                      <BreadyLogo size="xs" />
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-[var(--bready-text-muted)]">
                    {conversationHistory[hoveredIndex].timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--bready-text-muted)] bg-[var(--bready-surface-3)]/50 px-2 py-0.5 rounded-full">
                  {conversationHistory[hoveredIndex].type === 'user' ? 'User' : 'AI'}
                </div>
              </div>

              <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="prose prose-sm max-w-none prose-p:text-[var(--bready-text)] prose-headings:text-[var(--bready-text)] prose-strong:text-[var(--bready-text)] dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {conversationHistory[hoveredIndex].content}
                  </ReactMarkdown>
                </div>
              </div>

              <div className="px-4 py-2 bg-[var(--bready-surface-2)]/20 border-t border-[var(--bready-border)]/30 flex justify-end">
                <span className="text-[9px] text-[var(--bready-text-muted)] opacity-60">
                  {t('collaboration.actions.copy')}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--bready-border);
          border-radius: 20px;
          opacity: 0.5;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: var(--bready-text-muted);
        }
      `}</style>
    </motion.div>
  )
}

export default CollaborationSidebar

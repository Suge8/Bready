import React, { useEffect, useRef, useState } from 'react'
import { Mic } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

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
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const sidebar = listRef.current
    if (!sidebar) return
    sidebar.scrollTop = sidebar.scrollHeight
  }, [conversationHistory.length])

  return (
    <div className="w-1/4 min-w-[180px] max-w-[280px] flex-shrink-0 flex flex-col bg-[var(--bready-surface)]/10 rounded-xl ml-2">
      <div className="px-3 py-2 flex items-center justify-between">
        <h3 className="text-[11px] font-medium text-[var(--bready-text-muted)]">对话记录</h3>
        <span className="text-[10px] text-[var(--bready-text-muted)]/60 tabular-nums">
          {conversationHistory.length}
        </span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5 scrollbar-thin">
        {conversationHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--bready-text-muted)] text-xs">
            <span className="text-lg mb-1">💬</span>
            <p>{t('collaboration.sidebar.empty')}</p>
          </div>
        ) : (
          conversationHistory.map((entry, index) => {
            const isTruncated = entry.content.length > 80
            const isHovered = hoveredMessageIndex === index
            return (
              <div
                key={index}
                className={`relative p-2.5 rounded-lg transition-all duration-150 cursor-pointer hover:bg-[var(--bready-surface)]/50 active:scale-[0.98] ${
                  entry.type === 'user' ? 'bg-[var(--bready-surface)]/30' : 'bg-transparent'
                }`}
                onClick={() => copyToClipboard(entry.content)}
                onMouseEnter={() => {
                  if (isTruncated) {
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current)
                    }
                    hoverTimeoutRef.current = setTimeout(() => {
                      setHoveredMessageIndex(index)
                    }, 300)
                  }
                }}
                onMouseLeave={() => {
                  if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current)
                  }
                  setHoveredMessageIndex(null)
                }}
              >
                <div className="flex gap-2.5">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        entry.type === 'user'
                          ? 'bg-[var(--bready-accent)] text-[var(--bready-accent-contrast)]'
                          : 'bg-[var(--bready-surface-3)] text-[var(--bready-text)]'
                      }`}
                    >
                      {entry.type === 'user' ? (
                        entry.source === 'voice' ? (
                          <Mic className="w-3 h-3" />
                        ) : (
                          <span className="text-[9px]">⌨</span>
                        )
                      ) : (
                        <span className="text-[10px]">🍞</span>
                      )}
                    </div>
                    <span className="text-[9px] text-[var(--bready-text-muted)] mt-1 tabular-nums">
                      {entry.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-xs text-[var(--bready-text)] leading-relaxed line-clamp-3 prose prose-sm max-w-none prose-p:m-0 prose-p:text-[var(--bready-text)] dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {isTruncated ? entry.content.substring(0, 80) + '...' : entry.content}
                    </ReactMarkdown>
                  </div>
                </div>

                {isTruncated && isHovered && (
                  <div className="fixed inset-0 flex items-center justify-center z-[9999] p-10">
                    <div
                      className="bg-[var(--bready-surface)] border border-[var(--bready-border)] rounded-xl p-4 shadow-2xl max-w-lg max-h-[60vh] overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--bready-border)]">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            entry.type === 'user'
                              ? 'bg-[var(--bready-accent)] text-[var(--bready-accent-contrast)]'
                              : 'bg-[var(--bready-surface-3)] text-[var(--bready-text)]'
                          }`}
                        >
                          {entry.type === 'user' ? (
                            entry.source === 'voice' ? (
                              <Mic className="w-2.5 h-2.5" />
                            ) : (
                              <span className="text-[8px]">⌨</span>
                            )
                          ) : (
                            <span className="text-[9px]">🍞</span>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--bready-text-muted)] flex-shrink-0">
                          {entry.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <span className="text-[10px] text-[var(--bready-text-muted)] ml-auto">
                          {t('collaboration.actions.copy')}
                        </span>
                      </div>
                      <div className="prose prose-sm max-w-none text-[var(--bready-text)] prose-p:text-[var(--bready-text)] prose-headings:text-[var(--bready-text)] dark:prose-invert text-sm leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                        >
                          {entry.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default CollaborationSidebar

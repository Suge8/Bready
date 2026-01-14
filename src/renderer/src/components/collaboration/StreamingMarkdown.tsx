import React, { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const getDynamicFontSize = (textLength: number) => {
  if (textLength < 50) return 'text-xl md:text-2xl'
  if (textLength < 150) return 'text-lg md:text-xl'
  if (textLength < 300) return 'text-base md:text-lg'
  return 'text-sm md:text-base'
}

interface StreamingMarkdownProps {
  text: string
  className?: string
  isStreaming?: boolean
}

export const StreamingMarkdown: React.FC<StreamingMarkdownProps> = memo(
  ({ text, className = '', isStreaming = false }) => {
    const dynamicSize = getDynamicFontSize(text.length)

    const components = {
      p: ({ children }: any) => (
        <p>
          {children}
          {isStreaming && <span className="streaming-cursor" />}
        </p>
      ),
      li: ({ children }: any) => (
        <li>
          {children}
          {isStreaming && <span className="streaming-cursor" />}
        </li>
      ),
      h1: ({ children }: any) => (
        <h1>
          {children}
          {isStreaming && <span className="streaming-cursor" />}
        </h1>
      ),
      h2: ({ children }: any) => (
        <h2>
          {children}
          {isStreaming && <span className="streaming-cursor" />}
        </h2>
      ),
      h3: ({ children }: any) => (
        <h3>
          {children}
          {isStreaming && <span className="streaming-cursor" />}
        </h3>
      ),
    }

    return (
      <div
        className={`${className} ${dynamicSize} prose dark:prose-invert max-w-none streaming-markdown`}
        style={{ transition: 'font-size 0.3s ease-out' }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {text}
        </ReactMarkdown>
      </div>
    )
  },
)

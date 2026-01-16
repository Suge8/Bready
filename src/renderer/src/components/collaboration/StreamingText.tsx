import React, { memo, useRef } from 'react'

const getDynamicFontSize = (textLength: number, isInput: boolean = false) => {
  if (isInput) {
    if (textLength < 50) return 'text-lg md:text-xl'
    if (textLength < 150) return 'text-base md:text-lg'
    return 'text-sm md:text-base'
  }
  if (textLength < 50) return 'text-xl md:text-2xl'
  if (textLength < 150) return 'text-lg md:text-xl'
  if (textLength < 300) return 'text-base md:text-lg'
  return 'text-sm md:text-base'
}

interface StreamingTextProps {
  text: string
  className?: string
  isInput?: boolean
}

const NewCharSpan = memo(({ char }: { char: string }) => (
  <span className="animate-char-pop" style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}>
    {char}
  </span>
))

export const StreamingText: React.FC<StreamingTextProps> = memo(
  ({ text, className = '', isInput = false }) => {
    const prevTextRef = useRef('')

    const prevText = prevTextRef.current
    let stableText: string
    let newText: string

    if (text.startsWith(prevText) && text.length > prevText.length) {
      stableText = prevText
      newText = text.slice(prevText.length)
    } else if (text !== prevText) {
      stableText = ''
      newText = text
    } else {
      stableText = text
      newText = ''
    }

    prevTextRef.current = text

    const dynamicSize = getDynamicFontSize(text.length, isInput)
    const hasNewText = newText.length > 0

    return (
      <span
        className={`${className} ${dynamicSize} text-left inline-block`}
        style={{ transition: 'font-size 0.3s ease-out' }}
      >
        {stableText && <span style={{ whiteSpace: 'pre-wrap' }}>{stableText}</span>}
        {hasNewText &&
          newText.split('').map((char, i) => <NewCharSpan key={`new-${i}`} char={char} />)}
        {(hasNewText || isInput) && <span className="streaming-cursor" />}
      </span>
    )
  },
)

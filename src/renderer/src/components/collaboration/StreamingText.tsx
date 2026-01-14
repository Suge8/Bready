import React, { memo, useRef, useEffect, useState } from 'react'

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

const CharSpan = memo(({ char }: { char: string }) => (
  <span style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}>{char}</span>
))

const NewCharSpan = memo(({ char }: { char: string }) => (
  <span className="animate-char-pop" style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}>
    {char}
  </span>
))

export const StreamingText: React.FC<StreamingTextProps> = memo(
  ({ text, className = '', isInput = false }) => {
    const prevTextRef = useRef('')
    const [stableText, setStableText] = useState('')
    const [newText, setNewText] = useState('')

    useEffect(() => {
      const prevText = prevTextRef.current

      if (text.startsWith(prevText) && text.length > prevText.length) {
        setStableText(prevText)
        setNewText(text.slice(prevText.length))
      } else if (text !== prevText) {
        setStableText('')
        setNewText(text)
      }

      // 立即更新 ref，确保下次比较时能正确识别新增字符
      prevTextRef.current = text

      const timer = setTimeout(() => {
        setStableText(text)
        setNewText('')
      }, 200)

      return () => clearTimeout(timer)
    }, [text])

    const dynamicSize = getDynamicFontSize(text.length, isInput)

    return (
      <span
        className={`${className} ${dynamicSize} text-left inline-block`}
        style={{ transition: 'font-size 0.3s ease-out' }}
      >
        {stableText.split('').map((char, i) => (
          <CharSpan key={i} char={char} />
        ))}
        {newText.split('').map((char, i) => (
          <NewCharSpan key={`new-${i}`} char={char} />
        ))}
        {(newText.length > 0 || isInput) && <span className="streaming-cursor" />}
      </span>
    )
  },
)

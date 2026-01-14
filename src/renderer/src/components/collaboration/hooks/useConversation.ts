import { useState, useCallback, useRef } from 'react'

export interface ConversationEntry {
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  source: 'voice' | 'text'
}

const MAX_HISTORY_LENGTH = 100

export function useConversation() {
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([])
  const [currentVoiceInput, setCurrentVoiceInput] = useState('')
  const [currentAIResponse, setCurrentAIResponse] = useState('')
  const [isWaitingForAI, setIsWaitingForAI] = useState(false)

  const currentVoiceInputRef = useRef('')
  const currentAIResponseRef = useRef('')
  const lastAIResponseRef = useRef('')
  const pendingUserInputRef = useRef<{ content: string; source: 'text' } | null>(null)

  const addToHistory = useCallback((entry: ConversationEntry) => {
    setConversationHistory((prev) => {
      const next = [...prev, entry]
      return next.length > MAX_HISTORY_LENGTH ? next.slice(-MAX_HISTORY_LENGTH) : next
    })
  }, [])

  const clearCurrentInputs = useCallback(() => {
    setCurrentVoiceInput('')
    setCurrentAIResponse('')
    currentVoiceInputRef.current = ''
    currentAIResponseRef.current = ''
  }, [])

  const updateVoiceInput = useCallback((text: string) => {
    if (currentAIResponseRef.current) return
    if (text && text.trim().length > 0) {
      const trimmedText = text.trim()
      setCurrentVoiceInput(trimmedText)
      currentVoiceInputRef.current = trimmedText
      setIsWaitingForAI(true)
    }
  }, [])

  const updateAIResponse = useCallback((response: string) => {
    if (!response.trim()) return
    setCurrentAIResponse(response)
    currentAIResponseRef.current = response
    setIsWaitingForAI(false)
  }, [])

  const handleTranscriptionComplete = useCallback(
    (transcription: string) => {
      if (!transcription?.trim()) return

      const userMessage: ConversationEntry = {
        type: 'user',
        content: transcription.trim(),
        timestamp: new Date(),
        source: 'voice',
      }

      addToHistory(userMessage)
      setCurrentVoiceInput('')
      currentVoiceInputRef.current = ''
      setIsWaitingForAI(true)

      pendingUserInputRef.current = {
        content: transcription.trim(),
        source: 'text',
      }
    },
    [addToHistory],
  )

  const handleAIResponseComplete = useCallback(
    (response: string) => {
      if (!response.trim()) return
      if (response === lastAIResponseRef.current) return

      lastAIResponseRef.current = response

      setCurrentAIResponse('')
      currentAIResponseRef.current = ''

      const aiMessage: ConversationEntry = {
        type: 'ai',
        content: response,
        timestamp: new Date(),
        source: pendingUserInputRef.current ? 'text' : 'voice',
      }

      addToHistory(aiMessage)
      pendingUserInputRef.current = null
      setCurrentVoiceInput('')
      currentVoiceInputRef.current = ''
      setIsWaitingForAI(false)
    },
    [addToHistory],
  )

  const isInitialState =
    conversationHistory.length === 0 && !currentVoiceInput && !currentAIResponse && !isWaitingForAI

  return {
    conversationHistory,
    currentVoiceInput,
    currentAIResponse,
    isWaitingForAI,
    isInitialState,
    currentVoiceInputRef,
    currentAIResponseRef,
    pendingUserInputRef,
    lastAIResponseRef,
    addToHistory,
    clearCurrentInputs,
    updateVoiceInput,
    updateAIResponse,
    handleTranscriptionComplete,
    handleAIResponseComplete,
    setIsWaitingForAI,
  }
}

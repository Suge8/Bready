import React, { useEffect } from 'react'

export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N: 新建准备项
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        // 这里应该导航到创建准备项页面
        window.location.hash = '#/create-preparation'
      }
      
      // Ctrl/Cmd + K: 快速搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        // 这里应该打开搜索面板
        console.log('Open search panel shortcut pressed')
      }
      
      // ESC: 关闭模态框
      if (e.key === 'Escape') {
        // 这里应该关闭当前打开的模态框
        const modals = document.querySelectorAll('.modal-overlay')
        if (modals.length > 0) {
          // 关闭最后一个模态框
          const lastModal = modals[modals.length - 1] as HTMLElement
          lastModal.click()
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}

interface ShortcutHintProps {
  shortcut: string
  description: string
}

export const ShortcutHint: React.FC<ShortcutHintProps> = ({ 
  shortcut, 
  description 
}) => {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-gray-700 dark:text-gray-300">{description}</span>
      <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
        {shortcut}
      </kbd>
    </div>
  )
}
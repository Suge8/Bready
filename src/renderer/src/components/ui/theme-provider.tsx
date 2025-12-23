import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface ThemeContextType {
  theme: 'light' | 'dark' | 'auto'
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto')

  useEffect(() => {
    // 从 localStorage 获取主题设置
    const savedTheme = localStorage.getItem('bready-theme') as 'light' | 'dark' | 'auto' | null
    if (savedTheme) {
      setTheme(savedTheme)
    }

    // 根据系统偏好设置初始主题
    const updateTheme = () => {
      const currentTheme = theme === 'auto' 
        ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        : theme
      
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(currentTheme)
    }

    updateTheme()

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'auto') {
        updateTheme()
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const handleSetTheme = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme)
    localStorage.setItem('bready-theme', newTheme)
    
    // 立即应用主题
    const currentTheme = newTheme === 'auto' 
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : newTheme
    
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(currentTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
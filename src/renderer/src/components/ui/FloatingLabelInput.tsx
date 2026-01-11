import React, { useState, forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useTheme } from './theme-provider'

export interface FloatingLabelInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string
  value: string
  onChange: (value: string) => void
  rightElement?: React.ReactNode
  alwaysShowLabel?: boolean
}

export const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  (
    {
      label,
      value,
      onChange,
      type = 'text',
      placeholder,
      rightElement,
      className,
      alwaysShowLabel = false,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const { resolvedTheme } = useTheme()
    const isDarkMode = resolvedTheme === 'dark'

    const isPassword = type === 'password'
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type
    const showLabel = alwaysShowLabel || isFocused

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
    }

    return (
      <div className="space-y-1">
        <motion.label
          initial={false}
          animate={{
            opacity: showLabel ? 1 : 0,
            y: showLabel ? 0 : 4,
          }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={cn(
            'text-xs font-medium ml-1 block h-4',
            isDarkMode ? 'text-gray-400' : 'text-gray-500',
            !showLabel && 'pointer-events-none',
          )}
        >
          {label}
        </motion.label>
        <div
          className={cn(
            'group relative rounded-xl transition-all duration-300 ring-[1.5px] ring-inset',
            isDarkMode
              ? 'bg-[#111] ring-[#444] focus-within:ring-2 focus-within:ring-white focus-within:bg-[#161616]'
              : 'bg-transparent ring-black/25 focus-within:ring-2 focus-within:ring-black',
          )}
        >
          <input
            ref={ref}
            type={inputType}
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={alwaysShowLabel ? placeholder : isFocused ? '' : placeholder || label}
            className={cn(
              'w-full h-11 px-4 bg-transparent border-none outline-none text-sm placeholder:text-gray-400/50',
              (isPassword || rightElement) && 'pr-12',
              className,
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors cursor-pointer',
                isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black',
              )}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          {rightElement && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
          )}
        </div>
      </div>
    )
  },
)

FloatingLabelInput.displayName = 'FloatingLabelInput'

export default FloatingLabelInput

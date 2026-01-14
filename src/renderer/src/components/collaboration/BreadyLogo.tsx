import React from 'react'
import { cn } from '../../lib/utils'
import logoImage from '../../assets/logo-bready.png'

interface BreadyLogoProps {
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-10 h-10',
}

export const BreadyLogo: React.FC<BreadyLogoProps> = ({ className, size = 'md' }) => {
  return (
    <img
      src={logoImage}
      alt="Bready"
      className={cn(sizeMap[size], 'object-contain', className)}
      draggable={false}
    />
  )
}

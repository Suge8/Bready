import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, FolderOpen, X } from 'lucide-react'
import { Link } from 'react-router-dom'

interface BreadcrumbItem {
  label: string
  path: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="flex items-center space-x-2 text-sm mb-6">
      {items.map((item, index) => (
        <React.Fragment key={item.path}>
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          <Link 
            to={item.path} 
            className={`
              ${index === items.length - 1 
                ? 'text-black font-medium dark:text-white' 
                : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'
              }
              whitespace-nowrap overflow-hidden text-ellipsis max-w-xs
            `}
          >
            {item.label}
          </Link>
        </React.Fragment>
      ))}
    </nav>
  )
}

interface SidebarProps {
  collapsed?: boolean
  onCollapseChange?: (collapsed: boolean) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onCollapseChange }) => {
  return (
    <aside className={`
      ${collapsed ? 'w-16' : 'w-64'}
      transition-all duration-300
      bg-white border-r border-gray-200
      dark:bg-gray-800 dark:border-gray-700
      fixed left-0 top-0 bottom-0
      z-40
      overflow-y-auto
    `}>
      {/* 侧边栏内容 */}
      <div className="p-4">
        {!collapsed && (
          <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
            面宝
          </h2>
        )}
        
        <button
          onClick={() => onCollapseChange?.(!collapsed)}
          className="w-full text-left p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {collapsed ? '→' : '← 收起'}
        </button>
      </div>
    </aside>
  )
}

interface PageTransitionProps {
  children: React.ReactNode
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  )
}

interface MicroInteractionProps {
  children: React.ReactNode
  className?: string
}

export const MicroInteraction: React.FC<MicroInteractionProps> = ({ children, className = '' }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

interface MicrophoneDevice {
  deviceId: string
  label: string
  isDefault: boolean
}

interface MicrophoneSelectorProps {
  currentDeviceId: string // 改用 deviceId 而非 label
  isDarkMode: boolean
  onDeviceChange?: (deviceId: string, label: string) => void
  className?: string
}

const MicrophoneSelector: React.FC<MicrophoneSelectorProps> = ({
  currentDeviceId,
  isDarkMode,
  onDeviceChange,
  className
}) => {
  const [devices, setDevices] = useState<MicrophoneDevice[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(currentDeviceId || '')
  const [isLoading, setIsLoading] = useState(true)

  // 使用 ref 保存最新的 selectedDeviceId，避免闭包问题
  const selectedDeviceIdRef = useRef(selectedDeviceId)
  const onDeviceChangeRef = useRef(onDeviceChange)

  // 同步 ref 和 state
  useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId
  }, [selectedDeviceId])

  useEffect(() => {
    onDeviceChangeRef.current = onDeviceChange
  }, [onDeviceChange])

  // 加载可用的麦克风设备
  const loadDevices = useCallback(async () => {
    // 安全检查：确保 navigator.mediaDevices 存在
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('浏览器不支持 getUserMedia')
      setDevices([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      // 先枚举设备，必要时再申请权限以获取设备标签
      let deviceList = await navigator.mediaDevices.enumerateDevices()
      let audioInputs = deviceList.filter(device => device.kind === 'audioinput')
      const needsPermission = audioInputs.length === 0 || audioInputs.every(device => !device.label)

      if (needsPermission) {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        tempStream.getTracks().forEach(track => track.stop())
        deviceList = await navigator.mediaDevices.enumerateDevices()
        audioInputs = deviceList.filter(device => device.kind === 'audioinput')
      }

      const micDevices: MicrophoneDevice[] = audioInputs.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `麦克风 ${device.deviceId.substring(0, 8)}`,
        isDefault: device.deviceId === 'default'
      }))

      setDevices(micDevices)

      // 使用 ref 获取最新的 selectedDeviceId，避免闭包问题
      const currentSelectedId = selectedDeviceIdRef.current
      const currentDeviceExists = micDevices.some(d => d.deviceId === currentSelectedId)

      if (!currentDeviceExists && micDevices.length > 0) {
        // 当前设备已被拔出，回退到默认设备
        const defaultDevice = micDevices.find(d => d.isDefault) || micDevices[0]
        setSelectedDeviceId(defaultDevice.deviceId)
        console.log('设备已拔出，回退到:', defaultDevice.label)

        // 通知父组件设备已自动切换
        if (onDeviceChangeRef.current) {
          onDeviceChangeRef.current(defaultDevice.deviceId, defaultDevice.label)
        }
      } else if (!currentSelectedId && micDevices.length > 0) {
        // 首次加载，选择默认设备
        const defaultDevice = micDevices.find(d => d.isDefault) || micDevices[0]
        setSelectedDeviceId(defaultDevice.deviceId)

        // 首次加载时也通知父组件
        if (onDeviceChangeRef.current) {
          onDeviceChangeRef.current(defaultDevice.deviceId, defaultDevice.label)
        }
      }
    } catch (error) {
      console.error('加载麦克风设备失败:', error)
      setDevices([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 组件挂载时加载设备
  useEffect(() => {
    loadDevices()

    // 监听设备变化
    const handleDeviceChange = () => {
      loadDevices()
    }

    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    }

    return () => {
      if (navigator.mediaDevices) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
      }
    }
  }, [loadDevices])

  // 当外部传入的 currentDeviceId 变化时更新选中状态
  useEffect(() => {
    if (currentDeviceId && currentDeviceId !== selectedDeviceId) {
      setSelectedDeviceId(currentDeviceId)
    }
  }, [currentDeviceId, selectedDeviceId])

  const handleSelectDevice = (device: MicrophoneDevice) => {
    setSelectedDeviceId(device.deviceId)
    setIsOpen(false)

    // 通知父组件设备变化
    if (onDeviceChangeRef.current) {
      onDeviceChangeRef.current(device.deviceId, device.label)
    }
  }

  const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId)
  const displayLabel = selectedDevice?.label || '选择麦克风'

  if (isLoading) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100/50',
        className
      )}>
        <Mic className="w-4 h-4 text-gray-400 animate-pulse" />
        <span className="text-sm text-gray-400">加载中...</span>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {/* 选择器按钮 */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer min-w-[200px]',
          isDarkMode
            ? 'bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/50'
            : 'bg-white/80 hover:bg-gray-50/80 border border-gray-200/50'
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Mic className={cn(
            'w-4 h-4 flex-shrink-0',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )} />
          <span className={cn(
            'text-sm font-medium truncate',
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          )}>
            {displayLabel}
          </span>
        </div>
        <ChevronDown className={cn(
          'w-4 h-4 flex-shrink-0 transition-transform duration-200',
          isOpen && 'rotate-180',
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        )} />
      </motion.button>

      {/* 下拉列表 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 遮罩层 */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* 下拉菜单 */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute top-full left-0 right-0 mt-2 rounded-lg shadow-2xl border z-50 overflow-hidden',
                isDarkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              )}
            >
              <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
                {devices.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <Mic className={cn(
                      'w-8 h-8 mx-auto mb-2',
                      isDarkMode ? 'text-gray-600' : 'text-gray-400'
                    )} />
                    <p className={cn(
                      'text-sm',
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    )}>
                      未找到可用的麦克风设备
                    </p>
                  </div>
                ) : (
                  devices.map((device, index) => {
                    const isSelected = device.deviceId === selectedDeviceId

                    return (
                      <motion.button
                        key={device.deviceId}
                        onClick={() => handleSelectDevice(device)}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ x: 4 }}
                        className={cn(
                          'w-full flex items-center justify-between gap-3 px-4 py-3 transition-all cursor-pointer',
                          isSelected
                            ? isDarkMode
                              ? 'bg-white/10'
                              : 'bg-gray-100'
                            : isDarkMode
                              ? 'hover:bg-white/5'
                              : 'hover:bg-gray-50'
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            isSelected
                              ? isDarkMode
                                ? 'bg-white/15'
                                : 'bg-gray-200'
                              : isDarkMode
                                ? 'bg-gray-700/50'
                                : 'bg-gray-100'
                          )}>
                            <Mic className={cn(
                              'w-4 h-4',
                              isSelected
                                ? isDarkMode ? 'text-white' : 'text-gray-900'
                                : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            )} />
                          </div>
                          <div className="flex flex-col items-start flex-1 min-w-0">
                            <span className={cn(
                              'text-sm font-medium truncate w-full text-left',
                              isSelected
                                ? isDarkMode ? 'text-white' : 'text-gray-900'
                                : isDarkMode ? 'text-gray-200' : 'text-gray-700'
                            )}>
                              {device.label}
                            </span>
                            {device.isDefault && (
                              <span className={cn(
                                'text-xs mt-0.5',
                                isDarkMode ? 'text-gray-500' : 'text-gray-500'
                              )}>
                                默认设备
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={cn(
                              'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                              isDarkMode ? 'bg-white' : 'bg-gray-900'
                            )}
                          >
                            <Check className={cn(
                              'w-3 h-3',
                              isDarkMode ? 'text-gray-900' : 'text-white'
                            )} />
                          </motion.div>
                        )}
                      </motion.button>
                    )
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MicrophoneSelector

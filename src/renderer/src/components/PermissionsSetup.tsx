import React, { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Settings, 
  Mic, 
  Monitor, 
  Key, 
  Volume2,
  RefreshCw,
  ExternalLink,
  Play,
  Loader2
} from 'lucide-react'

interface PermissionStatus {
  granted: boolean
  canRequest: boolean
  message: string
}

interface SystemPermissions {
  screenRecording: PermissionStatus
  microphone: PermissionStatus
  apiKey: PermissionStatus
  audioDevice: PermissionStatus
}

interface PermissionsSetupProps {
  onComplete: () => void
  onSkip: () => void
  isOpen: boolean
}

const PermissionsSetup: React.FC<PermissionsSetupProps> = ({ onComplete, onSkip, isOpen }) => {
  const [permissions, setPermissions] = useState<SystemPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, any>>({})

  useEffect(() => {
    if (isOpen) {
      checkAllPermissions()
    }
  }, [isOpen])

  const checkAllPermissions = async () => {
    setLoading(true)
    try {
      const result = await window.bready.checkPermissions()
      setPermissions(result)
    } catch (error) {
      console.error('检查权限失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const openSystemPreferences = async (pane: string) => {
    try {
      await window.bready.openSystemPreferences(pane)
      // 等待用户设置权限后重新检查
      setTimeout(checkAllPermissions, 2000)
    } catch (error) {
      console.error('打开系统偏好设置失败:', error)
    }
  }

  const testAudioCapture = async () => {
    setTesting('audio')
    try {
      const result = await window.bready.testAudioCapture()
      setTestResults(prev => ({ ...prev, audio: result }))
      
      // 测试后重新检查权限状态
      setTimeout(checkAllPermissions, 1000)
    } catch (error) {
      console.error('音频测试失败:', error)
      setTestResults(prev => ({ 
        ...prev, 
        audio: { success: false, message: '测试失败' }
      }))
    } finally {
      setTesting(null)
    }
  }

  const requestMicrophonePermission = async () => {
    setTesting('microphone')
    try {
      const result = await window.bready.requestMicrophonePermission()
      setTestResults(prev => ({ ...prev, microphone: result }))
      
      // 请求后重新检查权限状态
      setTimeout(checkAllPermissions, 1000)
    } catch (error) {
      console.error('请求麦克风权限失败:', error)
    } finally {
      setTesting(null)
    }
  }

  const getStatusIcon = (status: PermissionStatus) => {
    if (status.granted) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else if (status.canRequest) {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />
    }
  }

  const getStatusText = (status: PermissionStatus) => {
    if (status.granted) return '已授予'
    if (status.canRequest) return '需要设置'
    return '被拒绝'
  }

  const allPermissionsGranted = permissions && 
    permissions.screenRecording.granted && 
    permissions.microphone.granted && 
    permissions.apiKey.granted && 
    permissions.audioDevice.granted

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-black">Live Interview 权限设置</h2>
          <p className="text-gray-600 mt-2">
            为了确保 Live Interview 模式正常工作，需要配置以下权限和设置
          </p>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">检查权限状态...</span>
            </div>
          ) : permissions ? (
            <>
              {/* 屏幕录制权限 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Monitor className="w-6 h-6 text-gray-700" />
                    <div>
                      <h3 className="font-medium text-black">屏幕录制权限</h3>
                      <p className="text-sm text-gray-600">用于捕获系统音频</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(permissions.screenRecording)}
                    <span className="text-sm font-medium">
                      {getStatusText(permissions.screenRecording)}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {permissions.screenRecording.message}
                </p>
                
                {!permissions.screenRecording.granted && (
                  <button
                    onClick={() => openSystemPreferences('screen-recording')}
                    className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>打开系统偏好设置</span>
                  </button>
                )}
              </div>

              {/* 麦克风权限 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Mic className="w-6 h-6 text-gray-700" />
                    <div>
                      <h3 className="font-medium text-black">麦克风权限</h3>
                      <p className="text-sm text-gray-600">用于语音输入（可选）</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(permissions.microphone)}
                    <span className="text-sm font-medium">
                      {getStatusText(permissions.microphone)}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {permissions.microphone.message}
                </p>
                
                <div className="flex space-x-2">
                  {!permissions.microphone.granted && permissions.microphone.canRequest && (
                    <button
                      onClick={requestMicrophonePermission}
                      disabled={testing === 'microphone'}
                      className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {testing === 'microphone' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                      <span>请求权限</span>
                    </button>
                  )}
                  
                  {!permissions.microphone.granted && !permissions.microphone.canRequest && (
                    <button
                      onClick={() => openSystemPreferences('microphone')}
                      className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>打开系统偏好设置</span>
                    </button>
                  )}
                </div>
                
                {testResults.microphone && (
                  <div className={`mt-3 p-3 rounded-lg ${
                    testResults.microphone.granted ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    {testResults.microphone.message}
                  </div>
                )}
              </div>

              {/* API 密钥状态 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Key className="w-6 h-6 text-gray-700" />
                    <div>
                      <h3 className="font-medium text-black">Gemini API 密钥</h3>
                      <p className="text-sm text-gray-600">用于 AI 功能</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(permissions.apiKey)}
                    <span className="text-sm font-medium">
                      {getStatusText(permissions.apiKey)}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {permissions.apiKey.message}
                </p>
                
                {!permissions.apiKey.granted && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      请在 .env.local 文件中配置 VITE_GEMINI_API_KEY
                    </p>
                  </div>
                )}
              </div>

              {/* 音频设备状态 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Volume2 className="w-6 h-6 text-gray-700" />
                    <div>
                      <h3 className="font-medium text-black">音频设备</h3>
                      <p className="text-sm text-gray-600">系统音频捕获功能</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(permissions.audioDevice)}
                    <span className="text-sm font-medium">
                      {getStatusText(permissions.audioDevice)}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {permissions.audioDevice.message}
                </p>
                
                <div className="flex space-x-2">
                  <button
                    onClick={testAudioCapture}
                    disabled={testing === 'audio'}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {testing === 'audio' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>测试音频捕获</span>
                  </button>

                  {!permissions.audioDevice.granted && (
                    <button
                      onClick={() => openSystemPreferences('privacy_ScreenCapture')}
                      className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>去设置</span>
                    </button>
                  )}
                </div>
                
                {testResults.audio && (
                  <div className={`mt-3 p-3 rounded-lg ${
                    testResults.audio.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    <div className="font-medium">{testResults.audio.message}</div>

                    {testResults.audio.audioData !== undefined && (
                      <div className="text-xs mt-1">
                        捕获数据: {testResults.audio.audioData} 字节
                        {testResults.audio.silencePercentage !== undefined && (
                          <span className="ml-2">
                            静音: {testResults.audio.silencePercentage.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    )}

                    {testResults.audio.recommendation && (
                      <div className="text-sm mt-2 p-2 bg-white bg-opacity-50 rounded border-l-2 border-current">
                        💡 建议: {testResults.audio.recommendation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-600">
              无法检查权限状态
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button
            onClick={onSkip}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            跳过设置
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={checkAllPermissions}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>重新检查</span>
            </button>
            
            <button
              onClick={onComplete}
              disabled={!allPermissionsGranted}
              className={`px-6 py-2 rounded-lg transition-colors ${
                allPermissionsGranted
                  ? 'bg-black text-white hover:bg-gray-800'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {allPermissionsGranted ? '开始 Live Interview' : '完成权限设置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PermissionsSetup

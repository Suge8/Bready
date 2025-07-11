import React, { useState } from 'react'

const TestPage: React.FC = () => {
  const [apiKeyStatus, setApiKeyStatus] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('')
  const handleCreateFloatingWindow = async () => {
    try {
      console.log('Attempting to create floating window...')
      const success = await window.bready.createFloatingWindow()
      console.log('Create floating window result:', success)
      if (success) {
        alert('悬浮窗创建成功！')
      } else {
        alert('悬浮窗创建失败')
      }
    } catch (error) {
      console.error('Error creating floating window:', error)
      alert(`错误：${error.message}`)
    }
  }

  const handleCloseFloatingWindow = async () => {
    try {
      const success = await window.bready.closeFloatingWindow()
      console.log('Close floating window result:', success)
      if (success) {
        alert('悬浮窗关闭成功！')
      } else {
        alert('悬浮窗关闭失败')
      }
    } catch (error) {
      console.error('Error closing floating window:', error)
      alert(`错误：${error.message}`)
    }
  }

  const testApiKey = () => {
    console.log('Testing API key...')
    const apiKey = window.env?.GEMINI_API_KEY
    console.log('Environment variables:', window.env)

    if (apiKey) {
      setApiKeyStatus(`API密钥已找到: ${apiKey.substring(0, 10)}...`)
    } else {
      setApiKeyStatus('API密钥未找到')
    }
  }

  const testConnection = async () => {
    try {
      setConnectionStatus('正在测试连接...')
      const apiKey = window.env?.GEMINI_API_KEY
      if (!apiKey) {
        setConnectionStatus('错误：未找到API密钥')
        return
      }

      const success = await window.bready.initializeGemini(apiKey, '', 'interview', 'cmn-CN')

      if (success) {
        setConnectionStatus('连接成功！')
      } else {
        setConnectionStatus('连接失败')
      }
    } catch (error) {
      setConnectionStatus(`连接错误: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-8">悬浮窗测试页面</h1>
        
        <div className="space-y-4">
          <div>
            <button
              onClick={testApiKey}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-2"
            >
              测试API密钥
            </button>
            <p className="text-sm text-gray-600">{apiKeyStatus}</p>
          </div>

          <div>
            <button
              onClick={testConnection}
              className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 mb-2"
            >
              测试Gemini连接
            </button>
            <p className="text-sm text-gray-600">{connectionStatus}</p>
          </div>

          <button
            onClick={handleCreateFloatingWindow}
            className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            创建悬浮窗
          </button>

          <button
            onClick={handleCloseFloatingWindow}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            关闭悬浮窗
          </button>
        </div>

        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h2 className="font-semibold mb-2">环境变量状态：</h2>
          <pre className="text-xs bg-white p-2 rounded border overflow-auto">
            {JSON.stringify(window.env, null, 2)}
          </pre>
        </div>

        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h2 className="font-semibold mb-2">调试信息：</h2>
          <p className="text-sm text-gray-600">
            请打开开发者工具查看控制台输出
          </p>
        </div>
      </div>
    </div>
  )
}

export default TestPage

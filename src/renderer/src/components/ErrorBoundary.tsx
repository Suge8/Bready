import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen overflow-hidden bg-white flex flex-col">
          <div className="flex-1 overflow-y-auto w-full p-6">
            <div className="min-h-full flex items-center justify-center">
              <div className="max-w-md w-full text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h1 className="text-xl font-bold text-black mb-2">出现了一些问题</h1>
                  <p className="text-gray-600 text-sm">
                    应用遇到了意外错误，请尝试刷新页面或重启应用。
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-black text-white py-2 px-4 rounded-xl hover:bg-gray-900 transition-colors"
                  >
                    刷新页面
                  </button>

                  <button
                    onClick={() => this.setState({ hasError: false })}
                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    重试
                  </button>
                </div>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-6 text-left group">
                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center justify-between select-none">
                      <span>查看错误详情</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const errorText = `Error: ${this.state.error?.message}\n\nStack:\n${this.state.error?.stack}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`
                          navigator.clipboard.writeText(errorText)
                          // Optional: visual feedback
                          const btn = e.currentTarget
                          const originalText = btn.innerText
                          btn.innerText = '已复制'
                          setTimeout(() => { btn.innerText = originalText }, 2000)
                        }}
                        className="text-xs text-blue-500 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        复制报错
                      </button>
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs font-mono text-gray-700 overflow-auto border border-gray-200">
                      <div className="mb-2">
                        <strong>错误:</strong> {this.state.error.message}
                      </div>
                      <div className="mb-2">
                        <strong>堆栈:</strong>
                        <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <strong>组件堆栈:</strong>
                          <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

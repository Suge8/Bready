import React, { Component, ErrorInfo, ReactNode } from 'react'
import { useI18n } from '../contexts/I18nContext'

interface Props {
  children: ReactNode
}

interface ErrorBoundaryCopy {
  title: string
  description: string
  reload: string
  retry: string
  details: string
  copy: string
  copied: string
  labels: {
    error: string
    stack: string
    componentStack: string
  }
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class ErrorBoundaryCore extends Component<Props & { copy: ErrorBoundaryCopy }, State> {
  constructor(props: Props & { copy: ErrorBoundaryCopy }) {
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
      const { copy } = this.props
      return (
        <div className="h-screen w-screen overflow-hidden bg-[var(--bready-bg)] flex flex-col">
          <div className="flex-1 overflow-y-auto w-full p-6">
            <div className="min-h-full flex items-center justify-center">
              <div className="max-w-md w-full text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h1 className="text-xl font-bold text-[var(--bready-text)] mb-2">{copy.title}</h1>
                  <p className="text-[var(--bready-text-muted)] text-sm">
                    {copy.description}
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-black text-white dark:bg-white dark:text-black py-2 px-4 rounded-xl hover:opacity-90 transition-colors cursor-pointer"
                  >
                    {copy.reload}
                  </button>

                  <button
                    onClick={() => this.setState({ hasError: false })}
                    className="w-full bg-[var(--bready-surface-2)] text-[var(--bready-text)] py-2 px-4 rounded-xl hover:bg-[var(--bready-surface-3)] transition-colors"
                  >
                    {copy.retry}
                  </button>
                </div>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-6 text-left group">
                    <summary className="cursor-pointer text-sm text-[var(--bready-text-muted)] hover:text-[var(--bready-text)] flex items-center justify-between select-none">
                      <span>{copy.details}</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const errorText = `Error: ${this.state.error?.message}\n\nStack:\n${this.state.error?.stack}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`
                          navigator.clipboard.writeText(errorText)
                          // Optional: visual feedback
                          const btn = e.currentTarget
                          const originalText = btn.innerText
                          btn.innerText = copy.copied
                          setTimeout(() => { btn.innerText = originalText }, 2000)
                        }}
                        className="text-xs text-[var(--bready-text)] font-medium px-2 py-1 rounded hover:bg-[var(--bready-surface-2)] transition-colors"
                      >
                        {copy.copy}
                      </button>
                    </summary>
                    <div className="mt-2 p-3 bg-[var(--bready-surface-2)] rounded-lg text-xs font-mono text-[var(--bready-text)] overflow-auto border border-[var(--bready-border)]">
                      <div className="mb-2">
                        <strong>{copy.labels.error}:</strong> {this.state.error.message}
                      </div>
                      <div className="mb-2">
                        <strong>{copy.labels.stack}:</strong>
                        <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <strong>{copy.labels.componentStack}:</strong>
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

const ErrorBoundary: React.FC<Props> = ({ children }) => {
  const { t } = useI18n()
  const copy: ErrorBoundaryCopy = {
    title: t('errorBoundary.title'),
    description: t('errorBoundary.description'),
    reload: t('errorBoundary.reload'),
    retry: t('errorBoundary.retry'),
    details: t('errorBoundary.details'),
    copy: t('errorBoundary.copy'),
    copied: t('errorBoundary.copied'),
    labels: {
      error: t('errorBoundary.labels.error'),
      stack: t('errorBoundary.labels.stack'),
      componentStack: t('errorBoundary.labels.componentStack')
    }
  }

  return <ErrorBoundaryCore copy={copy}>{children}</ErrorBoundaryCore>
}

export default ErrorBoundary

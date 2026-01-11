import { useState, useEffect, useRef } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/button'
import { paymentService } from '../lib/api-client'
import { useTheme } from './ui/theme-provider'
import { cn } from '../lib/utils'
import { CheckCircle, XCircle, Loader2, ExternalLink, Clock } from 'lucide-react'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  orderNo: string
  payUrl?: string
  qrcodeUrl?: string
  amount: number
  onPaymentSuccess: () => void
}

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired'

export function PaymentModal({
  isOpen,
  onClose,
  orderNo,
  payUrl,
  qrcodeUrl,
  amount,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [status, setStatus] = useState<PaymentStatus>('pending')
  const { resolvedTheme } = useTheme()
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPaidRef = useRef(false)

  useEffect(() => {
    if (isOpen) {
      setStatus('pending')
      isPaidRef.current = false
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
        closeTimeoutRef.current = null
      }
    }
  }, [isOpen, orderNo])

  useEffect(() => {
    if (!isOpen || status !== 'pending' || isPaidRef.current) return

    const checkStatus = async () => {
      try {
        const result = await paymentService.queryOrder(orderNo)
        if (result.success && result.status) {
          if (result.status !== 'pending') {
            setStatus(result.status)

            if (result.status === 'paid' && !isPaidRef.current) {
              isPaidRef.current = true
              onPaymentSuccess()
              closeTimeoutRef.current = setTimeout(() => {
                onClose()
              }, 2000)
            }
          }
        }
      } catch (error) {
        console.error('Failed to query order status:', error)
      }
    }

    checkStatus()

    pollTimerRef.current = setInterval(checkStatus, 3000)

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [isOpen, orderNo, status, onPaymentSuccess, onClose])

  const handleOpenPayUrl = () => {
    if (payUrl) {
      window.open(payUrl, '_blank')
    }
  }

  const renderContent = () => {
    switch (status) {
      case 'paid':
        return (
          <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in duration-300">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
              <CheckCircle className="w-20 h-20 text-green-500 relative z-10" />
            </div>
            <h3 className="text-2xl font-bold text-green-500 mb-2">支付成功!</h3>
            <p className="text-[var(--bready-text-muted)]">正在为您开通权益...</p>
          </div>
        )

      case 'expired':
        return (
          <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in duration-300">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
              <Clock className="w-20 h-20 text-red-500 relative z-10" />
            </div>
            <h3 className="text-2xl font-bold text-red-500 mb-2">订单已过期</h3>
            <p className="text-[var(--bready-text-muted)] mb-6">请重新发起支付</p>
            <Button onClick={onClose} variant="outline" className="min-w-[120px]">
              关闭
            </Button>
          </div>
        )

      case 'failed':
        return (
          <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in duration-300">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
              <XCircle className="w-20 h-20 text-red-500 relative z-10" />
            </div>
            <h3 className="text-2xl font-bold text-red-500 mb-2">支付失败</h3>
            <p className="text-[var(--bready-text-muted)] mb-6">请稍后重试</p>
            <Button onClick={onClose} variant="outline" className="min-w-[120px]">
              关闭
            </Button>
          </div>
        )

      default:
        return (
          <div className="flex flex-col items-center py-4 space-y-6">
            <div className="text-center space-y-1">
              <p className="text-sm text-[var(--bready-text-muted)]">支付金额</p>
              <div className="text-4xl font-bold text-[var(--bready-text)]">
                ¥ {amount.toFixed(2)}
              </div>
            </div>

            <div
              className={cn(
                'relative p-4 rounded-xl border border-[var(--bready-border)] bg-white shadow-sm transition-all duration-300',
                'hover:shadow-md',
              )}
            >
              {qrcodeUrl ? (
                <div className="relative group">
                  <img
                    src={qrcodeUrl}
                    alt="Payment QR Code"
                    className="w-[200px] h-[200px] object-contain rounded-lg"
                  />
                  <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                    <div className="absolute w-full h-[2px] bg-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-[scan_2s_linear_infinite]" />
                  </div>
                </div>
              ) : (
                <div className="w-[200px] h-[200px] flex flex-col items-center justify-center bg-[var(--bready-surface-muted)] rounded-lg text-[var(--bready-text-muted)]">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <span className="text-sm">加载二维码...</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center space-y-3 w-full">
              <div className="flex items-center space-x-2 text-sm text-[var(--bready-text-muted)]">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span>等待支付中...</span>
              </div>

              {payUrl && (
                <Button
                  onClick={handleOpenPayUrl}
                  className="w-full max-w-[240px] bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  前往支付页面
                </Button>
              )}

              <p className="text-xs text-[var(--bready-text-muted)] opacity-70">
                支付完成后将自动跳转
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={status === 'pending' ? '收银台' : ''}
      size="sm"
      className={cn(
        'transition-all duration-300',
        resolvedTheme === 'dark' ? 'bg-[#1a1b1e]/95' : 'bg-white/95',
      )}
    >
      {renderContent()}
    </Modal>
  )
}

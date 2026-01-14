import type {
  UserProfile,
  UserLevel,
  InterviewUsageRecord,
  AiConfigDisplay,
  PaymentConfigDisplay,
  SmsConfigDisplay,
  LoginConfigDisplay,
} from '../../lib/api-client'

export type TabType = 'users' | 'usage' | 'ai' | 'payment' | 'login'

export interface UsageRecordWithUser extends InterviewUsageRecord {
  full_name?: string
  username?: string
  email?: string
}

export interface AiTestStatus {
  gemini: { tested: boolean; success: boolean; loading: boolean }
  doubaoChat: { tested: boolean; success: boolean; loading: boolean }
  doubaoAsr: { tested: boolean; success: boolean; loading: boolean }
}

export interface EmailConfig {
  smtpServer: string
  port: string
  senderEmail: string
  authCode: string
  enableSsl: boolean
  enableVerification: boolean
}

export interface DeleteConfirm {
  show: boolean
  user: UserProfile | null
}

export type {
  UserProfile,
  UserLevel,
  AiConfigDisplay,
  PaymentConfigDisplay,
  SmsConfigDisplay,
  LoginConfigDisplay,
}

export type ExpandedCardType = 'email' | 'phone' | 'wechat' | 'google' | null

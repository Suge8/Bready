export type UserLevel = '小白' | '螺丝钉' | '大牛' | '管理' | '超级'
export type UserRole = 'user' | 'admin' | UserLevel

export interface UserProfile {
  id: string
  username?: string
  email: string
  full_name?: string
  avatar_url?: string
  role: UserRole
  user_level: UserLevel
  membership_expires_at?: string
  remaining_interview_minutes: number
  total_purchased_minutes: number
  discount_rate: number
  created_at: string
  updated_at: string
}

export interface MembershipPackage {
  id: string
  name: string
  price: number
  interview_minutes: number
  validity_days: number
  is_active: boolean
}

export interface PaymentOrder {
  order_no: string
  user_id: string
  package_id: string
  amount: number
  status: 'pending' | 'paid' | 'expired' | 'cancelled'
  payment_provider: string
  payment_channel: string
  trade_no?: string
  paid_at?: Date
  expired_at?: Date
  created_at: Date
  package_name?: string
}

export interface PurchaseRecord {
  id: string
  user_id: string
  package_id: string
  original_price: number
  actual_price: number
  discount_rate: number
  interview_minutes: number
  expires_at: Date
  status: string
  payment_method?: string
  created_at: Date
  package_name?: string
  package_level?: string
}

export interface CollabSession {
  id: string
  user_id: string
  remaining_ms_at_start: number
  started_at: Date
  expires_at: Date
  last_seen_at: Date
  ended_at?: Date
  end_reason?: string
  consumed_ms?: number
}

export interface UsageRecord {
  id: string
  user_id: string
  preparation_id?: string
  session_type: string
  minutes_used: number
  started_at: Date
  ended_at?: Date
  created_at: Date
  preparation_name?: string
  full_name?: string
  username?: string
  email?: string
  avatar_url?: string
}

export interface Preparation {
  id: string
  user_id: string
  name: string
  job_description?: string
  resume?: string
  analysis?: string
  is_analyzing: boolean
  created_at: Date
  updated_at: Date
}

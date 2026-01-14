import React, { createContext, useContext, useEffect, useState } from 'react'
import { authService, userProfileService, UserProfile } from '../lib/api-client'

type SupabaseUser = {
  id: string
  email?: string
  user_metadata?: Record<string, any>
}

type SupabaseSession = {
  user: SupabaseUser | null
}

interface AuthContextType {
  user: SupabaseUser | null
  session: SupabaseSession | null
  profile: UserProfile | null
  loading: boolean
  isSigningOut: boolean
  signIn: (email: string, password: string, delay?: number) => Promise<any>
  signUp: (email: string, password: string, userData?: { full_name?: string }) => Promise<any>
  signInWithGoogle: (code: string) => Promise<any>
  signInWithPhone: (phone: string) => Promise<any>
  verifyOtp: (phone: string, token: string) => Promise<any>
  signOut: (delay?: number) => Promise<any>
  completeOnboarding: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [session, setSession] = useState<SupabaseSession | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    console.log('AuthProvider: Starting initialization')

    // 获取初始会话
    const getInitialSession = async () => {
      try {
        console.log('AuthProvider: Getting initial session')
        const {
          data: { session },
          error,
        } = await authService.getCurrentSession()

        if (error) {
          console.error('AuthProvider: Error getting session:', error)
        }

        console.log('AuthProvider: Initial session:', session)
        setSession(session)
        setUser(session?.user ?? null)

        // 加载用户配置
        if (session?.user) {
          try {
            await loadUserProfile(session.user.id)
          } catch (error) {
            console.error('Error loading user profile on initial session:', error)
            // 即使加载失败也继续
          }
        }

        console.log('AuthProvider: Initial session setup complete')
      } catch (error) {
        console.error('AuthProvider: Error in getInitialSession:', error)
      } finally {
        console.log('AuthProvider: Setting loading to false')
        setLoading(false)
      }
    }

    getInitialSession()

    // 监听认证状态变化
    try {
      const {
        data: { subscription },
      } = authService.onAuthStateChange(async (event, session) => {
        console.log('AuthProvider: Auth state changed:', event, session)
        setSession(session)
        setUser(session?.user ?? null)

        // 处理用户配置
        if (session?.user) {
          try {
            await loadUserProfile(session.user.id)
          } catch (error) {
            console.error('Error loading user profile on auth change:', error)
            setProfile(null)
          } finally {
            setLoading(false)
          }
        } else {
          setProfile(null)
          setLoading(false)
          setIsSigningOut(false)
        }
      })

      return () => {
        console.log('AuthProvider: Cleaning up subscription')
        subscription.unsubscribe()
      }
    } catch (error) {
      console.error('AuthProvider: Error setting up auth listener:', error)
      setLoading(false)
    }
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      let userProfile = await userProfileService.getProfile(userId)

      // 如果用户配置不存在，创建一个
      if (!userProfile) {
        const currentUser = await authService.getCurrentUser()
        if (currentUser.data.user) {
          userProfile = await userProfileService.upsertProfile({
            id: userId,
            full_name:
              currentUser.data.user.user_metadata?.full_name ||
              currentUser.data.user.email ||
              'User',
            role: 'user',
          })
        }
      }

      setProfile(userProfile)
    } catch (error) {
      console.error('Error loading user profile:', error)
      // 即使出错也要设置 profile 为 null，避免无限加载
      setProfile(null)
    }
  }

  const signIn = async (email: string, password: string, delay?: number) => {
    try {
      const deferCommit = !!(delay && delay > 0)
      const result = await authService.signInWithEmail(email, password, deferCommit)

      if (!result.error && result.data.session && deferCommit) {
        setTimeout(() => {
          authService.commitSession(result.data.session)
        }, delay)
      }

      return result
    } catch (error) {
      throw error
    }
  }

  const signUp = async (email: string, password: string, userData?: { full_name?: string }) => {
    try {
      const result = await authService.signUpWithEmail(email, password, userData)
      return result
    } catch (error) {
      throw error
    }
  }

  const signInWithGoogle = async (code: string) => {
    setLoading(true)
    try {
      const result = await authService.signInWithGoogle(code)
      return result
    } finally {
      setLoading(false)
    }
  }

  const signInWithPhone = async (phone: string) => {
    setLoading(true)
    try {
      const result = await authService.signInWithPhone(phone)
      return result
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (phone: string, token: string) => {
    setLoading(true)
    try {
      const result = await authService.verifyOtp(phone, token)
      return result
    } finally {
      setLoading(false)
    }
  }

  const signOut = async (delay?: number) => {
    setIsSigningOut(true)

    if (delay && delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    try {
      const result = await authService.signOut()
      if (result.error) {
        throw result.error
      }
      return result
    } catch (error) {
      console.error('Error during sign out:', error)
      throw error
    }
  }

  const completeOnboarding = async () => {
    if (!user?.id) return
    const updatedProfile = await userProfileService.completeOnboarding(user.id)
    setProfile(updatedProfile)
  }

  const value = {
    user,
    session,
    profile,
    loading,
    isSigningOut,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithPhone,
    verifyOtp,
    signOut,
    completeOnboarding,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

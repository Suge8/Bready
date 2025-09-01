import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

const AuthTestPage: React.FC = () => {
  const { user, session, profile, loading, signIn, signUp, signOut } = useAuth()
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('password123')
  const [fullName, setFullName] = useState('Test User')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSignUp = async () => {
    setError('')
    setSuccess('')
    try {
      const { data, error } = await signUp(email, password, { full_name: fullName })
      if (error) {
        setError(error.message)
      } else {
        setSuccess('注册成功！请检查邮箱确认链接。')
      }
    } catch (err: any) {
      setError(err.message || '注册失败')
    }
  }

  const handleSignIn = async () => {
    setError('')
    setSuccess('')
    try {
      const { data, error } = await signIn(email, password)
      if (error) {
        setError(error.message)
      } else {
        setSuccess('登录成功！')
      }
    } catch (err: any) {
      setError(err.message || '登录失败')
    }
  }

  const handleSignOut = async () => {
    setError('')
    setSuccess('')
    try {
      await signOut()
      setSuccess('已退出登录')
    } catch (err: any) {
      setError(err.message || '退出失败')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>认证系统测试</CardTitle>
            <CardDescription>测试 Supabase 认证功能</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg">
                {success}
              </div>
            )}

            {user ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">已登录用户信息</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>用户ID:</strong> {user.id}</p>
                    <p><strong>邮箱:</strong> {user.email}</p>
                    <p><strong>创建时间:</strong> {new Date(user.created_at).toLocaleString()}</p>
                    {profile && (
                      <>
                        <p><strong>姓名:</strong> {profile.full_name}</p>
                        <p><strong>角色:</strong> {profile.role}</p>
                      </>
                    )}
                  </div>
                </div>
                
                <Button onClick={handleSignOut} variant="outline">
                  退出登录
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="请输入姓名"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="请输入邮箱"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入密码"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <Button onClick={handleSignUp}>
                    注册新用户
                  </Button>
                  <Button onClick={handleSignIn} variant="outline">
                    登录
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>会话信息</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-4 rounded-lg overflow-auto">
              {JSON.stringify({ user, session, profile }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AuthTestPage

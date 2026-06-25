'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'login' | 'register'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || '로그인에 실패했습니다.')
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('서버 연결에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    try {
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || '회원가입에 실패했습니다.')
        return
      }
      // After register, log in automatically
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, password: regPassword }),
      })
      if (!loginRes.ok) {
        setError('회원가입 완료. 로그인 탭에서 로그인해 주세요.')
        setTab('login')
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('서버 연결에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Lancerdesk</h1>
          <p className="text-gray-500 mt-1 text-sm">숨고 프리랜서 AI CRM</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              onClick={() => { setTab('login'); setError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => { setTab('register'); setError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === 'register'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              회원가입
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>
          )}

          {/* Register Form */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="8자 이상"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? '처리 중...' : '회원가입'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          <a href="/privacy" className="hover:text-gray-600 underline">개인정보처리방침</a>
        </p>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { Lock, Mail, KeyRound, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export const AuthScreen: React.FC = () => {
  const { signIn, signUp, isLoading } = useAppStore()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!email.trim() || !password.trim()) {
      setErrorMsg('이메일과 비밀번호를 모두 입력해 주세요.')
      return
    }

    if (password.length < 6) {
      setErrorMsg('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    setIsSubmitting(true)

    try {
      if (mode === 'signin') {
        const res = await signIn(email.trim(), password)
        if (!res.success) {
          setErrorMsg(res.error || '로그인에 실패했습니다.')
        }
      } else {
        const res = await signUp(email.trim(), password)
        if (!res.success) {
          setErrorMsg(res.error || '회원가입에 실패했습니다.')
        } else if (res.needsConfirmation) {
          setSuccessMsg(res.error || '가입 확인 메일이 발송되었습니다. 메일함의 확인 링크를 누른 후 로그인해 주세요.')
          setMode('signin')
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || '인증 처리 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0f12] text-slate-100 flex flex-col justify-center items-center px-4 py-8 select-none antialiased">
      <div className="w-full max-w-sm space-y-6 animate-in fade-in duration-200">
        {/* Brand Lock Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-blue-600/15 border border-blue-500/30 text-blue-400 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/10 mb-3">
            <Lock className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">비공개 스마트가계부</h1>
          <p className="text-xs text-slate-400">
            주소만으로는 접근할 수 없는 100% 비공개 개인 가계부입니다.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-850/90 border border-slate-750/90 rounded-3xl p-6 shadow-2xl space-y-5">
          {/* Signin / Signup Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900/80 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                setErrorMsg(null)
                setSuccessMsg(null)
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signin'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setErrorMsg(null)
                setSuccessMsg(null)
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              새 계정 만들기
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                이메일 주소
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="예: user@gmail.com"
                  className="w-full pl-10 pr-3.5 py-3 bg-slate-900/90 border border-slate-750 rounded-2xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                비밀번호
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자리 이상 비밀번호 입력"
                  className="w-full pl-10 pr-3.5 py-3 bg-slate-900/90 border border-slate-750 rounded-2xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting || isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'signin' ? '내 가계부 열기' : '계정 생성하고 시작하기'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Features Info Box */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-[11px] text-slate-400 space-y-2">
          <div className="flex items-center gap-1.5 text-blue-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>철저한 개인정보 보호</span>
          </div>
          <ul className="space-y-1 list-disc list-inside text-slate-400 leading-relaxed">
            <li>한 번 로그인하면 이 기기에 안전하게 보관되어 매번 로그인할 필요가 없습니다.</li>
            <li>로그인하지 않은 외부 방문자는 내역을 0건도 조회할 수 없습니다.</li>
            <li>기존 작성된 엑셀/내역 데이터는 최초 로그인 시 본인 계정으로 자동 귀속됩니다.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

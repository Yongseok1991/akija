import React, { useState, useEffect } from 'react'
import { Lock, User, KeyRound, ArrowRight, ShieldCheck, AlertCircle, Fingerprint } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { isBiometricAvailable, hasRegisteredBiometrics } from '../../utils/webAuthn'

export const AuthScreen: React.FC = () => {
  const { signIn, unlockWithBiometrics, isLoading } = useAppStore()

  const [username, setUsername] = useState('yongseok')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [canUseBio, setCanUseBio] = useState(false)

  useEffect(() => {
    async function checkBio() {
      const available = await isBiometricAvailable()
      const hasBio = hasRegisteredBiometrics()
      setCanUseBio(available && hasBio)
    }
    checkBio()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!username.trim() || !password.trim()) {
      setErrorMsg('아이디와 비밀번호를 모두 입력해 주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await signIn(username.trim(), password)
      if (!res.success) {
        setErrorMsg(res.error || '아이디 또는 비밀번호가 일치하지 않습니다.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || '로그인 처리 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBiometricAuth = async () => {
    setErrorMsg(null)
    setIsSubmitting(true)
    try {
      const res = await unlockWithBiometrics()
      if (!res.success) {
        setErrorMsg(res.error || '지문 인증에 실패했습니다.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || '지문 인증 중 오류가 발생했습니다.')
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
            소유자만 접근 가능한 100% 비공개 단독 가계부입니다.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#121418] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-sm font-bold text-slate-200">보안 로그인</span>
            <span className="text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 font-medium">
              소유자 전용
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                아이디
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="소유자 아이디 입력"
                  className="w-full pl-10 pr-3.5 py-3 bg-[#1a1d24] border border-slate-800 rounded-2xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-all font-mono"
                  required
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
                  placeholder="비밀번호 입력"
                  className="w-full pl-10 pr-3.5 py-3 bg-[#1a1d24] border border-slate-800 rounded-2xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                  required
                  autoFocus
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

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting || isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>가계부 열기</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Biometric Unlock Option (if registered) */}
            {canUseBio && (
              <button
                type="button"
                onClick={handleBiometricAuth}
                disabled={isSubmitting || isLoading}
                className="w-full py-3 bg-[#1a1d24] hover:bg-[#222630] border border-slate-750 text-slate-200 active:scale-[0.98] rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Fingerprint className="w-4 h-4 text-emerald-400" />
                <span>지문으로 잠금 해제</span>
              </button>
            )}
          </form>
        </div>

        {/* Security Features Info Box */}
        <div className="bg-[#121418] border border-slate-800 rounded-2xl p-4 text-[11px] text-slate-400 space-y-2">
          <div className="flex items-center gap-1.5 text-blue-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>비공개 단독 운영 원칙</span>
          </div>
          <ul className="space-y-1 list-disc list-inside text-slate-400 leading-relaxed">
            <li>외부인의 신규 회원가입은 완전히 차단되어 있습니다.</li>
            <li>로그인하지 않은 방문자는 가계부 데이터를 0건도 조회할 수 없습니다.</li>
            <li>한 번 로그인하면 이 기기에 안전하게 기억되어 매번 로그인할 필요가 없습니다.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

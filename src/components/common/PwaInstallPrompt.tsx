import React, { useState, useEffect } from 'react'
import { Download, X, Smartphone, Sparkles } from 'lucide-react'

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showGuideModal, setShowGuideModal] = useState(false)

  useEffect(() => {
    // 1. 이미 독립 실행형(Standalone/WebAPK)으로 실행 중인지 감지
    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')

    setIsStandalone(checkStandalone)

    // 2. 세션 중 닫았는지 확인
    const dismissed = sessionStorage.getItem('pwa_prompt_dismissed') === 'true'
    if (dismissed) {
      setIsDismissed(true)
    }

    // 3. beforeinstallprompt 이벤트 리스너 등록
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // 4. 앱 설치 완료 이벤트 리스너
    const handleAppInstalled = () => {
      setIsStandalone(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // 이미 풀스크린 독립 앱으로 실행 중이거나 사용자가 배너를 닫았으면 렌더링 안 함
  if (isStandalone || isDismissed) {
    return null
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // 시스템 네이티브 앱 설치 프롬프트 호출
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsStandalone(true)
      }
      setDeferredPrompt(null)
    } else {
      // 프롬프트 이벤트가 지원되지 않거나 지연된 경우 안내 팝업 열기
      setShowGuideModal(true)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    sessionStorage.setItem('pwa_prompt_dismissed', 'true')
  }

  return (
    <>
      {/* Top Floating PWA Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-4 py-2.5 flex items-center justify-between shadow-lg text-xs z-40 sticky top-0 border-b border-blue-400/30">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-bold block truncate text-[11px] sm:text-xs">
              주소창 없는 풀스크린 앱으로 설치
            </span>
            <span className="text-[10px] text-blue-100 block truncate">
              진짜 앱처럼 상단 주소창 없이 사용하세요
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-white text-blue-700 font-extrabold rounded-lg shadow active:scale-95 transition-all text-xs flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>앱 설치</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-white/70 hover:text-white rounded-md"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Samsung Internet Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-sm">주소창 없이 앱으로 설치하는 법</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-1.5">
                <span className="font-bold text-emerald-400 block text-xs">
                  방법 1: 주소창 우측 ⬇️ 아이콘 터치 (가장 추천)
                </span>
                <p className="text-slate-400 text-[11px]">
                  상단 주소창 맨 오른쪽 끝을 보시면 **다운로드(⬇️)** 아이콘이 있습니다. 이를 누르고 <b>[설치]</b>를 누르면 주소창이 완전히 사라집니다.
                </p>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-1.5">
                <span className="font-bold text-blue-400 block text-xs">
                  방법 2: 하단 ≡ 메뉴 사용 시 주의사항
                </span>
                <p className="text-slate-400 text-[11px]">
                  우측 하단 <b>≡ 메뉴 → [현재 페이지 추가]</b>를 누르면 옵션이 나옵니다.
                </p>
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200">
                  ⚠️ <b>'홈 화면'</b>을 누르면 브라우저 바로가기로 열려 주소창이 남습니다. 반드시 <b>'앱' (또는 '앱 설치')</b>을 선택해야 주소창이 제거됩니다!
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition-all"
            >
              확인했습니다
            </button>
          </div>
        </div>
      )}
    </>
  )
}

import { useEffect } from 'react'
import { Header } from './components/layout/Header'
import { BottomNav } from './components/layout/BottomNav'
import { DailySummary } from './components/daily/DailySummary'
import { TransactionList } from './components/daily/TransactionList'
import { CalendarView } from './components/calendar/CalendarView'
import { StatsView } from './components/stats/StatsView'
import { AssetOverview } from './components/assets/AssetOverview'
import { SettingsView } from './components/settings/SettingsView'
import { FastInputModal } from './components/input/FastInputModal'
import { ExcelImportModal } from './components/common/ExcelImportModal'
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt'
import { useAppStore } from './store/useAppStore'

export function App() {
  const { activeTab, isLoading, initCloudData, isExcelModalOpen, closeExcelModal } = useAppStore()

  // 100% Supabase 클라우드 데이터 즉시 로드
  useEffect(() => {
    initCloudData()
  }, [initCloudData])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0f12] text-slate-100 flex flex-col items-center justify-center space-y-3 select-none">
        <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-medium">Supabase 클라우드 연결 중...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0f12] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* PWA Fullscreen Install Banner (Only shown if running in browser with URL bar) */}
      <PwaInstallPrompt />

      {/* Sticky Top Month Header with Quick Month Nav & CSV button */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-3 pb-28">
        {/* 1번 탭 (첫 진입 화면): 해당 월 가계부 목록 */}
        {activeTab === 'daily' && (
          <div className="space-y-4">
            <DailySummary />
            <TransactionList />
          </div>
        )}

        {/* 2번 탭: 캘린더 (달력 뷰) */}
        {activeTab === 'calendar' && <CalendarView />}

        {/* 3번 탭: 통계 */}
        {activeTab === 'stats' && <StatsView />}

        {/* 4번 탭: 자산 현황 */}
        {activeTab === 'assets' && <AssetOverview />}

        {/* 5번 탭: 설정 및 백업 */}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Bottom Fixed Navigation Bar + FAB */}
      <BottomNav />

      {/* Zero OS Keyboard Fast Input Modal */}
      <FastInputModal />

      {/* Excel Import Modal (File Upload & Paste) */}
      <ExcelImportModal isOpen={isExcelModalOpen} onClose={closeExcelModal} />
    </div>
  )
}

export default App

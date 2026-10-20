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
import { CsvImportModal } from './components/common/CsvImportModal'
import { useAppStore } from './store/useAppStore'

export function App() {
  const { activeTab, syncFromCloud, isCsvModalOpen, closeCsvModal } = useAppStore()

  // Initial cloud sync attempt on load
  useEffect(() => {
    syncFromCloud()
  }, [syncFromCloud])

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Sticky Top Month Header with Quick Month Nav & CSV button */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-4 pb-28">
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

      {/* CSV Import Modal (Paste & File Upload) */}
      <CsvImportModal isOpen={isCsvModalOpen} onClose={closeCsvModal} />
    </div>
  )
}

export default App

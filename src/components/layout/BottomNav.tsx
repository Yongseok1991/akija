import React from 'react'
import {
  ReceiptText,
  CalendarDays,
  PieChart,
  WalletCards,
  Settings2,
  Plus,
} from 'lucide-react'
import type { TabType } from '../../types'
import { useAppStore } from '../../store/useAppStore'

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, openInputModal } = useAppStore()

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'daily', label: '가계부', icon: <ReceiptText className="w-5 h-5" /> },
    { key: 'calendar', label: '달력', icon: <CalendarDays className="w-5 h-5" /> },
    { key: 'assets', label: '자산', icon: <WalletCards className="w-5 h-5" /> },
    { key: 'stats', label: '통계', icon: <PieChart className="w-5 h-5" /> },
    { key: 'settings', label: '설정', icon: <Settings2 className="w-5 h-5" /> },
  ]

  return (
    <>
      {/* Floating Action Button (FAB) - One-Touch Fast Entry */}
      <div
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}
        className="fixed right-5 sm:right-[calc(50%-220px)] z-30 pointer-events-auto"
      >
        <button
          type="button"
          onClick={() => openInputModal()}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 text-white shadow-xl shadow-blue-500/35 hover:shadow-blue-500/50 hover:scale-105 active:scale-90 transition-all flex items-center justify-center border-2 border-blue-400/30 group"
          aria-label="가계부 빠른 입력"
        >
          <Plus className="w-7 h-7 stroke-[2.5] group-active:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      {/* Bottom Bar */}
      <nav
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
        className="fixed bottom-0 left-0 right-0 z-20 bg-[#0d0f12]/95 backdrop-blur-lg border-t border-slate-800/80"
      >
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all active:scale-95 ${
                  isActive
                    ? 'text-blue-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-colors ${
                    isActive ? 'bg-blue-500/15' : 'bg-transparent'
                  }`}
                >
                  {tab.icon}
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}

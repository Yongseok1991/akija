import React from 'react'
import { ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { formatMonthHeader, getAdjacentYearMonth, getCurrentYearMonth } from '../../utils/dateUtils'

export const Header: React.FC = () => {
  const { currentYearMonth, setCurrentYearMonth, openExcelModal } = useAppStore()

  const isCurrentMonth = currentYearMonth === getCurrentYearMonth()

  const handlePrevMonth = () => {
    setCurrentYearMonth(getAdjacentYearMonth(currentYearMonth, -1))
  }

  const handleNextMonth = () => {
    setCurrentYearMonth(getAdjacentYearMonth(currentYearMonth, 1))
  }

  const handleCurrentMonthClick = () => {
    setCurrentYearMonth(getCurrentYearMonth())
  }

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 pt-safe">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        {/* Month Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 text-slate-400 hover:text-slate-200 active:bg-slate-800 rounded-full transition-all"
            aria-label="이전 달"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleCurrentMonthClick}
            className="flex items-center gap-1.5 px-2 py-1 rounded-xl hover:bg-slate-800/60 transition-all"
          >
            <span className="text-lg font-black text-slate-100 tracking-tight">
              {formatMonthHeader(currentYearMonth)}
            </span>
            {!isCurrentMonth && (
              <span className="text-[10px] bg-blue-600/30 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded-full font-bold">
                이번달
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 text-slate-400 hover:text-slate-200 active:bg-slate-800 rounded-full transition-all"
            aria-label="다음 달"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Right side: Excel Import Modal Trigger */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openExcelModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer"
            title="엑셀 / CSV 데이터 가져오기 (.xlsx, .csv)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>엑셀</span>
          </button>
        </div>
      </div>
    </header>
  )
}

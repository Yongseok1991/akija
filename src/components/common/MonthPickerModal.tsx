import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X, Calendar, RotateCcw } from 'lucide-react'
import { getCurrentYearMonth } from '../../utils/dateUtils'

interface MonthPickerModalProps {
  isOpen: boolean
  onClose: () => void
  currentYearMonth: string
  onSelectYearMonth: (yearMonth: string) => void
}

export const MonthPickerModal: React.FC<MonthPickerModalProps> = ({
  isOpen,
  onClose,
  currentYearMonth,
  onSelectYearMonth,
}) => {
  const [initialYear] = currentYearMonth.split('-').map(Number)
  const [selectedYear, setSelectedYear] = useState<number>(initialYear || new Date().getFullYear())

  const actualCurrentYM = getCurrentYearMonth()
  const [actualYear, actualMonth] = actualCurrentYM.split('-').map(Number)

  useEffect(() => {
    if (isOpen) {
      const [y] = currentYearMonth.split('-').map(Number)
      setSelectedYear(y || new Date().getFullYear())
    }
  }, [isOpen, currentYearMonth])

  if (!isOpen) return null

  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const quickYears = [2024, 2025, 2026, 2027]

  const handleSelect = (month: number) => {
    const ym = `${selectedYear}-${String(month).padStart(2, '0')}`
    onSelectYearMonth(ym)
    onClose()
  }

  const handleJumpToCurrentMonth = () => {
    onSelectYearMonth(actualCurrentYM)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative z-10 w-full max-w-xs bg-[#121418] border border-slate-800 rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
        {/* Header with Title and Close Button */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/15 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">조회 월 선택</h3>
              <p className="text-[11px] text-slate-400">이동할 연도와 월을 선택하세요</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Year Navigator (< 2026년 >) */}
        <div className="flex items-center justify-between bg-[#1a1d24] border border-slate-800 rounded-2xl p-1.5">
          <button
            type="button"
            onClick={() => setSelectedYear((y) => y - 1)}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 active:scale-95 transition-all"
            aria-label="이전 연도"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-extrabold text-white text-base tracking-tight font-mono">
            {selectedYear}년
          </span>

          <button
            type="button"
            onClick={() => setSelectedYear((y) => y + 1)}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 active:scale-95 transition-all"
            aria-label="다음 연도"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Year Pills */}
        <div className="grid grid-cols-4 gap-1">
          {quickYears.map((y) => {
            const isYearActive = selectedYear === y
            return (
              <button
                key={y}
                type="button"
                onClick={() => setSelectedYear(y)}
                className={`py-1 rounded-xl text-[11px] font-bold transition-all ${
                  isYearActive
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm'
                    : 'bg-[#1a1d24]/60 border border-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-[#1a1d24]'
                }`}
              >
                {y}년
              </button>
            )
          })}
        </div>

        {/* 12 Months 3x4 Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {months.map((m) => {
            const monthStr = String(m).padStart(2, '0')
            const targetYM = `${selectedYear}-${monthStr}`
            const isSelected = currentYearMonth === targetYM
            const isActualCurrent = selectedYear === actualYear && m === actualMonth

            return (
              <button
                key={m}
                type="button"
                onClick={() => handleSelect(m)}
                className={`py-3 px-2 rounded-2xl text-xs font-bold border transition-all active:scale-95 flex flex-col items-center justify-center relative cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                    : 'bg-[#1a1d24] border-slate-800 text-slate-200 hover:bg-[#222630] hover:border-slate-700'
                }`}
              >
                <span>{m}월</span>
                {isActualCurrent && (
                  <span
                    className={`text-[9px] mt-0.5 font-medium ${
                      isSelected ? 'text-blue-200' : 'text-emerald-400'
                    }`}
                  >
                    이번 달
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Jump to Current Month Shortcut */}
        <button
          type="button"
          onClick={handleJumpToCurrentMonth}
          className="w-full py-2.5 bg-[#1a1d24] hover:bg-[#222630] border border-slate-800 text-slate-300 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
          <span>이번 달({actualMonth}월)로 바로 이동</span>
        </button>
      </div>
    </div>
  )
}

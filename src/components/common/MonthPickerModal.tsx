import React, { useState, useEffect, useRef } from 'react'
import { X, Calendar, RotateCcw, Check } from 'lucide-react'
import { getCurrentYearMonth } from '../../utils/dateUtils'

interface MonthPickerModalProps {
  isOpen: boolean
  onClose: () => void
  currentYearMonth: string
  onSelectYearMonth: (yearMonth: string) => void
}

const ITEM_HEIGHT = 44 // px per item
const VIEW_HEIGHT = 160 // px total wheel height
const PADDING_Y = 58 // (160 - 44) / 2 = 58px

export const MonthPickerModal: React.FC<MonthPickerModalProps> = ({
  isOpen,
  onClose,
  currentYearMonth,
  onSelectYearMonth,
}) => {
  const [initY, initM] = currentYearMonth.split('-').map(Number)
  const actualCurrentYM = getCurrentYearMonth()
  const [actualY, actualM] = actualCurrentYM.split('-').map(Number)

  const [selectedYear, setSelectedYear] = useState<number>(initY || actualY)
  const [selectedMonth, setSelectedMonth] = useState<number>(initM || actualM)

  const yearContainerRef = useRef<HTMLDivElement>(null)
  const monthContainerRef = useRef<HTMLDivElement>(null)
  const nativeInputRef = useRef<HTMLInputElement>(null)

  // Generate selectable years: e.g. 2023 to 2028
  const years = [2022, 2023, 2024, 2025, 2026, 2027, 2028]
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  useEffect(() => {
    if (isOpen) {
      const [y, m] = currentYearMonth.split('-').map(Number)
      const targetY = y || actualY
      const targetM = m || actualM
      setSelectedYear(targetY)
      setSelectedMonth(targetM)

      // Center the wheels after DOM render
      const timer = setTimeout(() => {
        const yIdx = years.indexOf(targetY)
        const mIdx = months.indexOf(targetM)
        if (yIdx >= 0 && yearContainerRef.current) {
          yearContainerRef.current.scrollTop = yIdx * ITEM_HEIGHT
        }
        if (mIdx >= 0 && monthContainerRef.current) {
          monthContainerRef.current.scrollTop = mIdx * ITEM_HEIGHT
        }
      }, 60)
      return () => clearTimeout(timer)
    }
  }, [isOpen, currentYearMonth, actualY, actualM])

  if (!isOpen) return null

  const handleYearScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const idx = Math.round(e.currentTarget.scrollTop / ITEM_HEIGHT)
    if (years[idx] !== undefined && years[idx] !== selectedYear) {
      setSelectedYear(years[idx])
    }
  }

  const handleMonthScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const idx = Math.round(e.currentTarget.scrollTop / ITEM_HEIGHT)
    if (months[idx] !== undefined && months[idx] !== selectedMonth) {
      setSelectedMonth(months[idx])
    }
  }

  const handleSelectYear = (y: number, idx: number) => {
    setSelectedYear(y)
    yearContainerRef.current?.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' })
  }

  const handleSelectMonth = (m: number, idx: number) => {
    setSelectedMonth(m)
    monthContainerRef.current?.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' })
  }

  const handleConfirm = () => {
    const ym = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
    onSelectYearMonth(ym)
    onClose()
  }

  const handleJumpToCurrentMonth = () => {
    onSelectYearMonth(actualCurrentYM)
    onClose()
  }

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onSelectYearMonth(e.target.value)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
      {/* 1. Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* 2. Bottom Sheet Container (바텀시트: 상단 잘림 원천 차단) */}
      <div
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        className="relative z-10 w-full max-w-md bg-[#121418] border-t border-slate-800 rounded-t-3xl shadow-2xl p-4 animate-in slide-in-from-bottom duration-200 space-y-3"
      >
        {/* Drag Handle Bar */}
        <div className="w-10 h-1 bg-slate-700/80 rounded-full mx-auto" />

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 px-1">
          {/* Left: Quick Jump to Current Month */}
          <button
            type="button"
            onClick={handleJumpToCurrentMonth}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a1d24] hover:bg-[#222630] border border-slate-800 rounded-xl text-xs font-bold text-slate-300 active:scale-95 transition-all"
            title="이번 달로 바로 이동"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
            <span>이번 달</span>
          </button>

          {/* Center: Selected Year-Month Preview */}
          <div className="text-center">
            <span className="text-sm font-black text-white tracking-tight">
              {selectedYear}년 {selectedMonth}월
            </span>
          </div>

          {/* Right: Close (X) */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3. Two-Column Wheel Picker (금융앱 토스/iOS 스타일 휠 피커: 12개 카드 완전 대체) */}
        <div
          style={{ height: `${VIEW_HEIGHT}px` }}
          className="relative bg-[#16181f]/70 border border-slate-800/90 rounded-2xl overflow-hidden"
        >
          {/* Center Blue Highlight Capsule (선택 표시 밴드) */}
          <div
            style={{ top: `${PADDING_Y}px`, height: `${ITEM_HEIGHT}px` }}
            className="pointer-events-none absolute left-2 right-2 rounded-xl bg-blue-600/20 border border-blue-500/40 z-0 shadow-sm"
          />

          {/* Top/Bottom Gradient Depth Shadows */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-11 bg-gradient-to-b from-[#16181f] via-[#16181f]/80 to-transparent z-20" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-11 bg-gradient-to-t from-[#16181f] via-[#16181f]/80 to-transparent z-20" />

          {/* Dual Scroll Columns */}
          <div className="relative z-10 flex h-full">
            {/* Left: Year Scroll Column */}
            <div
              ref={yearContainerRef}
              onScroll={handleYearScroll}
              style={{ paddingTop: `${PADDING_Y}px`, paddingBottom: `${PADDING_Y}px` }}
              className="flex-1 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory text-center cursor-pointer"
            >
              {years.map((y, idx) => {
                const isSelected = y === selectedYear
                return (
                  <div
                    key={y}
                    onClick={() => handleSelectYear(y, idx)}
                    style={{ height: `${ITEM_HEIGHT}px` }}
                    className={`flex items-center justify-center snap-center transition-all duration-150 ${
                      isSelected
                        ? 'text-white text-base font-black scale-105'
                        : 'text-slate-500 hover:text-slate-300 text-xs font-semibold'
                    }`}
                  >
                    {y}년
                  </div>
                )
              })}
            </div>

            {/* Vertical Divider */}
            <div className="w-px h-28 my-auto bg-slate-800/80 z-20" />

            {/* Right: Month Scroll Column */}
            <div
              ref={monthContainerRef}
              onScroll={handleMonthScroll}
              style={{ paddingTop: `${PADDING_Y}px`, paddingBottom: `${PADDING_Y}px` }}
              className="flex-1 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory text-center cursor-pointer"
            >
              {months.map((m, idx) => {
                const isSelected = m === selectedMonth
                const isActual = selectedYear === actualY && m === actualM
                return (
                  <div
                    key={m}
                    onClick={() => handleSelectMonth(m, idx)}
                    style={{ height: `${ITEM_HEIGHT}px` }}
                    className={`flex items-center justify-center gap-1.5 snap-center transition-all duration-150 ${
                      isSelected
                        ? 'text-white text-base font-black scale-105'
                        : 'text-slate-500 hover:text-slate-300 text-xs font-semibold'
                    }`}
                  >
                    <span>{m}월</span>
                    {isActual && (
                      <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/15 px-1.5 py-0.2 rounded-full border border-emerald-500/25">
                        이번달
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 4. Action Buttons (선택 완료 및 기기 달력) */}
        <div className="flex items-center gap-2 pt-1">
          {/* Native OS Picker Fallback Button */}
          <div className="relative shrink-0">
            <input
              ref={nativeInputRef}
              type="month"
              value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
              onChange={handleNativeChange}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              title="휴대폰 기본 달력으로 선택"
            />
            <button
              type="button"
              className="p-3 bg-[#1a1d24] hover:bg-[#222630] border border-slate-800 text-slate-300 rounded-2xl flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              title="휴대폰 기본 달력으로 선택"
            >
              <Calendar className="w-4 h-4 text-blue-400" />
            </button>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{selectedYear}년 {selectedMonth}월로 이동</span>
          </button>
        </div>
      </div>
    </div>
  )
}

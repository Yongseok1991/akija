import React, { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  List,
  CalendarDays,
  Search,
  Plus,
  X,
  ChevronDown,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { formatMonthHeader, getAdjacentYearMonth, getCurrentYearMonth } from '../../utils/dateUtils'
import { MonthPickerModal } from '../common/MonthPickerModal'

export const Header: React.FC = () => {
  const {
    currentYearMonth,
    setCurrentYearMonth,
    openExcelModal,
    activeTab,
    setActiveTab,
    openInputModal,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    isSearchOpen,
    setIsSearchOpen,
  } = useAppStore()

  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false)
  const isCurrentMonth = currentYearMonth === getCurrentYearMonth()

  const handlePrevMonth = () => {
    setCurrentYearMonth(getAdjacentYearMonth(currentYearMonth, -1))
  }

  const handleNextMonth = () => {
    setCurrentYearMonth(getAdjacentYearMonth(currentYearMonth, 1))
  }

  const filterLabels = {
    all: '전체',
    expense: '지출',
    income: '수입',
  }

  return (
    <header className="sticky top-0 z-30 bg-[#0d0f12]/95 backdrop-blur-md border-b border-slate-800/80 px-4 pt-3 pb-2.5 pt-safe">
      <div className="max-w-lg mx-auto space-y-2.5">
        {/* Row 1: Top Brand & Month Navigation & Quick Actions */}
        <div className="flex items-center justify-between">
          {/* Brand Title + Month Switcher */}
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white tracking-tight">가계부</h1>

            {/* Sleek Month Navigator with Quick Direct Picker */}
            <div className="flex items-center bg-[#16181f] border border-slate-800 rounded-xl px-1.5 py-0.5 shadow-sm">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 text-slate-400 hover:text-white active:scale-95 transition-all cursor-pointer"
                aria-label="이전 달"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsMonthPickerOpen(true)}
                className="px-2 py-0.5 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                title="클릭하여 원하는 연도/월로 바로 이동"
              >
                <span>{formatMonthHeader(currentYearMonth)}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                {!isCurrentMonth && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="과거/미래 월 조회 중" />
                )}
              </button>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 text-slate-400 hover:text-white active:scale-95 transition-all cursor-pointer"
                aria-label="다음 달"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Actions: Excel/CSV Import */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={openExcelModal}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold active:scale-95 transition-all"
              title="엑셀 / CSV 불러오기 및 백업"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>엑셀</span>
            </button>
          </div>
        </div>

        {/* Row 2: Sub-header Pills (목록 / 달력 / 필터) + Right (Search / Add) */}
        <div className="flex items-center justify-between pt-0.5">
          {/* Left Segmented Controls */}
          <div className="flex items-center gap-1.5 relative">
            {/* 1. 목록 (Daily List) Pill */}
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                activeTab === 'daily'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800/80 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>목록</span>
            </button>

            {/* 2. 달력 (Calendar) Pill */}
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                activeTab === 'calendar'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800/80 hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>달력</span>
            </button>

            {/* 3. 필터 Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  filterType !== 'all'
                    ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 font-bold'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200'
                }`}
              >
                <span>필터{filterType !== 'all' ? ` (${filterLabels[filterType]})` : ''}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Filter Dropdown Modal */}
              {isFilterMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsFilterMenuOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 z-50 w-28 bg-slate-850 border border-slate-750 rounded-2xl p-1 shadow-2xl space-y-0.5">
                    {(['all', 'expense', 'income'] as const).map((ft) => (
                      <button
                        key={ft}
                        type="button"
                        onClick={() => {
                          setFilterType(ft)
                          setIsFilterMenuOpen(false)
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          filterType === ft
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {ft === 'all' ? '전체 보기' : ft === 'expense' ? '지출만' : '수입만'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Action Buttons: Search & Fast Add */}
          <div className="flex items-center gap-1.5">
            {/* Search Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(!isSearchOpen)
                if (isSearchOpen) setSearchQuery('')
              }}
              className={`p-2 rounded-xl transition-all active:scale-95 ${
                isSearchOpen || searchQuery
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="내역 검색"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Fast Input Plus Button */}
            <button
              type="button"
              onClick={() => openInputModal()}
              className="p-1.5 text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all active:scale-90"
              title="빠른 등록"
            >
              <Plus className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Row 3: Collapsible Real-Time Search Bar */}
        {isSearchOpen && (
          <div className="pt-1 animate-in slide-in-from-top-1 duration-150">
            <div className="relative flex items-center bg-slate-850 border border-slate-750 rounded-2xl px-3 py-2 shadow-inner">
              <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="내용, 가맹점, 카테고리 검색..."
                className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
        {/* Month Picker Modal */}
        <MonthPickerModal
          isOpen={isMonthPickerOpen}
          onClose={() => setIsMonthPickerOpen(false)}
          currentYearMonth={currentYearMonth}
          onSelectYearMonth={setCurrentYearMonth}
        />
      </div>
    </header>
  )
}

import React, { useState } from 'react'
import {
  Target,
  Layers,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  FileSpreadsheet,
  FileText,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export const SettingsView: React.FC = () => {
  const {
    categories,
    addCategory,
    deleteCategory,
    reorderCategories,
    budgets,
    setBudget,
    currentYearMonth,
    exportExcel,
    exportCSV,
    openExcelModal,
    resetToDefaults,
  } = useAppStore()

  // Budget state
  const currentBudgetObj = budgets.find((b) => b.year_month === currentYearMonth)
  const [budgetInput, setBudgetInput] = useState<string>(
    currentBudgetObj?.amount ? String(currentBudgetObj.amount) : '1500000'
  )
  const [budgetSuccess, setBudgetSuccess] = useState(false)

  // Category manage state
  const [catTab, setCatTab] = useState<'expense' | 'income'>('expense')
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('')

  // Save Budget
  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(budgetInput) || 0
    setBudget(currentYearMonth, val)
    setBudgetSuccess(true)
    setTimeout(() => setBudgetSuccess(false), 2000)
  }

  // Add Category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return

    addCategory({
      name: newCatName.trim(),
      icon: newCatIcon.trim() || '📌',
      type: catTab,
      sort_order: categories.length + 1,
    })
    setNewCatName('')
    setNewCatIcon('')
  }

  // Move Category Up / Down
  const handleMoveCat = (catId: string, direction: 'up' | 'down') => {
    const list = categories.filter((c) => c.type === catTab)
    const index = list.findIndex((c) => c.id === catId)
    if (index < 0) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= list.length) return

    const item = list[index]
    list.splice(index, 1)
    list.splice(newIndex, 0, item)

    const otherList = categories.filter((c) => c.type !== catTab)
    reorderCategories([...list, ...otherList])
  }

  // Export User CSV (11 columns with UTF-8 BOM)
  const handleExportCSV = () => {
    const csvContent = exportCSV()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `가계부_백업_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    const blob = exportExcel()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `가계부_백업_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredCategories = categories.filter((c) => c.type === catTab)

  return (
    <div className="space-y-4">
      {/* 1. Monthly Budget Card */}
      <div className="bg-slate-850/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-slate-100 text-sm">
            이번 달 ({currentYearMonth.split('-')[1]}월) 예산 설정
          </h3>
        </div>

        <form onSubmit={handleSaveBudget} className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <input
              type="number"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="1,500,000"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-blue-500 font-semibold"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
              원
            </span>
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1 shrink-0"
          >
            {budgetSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>저장됨</span>
              </>
            ) : (
              <span>설정</span>
            )}
          </button>
        </form>
      </div>

      {/* 2. Category Management Card */}
      <div className="bg-slate-850/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-slate-100 text-sm">카테고리 관리 ({categories.length}개)</h3>
          </div>

          {/* Type Toggle Tabs */}
          <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setCatTab('expense')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                catTab === 'expense'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              지출
            </button>
            <button
              type="button"
              onClick={() => setCatTab('income')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                catTab === 'income'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              수입
            </button>
          </div>
        </div>

        {/* Add New Category Form */}
        <form onSubmit={handleAddCategory} className="flex gap-1.5">
          <input
            type="text"
            value={newCatIcon}
            onChange={(e) => setNewCatIcon(e.target.value)}
            placeholder="이모지"
            className="w-16 px-2 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs text-center focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="새 카테고리 이름 입력"
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-blue-400 border border-blue-500/40 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>추가</span>
          </button>
        </form>

        {/* Category List */}
        <div className="space-y-1.5 max-h-64 overflow-y-auto no-scrollbar pt-1">
          {filteredCategories.map((cat, idx) => (
            <div
              key={cat.id}
              className="flex items-center justify-between px-3 py-2 bg-slate-800/60 border border-slate-750 rounded-xl text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{cat.icon}</span>
                <span className="font-semibold text-slate-200">{cat.name}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveCat(cat.id, 'up')}
                  disabled={idx === 0}
                  className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-20"
                  title="위로 이동"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveCat(cat.id, 'down')}
                  disabled={idx === filteredCategories.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-20"
                  title="아래로 이동"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`'${cat.name}' 카테고리를 삭제하시겠습니까?`)) {
                      deleteCategory(cat.id)
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-rose-400 ml-0.5"
                  title="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. CSV & Excel Data Backup Card */}
      <div className="bg-gradient-to-br from-emerald-950/30 via-slate-850 to-slate-900 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-sm">가계부 데이터 백업 & 내보내기</h3>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
            CSV / Excel
          </span>
        </div>
        <p className="text-xs text-slate-400">
          가계부 전체 거래 내역을 표준 CSV 파일 또는 엑셀(.xlsx) 파일로 안전하게 백업 및 복원할 수 있습니다.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleExportCSV}
            className="py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>CSV 백업 내보내기</span>
          </button>

          <button
            type="button"
            onClick={openExcelModal}
            className="py-3 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>백업 불러오기 (CSV/엑셀)</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-400">엑셀 원본 서식 파일로 보관하고 싶다면:</span>
          <button
            type="button"
            onClick={handleExportExcel}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            <span>.xlsx 파일로 다운로드</span>
          </button>
        </div>
      </div>

      {/* 4. Complete Reset Card */}
      <div className="bg-slate-850/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
        <h3 className="font-bold text-slate-100 text-sm">데이터 초기화</h3>
        <p className="text-xs text-slate-400">
          가계부를 처음부터 다시 시작하려면 전체 거래 내역과 자산 잔액을 0원으로 초기화할 수 있습니다.
        </p>

        <button
          type="button"
          onClick={async () => {
            if (
              window.confirm(
                '모든 가계부 거래 내역과 자산 잔액을 0원으로 완전 초기화하시겠습니까?\n(사전에 CSV 백업을 권장합니다)'
              )
            ) {
              await resetToDefaults()
              alert('모든 데이터가 초기화되었습니다.')
            }
          }}
          className="w-full py-2.5 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-98"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>가계부 전체 내역 리셋</span>
        </button>
      </div>
    </div>
  )
}

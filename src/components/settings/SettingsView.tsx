import React, { useState } from 'react'
import {
  Target,
  Layers,
  Database,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { SupabaseConfig } from '../../types'
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
} from '../../lib/supabase'

export const SettingsView: React.FC = () => {
  const {
    categories,
    addCategory,
    deleteCategory,
    reorderCategories,
    budgets,
    setBudget,
    currentYearMonth,
    exportDataJSON,
    importDataJSON,
    exportCSV,
    openCsvModal,
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

  // Supabase settings state
  const [supabaseConfig, setConfig] = useState<SupabaseConfig>(getSupabaseConfig())
  const [supabaseStatus, setSupabaseStatus] = useState<string | null>(null)
  const [isTestingSupabase, setIsTestingSupabase] = useState(false)

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

  // Save Supabase Config & Test Connection
  const handleSaveSupabase = async () => {
    setIsTestingSupabase(true)
    setSupabaseStatus(null)

    saveSupabaseConfig(supabaseConfig)
    if (supabaseConfig.url && supabaseConfig.anon_key) {
      const ok = await testSupabaseConnection(supabaseConfig.url, supabaseConfig.anon_key)
      if (ok) {
        setSupabaseStatus('연결 성공! Supabase 동기화가 활성화되었습니다.')
      } else {
        setSupabaseStatus('연결 실패: URL 또는 Anon Key, 테이블 권한(schema.sql)을 확인해 주세요.')
      }
    } else {
      setSupabaseStatus('Supabase 정보가 저장되었습니다. (로컬 모드)')
    }
    setIsTestingSupabase(false)
  }

  // Export User CSV (11 columns with UTF-8 BOM)
  const handleExportCSV = () => {
    const csvContent = exportCSV()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `가계부_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export JSON
  const handleExportJSON = () => {
    const jsonStr = exportDataJSON()
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `smart_account_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        const ok = importDataJSON(content)
        if (ok) {
          alert('데이터 복원이 성공적으로 완료되었습니다.')
        } else {
          alert('유효하지 않은 백업 파일입니다.')
        }
      }
    }
    reader.readAsText(file)
  }

  const filteredCategories = categories.filter((c) => c.type === catTab)

  return (
    <div className="space-y-4">
      {/* 1. CSV Import / Export Card (가장 유용한 사용자 데이터 허브) */}
      <div className="bg-gradient-to-br from-blue-900/40 to-slate-850 border border-blue-500/30 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-slate-100 text-sm">가계부 CSV 데이터 관리</h3>
        </div>
        <p className="text-xs text-slate-400">
          사용하시는 11컬럼 CSV 형식 파일을 언제든 가져오거나(Import), 엑셀/스프레드시트용 파일로 내보낼 수 있습니다.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={openCsvModal}
            className="py-3 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-blue-500/20"
          >
            <Upload className="w-4 h-4" />
            <span>CSV 가져오기 (Import)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="py-3 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>CSV 내보내기 (Export)</span>
          </button>
        </div>
      </div>

      {/* 2. Monthly Budget Card */}
      <div className="bg-slate-850/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-slate-100 text-sm">
            이번 달 ({currentYearMonth.split('-')[1]}월) 예산 설정
          </h3>
        </div>

        <form onSubmit={handleSaveBudget} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="1,500,000"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-slate-100 font-bold text-sm focus:outline-none focus:border-blue-500"
            />
            <span className="absolute right-3.5 top-3 text-xs text-slate-400">원</span>
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl shadow-md active:scale-95 transition-all flex items-center gap-1"
          >
            {budgetSuccess ? <Check className="w-4 h-4" /> : null}
            <span>{budgetSuccess ? '저장됨' : '예산 저장'}</span>
          </button>
        </form>
      </div>

      {/* 3. Category Management */}
      <div className="bg-slate-850/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-slate-100 text-sm">카테고리 분류 관리</h3>
          </div>

          <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setCatTab('expense')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                catTab === 'expense' ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              지출 ({categories.filter((c) => c.type === 'expense').length})
            </button>
            <button
              type="button"
              onClick={() => setCatTab('income')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                catTab === 'income' ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              수입 ({categories.filter((c) => c.type === 'income').length})
            </button>
          </div>
        </div>

        {/* Add New Category Form */}
        <form onSubmit={handleAddCategory} className="flex gap-2 pt-1">
          <input
            type="text"
            value={newCatIcon}
            onChange={(e) => setNewCatIcon(e.target.value)}
            placeholder="이모지"
            className="w-16 px-2 py-2 text-center bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="새 카테고리 이름"
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-blue-400 border border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>추가</span>
          </button>
        </form>

        {/* Categories List & Reordering */}
        <div className="max-h-64 overflow-y-auto divide-y divide-slate-800 pr-1">
          {filteredCategories.map((cat, idx) => (
            <div key={cat.id} className="flex items-center justify-between py-2 group">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{cat.icon}</span>
                <span className="text-xs font-semibold text-slate-200">{cat.name}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveCat(cat.id, 'up')}
                  disabled={idx === 0}
                  className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                  title="위로"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveCat(cat.id, 'down')}
                  disabled={idx === filteredCategories.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                  title="아래로"
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
                  className="p-1 text-slate-400 hover:text-rose-400 ml-1"
                  title="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Supabase Cloud Sync Card */}
      <div className="bg-slate-850/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-slate-100 text-sm">Supabase 클라우드 동기화</h3>
        </div>
        <p className="text-xs text-slate-400">
          Supabase Project URL과 Anon API Key를 입력하면 클라우드 DB와 실시간 동기화됩니다.
        </p>

        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Project URL</label>
            <input
              type="text"
              value={supabaseConfig.url}
              onChange={(e) => setConfig({ ...supabaseConfig, url: e.target.value })}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Anon API Key</label>
            <input
              type="password"
              value={supabaseConfig.anon_key}
              onChange={(e) => setConfig({ ...supabaseConfig, anon_key: e.target.value })}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleSaveSupabase}
              disabled={isTestingSupabase}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5"
            >
              {isTestingSupabase ? '연결 테스트 중...' : '설정 저장 및 연결 테스트'}
            </button>
          </div>

          {supabaseStatus && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                supabaseStatus.includes('성공')
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{supabaseStatus}</span>
            </div>
          )}
        </div>
      </div>

      {/* 5. JSON Backup & Reset */}
      <div className="bg-slate-850/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
        <h3 className="font-bold text-slate-100 text-sm">JSON 백업 및 전체 리셋</h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleExportJSON}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>JSON 백업 내보내기</span>
          </button>

          <label className="py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>JSON 백업 가져오기</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>

        <div className="pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  '기본 카테고리와 9월 초기 실데이터로 전체 초기화하시겠습니까?'
                )
              ) {
                resetToDefaults()
                alert('초기화가 완료되었습니다.')
              }
            }}
            className="w-full py-2.5 text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>초기 기본값으로 리셋</span>
          </button>
        </div>
      </div>
    </div>
  )
}

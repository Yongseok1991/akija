import React from 'react'
import { X } from 'lucide-react'
import type { Category } from '../../types'

interface CategorySheetProps {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  selectedCategoryId?: string
  onSelectCategory: (category: Category) => void
  type: 'expense' | 'income'
}

export const CategorySheet: React.FC<CategorySheetProps> = ({
  isOpen,
  onClose,
  categories,
  selectedCategoryId,
  onSelectCategory,
  type,
}) => {
  if (!isOpen) return null

  const filteredCategories = categories.filter((c) => c.type === type)

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div className="relative z-10 bg-[#121418] border-t border-slate-800 rounded-t-3xl max-h-[82vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Handle bar */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {type === 'expense' ? '지출' : '수입'} 카테고리 선택
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">터치 시 즉시 적용됩니다</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-column Grid */}
        <div className="p-4 overflow-y-auto max-h-[60vh] overscroll-contain">
          <div className="grid grid-cols-4 gap-2.5">
            {filteredCategories.map((cat) => {
              const isSelected = cat.id === selectedCategoryId
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onSelectCategory(cat)
                    onClose()
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-blue-600/25 border-blue-500 text-blue-300 font-bold shadow-md shadow-blue-500/15'
                      : 'bg-[#1a1d24] border-slate-800 text-slate-300 hover:bg-[#222630] hover:border-slate-700'
                  }`}
                >
                  <span className="text-2xl mb-1.5 filter drop-shadow-sm">{cat.icon}</span>
                  <span className="text-xs leading-tight text-center truncate w-full">
                    {cat.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

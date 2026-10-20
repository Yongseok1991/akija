import React, { useState } from 'react'
import { QUICK_MEMO_TAGS } from '../../lib/constants'
import { Edit3, Check, X } from 'lucide-react'

interface QuickMemoTagsProps {
  currentMemo: string
  onSelectMemo: (memo: string) => void
}

export const QuickMemoTags: React.FC<QuickMemoTagsProps> = ({
  currentMemo,
  onSelectMemo,
}) => {
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false)
  const [tempCustomMemo, setTempCustomMemo] = useState('')

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tempCustomMemo.trim()) {
      onSelectMemo(tempCustomMemo.trim())
    }
    setIsCustomModalOpen(false)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>빠른 메모 선택</span>
        <button
          type="button"
          onClick={() => {
            setTempCustomMemo(currentMemo)
            setIsCustomModalOpen(true)
          }}
          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium active:underline"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>직접 입력</span>
        </button>
      </div>

      {/* Horizontal scrollable chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {QUICK_MEMO_TAGS.map((tag) => {
          const isSelected = currentMemo === tag
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onSelectMemo(isSelected ? '' : tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                isSelected
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
              }`}
            >
              {tag}
            </button>
          )
        })}
      </div>

      {/* Custom Memo Dialog (Only opened if user explicitly taps '직접 입력') */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-100">메모 직접 입력</h4>
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <input
                type="text"
                value={tempCustomMemo}
                onChange={(e) => setTempCustomMemo(e.target.value)}
                placeholder="메모를 입력하세요 (예: 친구 생일선물)"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-1 shadow-md shadow-blue-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>적용</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

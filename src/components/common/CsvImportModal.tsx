import React, { useState } from 'react'
import { X, Upload, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { parseUserCsvText, type ParsedCsvResult } from '../../utils/csvHandler'
import { formatKRW } from '../../utils/formatters'

interface CsvImportModalProps {
  isOpen: boolean
  onClose: () => void
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const { categories, assets, importParsedCsv, setCurrentYearMonth } = useAppStore()

  const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste')
  const [csvText, setCsvText] = useState('')
  const [parsedResult, setParsedResult] = useState<ParsedCsvResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  if (!isOpen) return null

  // CSV 파싱 실행
  const handleParse = (text: string) => {
    setErrorMsg(null)
    setParsedResult(null)

    if (!text.trim()) {
      setErrorMsg('CSV 텍스트를 입력하거나 파일을 선택해 주세요.')
      return
    }

    try {
      const res = parseUserCsvText(text, categories, assets)
      if (res.totalCount === 0) {
        setErrorMsg('파싱 가능한 거래 내역이 없습니다. CSV 포맷을 확인해 주세요.')
        return
      }
      setParsedResult(res)
    } catch (err: any) {
      setErrorMsg(err.message || 'CSV 파싱 중 오류가 발생했습니다.')
    }
  }

  // 파일 업로드 처리
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        setCsvText(content)
        handleParse(content)
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  // 최종 가져오기 확정
  const handleApply = () => {
    if (!parsedResult) return

    importParsedCsv(parsedResult)

    // 가져온 내역의 최신 월로 이동
    if (parsedResult.dateRange.end) {
      const latestYM = parsedResult.dateRange.end.substring(0, 7)
      setCurrentYearMonth(latestYM)
    }

    alert(`총 ${parsedResult.totalCount}건의 가계부 내역을 성공적으로 가져왔습니다!`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-slate-100 text-base">가계부 CSV 데이터 가져오기</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              사용자 전용 11컬럼 CSV 형식 자동 지원
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector (붙여넣기 vs 파일 선택) */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800/80">
          <div className="grid grid-cols-2 p-1 bg-slate-800/80 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`py-2 rounded-lg transition-all ${
                activeTab === 'paste' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              텍스트 직접 붙여넣기
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`py-2 rounded-lg transition-all ${
                activeTab === 'file' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              CSV 파일 업로드
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {activeTab === 'paste' ? (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>CSV 텍스트 붙여넣기</span>
                <button
                  type="button"
                  onClick={() => handleParse(csvText)}
                  className="text-blue-400 hover:text-blue-300 font-bold"
                >
                  데이터 분석하기
                </button>
              </div>
              <textarea
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value)
                  if (parsedResult) setParsedResult(null)
                }}
                placeholder="날짜,자산,분류,소분류,내용,KRW,수입/지출,메모,금액,화폐,자산&#10;2026-09-30,카드,🍺집술,,생마차 4캔,7600,지출,,7600.0,KRW,7600..."
                className="w-full h-36 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
              />
            </div>
          ) : (
            <div>
              <label className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-800/40">
                <Upload className="w-8 h-8 text-blue-400 mb-2" />
                <span className="text-xs font-bold text-slate-200">
                  {fileName ? fileName : '클릭하여 CSV 파일 선택'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1">.csv 파일 지원 (UTF-8)</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          )}

          {/* 에러 메시지 */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 파싱 결과 미리보기 */}
          {parsedResult && (
            <div className="p-4 bg-slate-800/90 border border-slate-700/80 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>총 {parsedResult.totalCount}건의 데이터가 성공적으로 감지되었습니다!</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/80 p-2.5 rounded-xl border border-slate-750">
                <div>
                  <span className="text-slate-400 block text-[11px]">기록 기간</span>
                  <span className="font-semibold text-slate-200">
                    {parsedResult.dateRange.start} ~ {parsedResult.dateRange.end}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">지출 건수 / 총액</span>
                  <span className="font-semibold text-rose-400">
                    {parsedResult.expenseCount}건 ({formatKRW(parsedResult.totalExpenseAmount)})
                  </span>
                </div>
                {parsedResult.incomeCount > 0 && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">수입 건수 / 총액</span>
                    <span className="font-semibold text-emerald-400">
                      {parsedResult.incomeCount}건 ({formatKRW(parsedResult.totalIncomeAmount)})
                    </span>
                  </div>
                )}
                {parsedResult.newCategories.length > 0 && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">신규 카테고리</span>
                    <span className="font-semibold text-blue-400">
                      +{parsedResult.newCategories.length}개 자동 추가
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl transition-all"
          >
            닫기
          </button>
          <button
            type="button"
            disabled={!parsedResult}
            onClick={handleApply}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-1.5"
          >
            <span>가계부에 반영하기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

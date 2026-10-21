import React, { useState, useRef } from 'react'
import { X, Upload, CheckCircle2, AlertCircle, ArrowRight, FileSpreadsheet, Loader2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import {
  parseExcelFileBuffer,
  parseTextOrCsv,
  type ParsedExcelResult,
} from '../../utils/excelHandler'
import { formatKRW } from '../../utils/formatters'

interface ExcelImportModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose }) => {
  const { categories, assets, importParsedExcel, setCurrentYearMonth } = useAppStore()

  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file')
  const [inputText, setInputText] = useState('')
  const [parsedResult, setParsedResult] = useState<ParsedExcelResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  // 엑셀 파일 버퍼 파싱 실행
  const processFile = async (file: File) => {
    setErrorMsg(null)
    setParsedResult(null)
    setFileName(file.name)
    setIsProcessing(true)

    try {
      const buffer = await file.arrayBuffer()
      const res = parseExcelFileBuffer(buffer, categories, assets)
      if (res.totalCount === 0) {
        setErrorMsg('파싱 가능한 거래 내역이 없습니다. 엑셀 컬럼(날짜, 자산, 분류, 내용, KRW)을 확인해 주세요.')
        setIsProcessing(false)
        return
      }
      setParsedResult(res)
    } catch (err: any) {
      console.error('Excel parse error:', err)
      setErrorMsg(err.message || '엑셀 파싱 중 오류가 발생했습니다. 올바른 엑셀 파일(.xlsx, .xls)인지 확인해 주세요.')
    } finally {
      setIsProcessing(false)
    }
  }

  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  // 드래그 앤 드롭 핸들러
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  // 텍스트 파싱 실행
  const handleTextParse = () => {
    setErrorMsg(null)
    setParsedResult(null)

    if (!inputText.trim()) {
      setErrorMsg('붙여넣을 텍스트 또는 CSV 내용을 입력해 주세요.')
      return
    }

    try {
      const res = parseTextOrCsv(inputText, categories, assets)
      if (res.totalCount === 0) {
        setErrorMsg('파싱 가능한 거래 내역이 없습니다.')
        return
      }
      setParsedResult(res)
    } catch (err: any) {
      setErrorMsg(err.message || '텍스트 파싱 중 오류가 발생했습니다.')
    }
  }

  // Supabase에 직접 적용
  const handleApply = async () => {
    if (!parsedResult) return

    setIsApplying(true)
    try {
      await importParsedExcel(parsedResult)

      // 가져온 내역의 최신 연월로 이동
      if (parsedResult.dateRange.end) {
        const latestYM = parsedResult.dateRange.end.substring(0, 7)
        setCurrentYearMonth(latestYM)
      }

      alert(`총 ${parsedResult.totalCount}건의 엑셀 데이터가 Supabase 클라우드에 성공적으로 저장되었습니다!`)
      onClose()
    } catch (err: any) {
      console.error('Import save error:', err)
      alert('저장 중 오류가 발생했습니다: ' + (err.message || '네트워크 오류'))
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">가계부 엑셀(Excel) 가져오기</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                편한가계부 및 표준 엑셀(.xlsx, .xls) 지원
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800/80">
          <div className="grid grid-cols-2 p-1 bg-slate-800/80 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'file' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>엑셀 파일 업로드</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'paste' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>텍스트 / CSV 붙여넣기</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {activeTab === 'file' ? (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-7 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-slate-700 hover:border-emerald-500 bg-slate-800/40'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2.5 border border-emerald-500/30">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-200 text-center">
                  {fileName ? fileName : '클릭하거나 엑셀 파일을 끌어다 놓으세요'}
                </span>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                    .xlsx
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                    .xls
                  </span>
                  <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                    .csv
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {isProcessing && (
                <div className="flex items-center justify-center gap-2 p-3 text-xs text-emerald-400 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>엑셀 시트 분석 중...</span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>표 또는 CSV 텍스트 붙여넣기</span>
                <button
                  type="button"
                  onClick={handleTextParse}
                  className="text-emerald-400 hover:text-emerald-300 font-bold"
                >
                  데이터 분석하기
                </button>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value)
                  if (parsedResult) setParsedResult(null)
                }}
                placeholder="날짜	자산	분류	소분류	내용	KRW	수입/지출&#10;2026/09/30	카드	🍺집술		생마차 4캔	7600	지출..."
                className="w-full h-36 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
              />
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
                      +{parsedResult.newCategories.length}개 자동 등록
                    </span>
                  </div>
                )}
              </div>

              {/* 샘플 미리보기 상위 3건 */}
              <div className="pt-1">
                <span className="text-[11px] text-slate-400 block mb-1">상위 내역 미리보기:</span>
                <div className="space-y-1">
                  {parsedResult.transactions.slice(0, 3).map((tx, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[11px] px-2.5 py-1.5 bg-slate-850 rounded-lg border border-slate-800"
                    >
                      <span className="text-slate-400 font-mono">{tx.date}</span>
                      <span className="text-slate-200 font-medium truncate max-w-[130px]">{tx.memo}</span>
                      <span
                        className={`font-bold ${
                          tx.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                        }`}
                      >
                        {formatKRW(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
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
            disabled={!parsedResult || isApplying}
            onClick={handleApply}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-1.5"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Supabase 저장 중...</span>
              </>
            ) : (
              <>
                <span>가계부에 반영하기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

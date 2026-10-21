import React, { useRef } from 'react'
import { Delete, Check } from 'lucide-react'

interface CustomNumpadProps {
  onNumber: (digit: string) => void
  onOperator: (op: string) => void
  onBackspace: () => void
  onClear: () => void
  onSubmit: () => void
  submitLabel?: string
}

export const CustomNumpad: React.FC<CustomNumpadProps> = ({
  onNumber,
  onOperator,
  onBackspace,
  onClear,
  onSubmit,
  submitLabel = '완료',
}) => {
  const lastTouchTimeRef = useRef(0)

  const triggerHaptic = () => {
    if (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      try {
        navigator.vibrate(10)
      } catch {
        // ignore
      }
    }
  }

  // 모바일 터치(pointerdown)와 마우스 클릭(click)을 모두 즉각 처리하고 중복 실행 방지
  const handlePress = (action: () => void, e?: React.SyntheticEvent) => {
    const now = Date.now()
    if (now - lastTouchTimeRef.current < 80) return
    lastTouchTimeRef.current = now

    if (e && e.cancelable) {
      e.preventDefault()
    }
    triggerHaptic()
    action()
  }

  const btnBase =
    'h-12 xs:h-13 sm:h-14 flex items-center justify-center text-xl font-bold rounded-2xl active:scale-95 transition-transform select-none shadow-sm cursor-pointer touch-manipulation'
  const numBtn = `${btnBase} bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-650 border border-slate-700`
  const opBtn = `${btnBase} bg-slate-800/90 text-blue-400 border border-blue-900/40 hover:bg-slate-700 active:bg-blue-600/30 text-2xl font-black`
  const utilBtn = `${btnBase} bg-slate-800/90 text-slate-300 hover:bg-slate-700 active:bg-slate-650 border border-slate-700`
  const submitBtn = `${btnBase} bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold shadow-blue-500/25 shadow-md text-sm sm:text-base`

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 px-1 pb-1">
      {/* Row 1: 1 2 3 + (모바일 표준 키패드 순서) */}
      <button
        type="button"
        onPointerDown={(e) => handlePress(() => onNumber('1'), e)}
        onClick={(e) => handlePress(() => onNumber('1'), e)}
        className={numBtn}
      >
        1
      </button>
      <button
        type="button"
        onPointerDown={(e) => handlePress(() => onNumber('2'), e)}
        onClick={(e) => handlePress(() => onNumber('2'), e)}
        className={numBtn}
      >
        2
      </button>
      <button
        type="button"
        onPointerDown={(e) => handlePress(() => onNumber('3'), e)}
        onClick={(e) => handlePress(() => onNumber('3'), e)}
        className={numBtn}
      >
        3
      </button>
      <button
        type="button"
        onPointerDown={(e) => handlePress(() => onOperator('+'), e)}
        onClick={(e) => handlePress(() => onOperator('+'), e)}
        className={opBtn}
        aria-label="더하기"
      >
        +
      </button>

      {/* Row 2: 4 5 6 - */}
      <button
        type="button"
        onPointerDown={(e) => handlePress(() => onNumber('4'), e)}
        onClick={(e) => handlePress(() => onNumber('4'), e)}
        className={numBtn}
      >
        4
      </button>
      <button
        type="button"
        onPointerDown={(e) => handlePress(() => onNumber('5'), e)}
        onClick={(e) => handlePress(() => onNumber('5'), e)}
        className={numBtn}
      >
        5
      </button>
      <button
        type="button"
        onPointerDown={(e) => handlePress(() => onNumber('6'), e)}
        onClick={(e) => handlePress(() => onNumber('6'), e)}
        className={numBtn}
      >
        6
      </button>
      <button
        type="button"
        onPointerDown={(e) => handlePress(() => onOperator('-'), e)}
        onClick={(e) => handlePress(() => onOperator('-'), e)}
        className={opBtn}
        aria-label="빼기"
      >
        -
      </button>

      {/* Row 3: 7 8 9 ⌫ */}
      <button
        type="button"
        onPointerDown={(e) => handlePress(() => onNumber('7'), e)}
        onClick={(e) => handlePress(() => onNumber('7'), e)}
        className={numBtn}
      >
        7
      </button>
      <button
        type="button"
        onPointerDown={(e) => handlePress(() => onNumber('8'), e)}
        onClick={(e) => handlePress(() => onNumber('8'), e)}
        className={numBtn}
      >
        8
      </button>
      <button
        type="button"
        onPointerDown={(e) => handlePress(() => onNumber('9'), e)}
        onClick={(e) => handlePress(() => onNumber('9'), e)}
        className={numBtn}
      >
        9
      </button>
      <button
        type="button"
        onPointerDown={(e) => handlePress(onBackspace, e)}
        onClick={(e) => handlePress(onBackspace, e)}
        className={utilBtn}
        aria-label="지우기"
      >
        <Delete className="w-5 h-5 text-slate-300 pointer-events-none" />
      </button>

      {/* Row 4: C 0 00 완료 */}
      <button
        type="button"
        onPointerDown={(e) => handlePress(onClear, e)}
        onClick={(e) => handlePress(onClear, e)}
        className={`${utilBtn} text-rose-400 font-extrabold text-base`}
        aria-label="초기화"
      >
        C
      </button>
      <button
        type="button"
        onPointerDown={(e) => handlePress(() => onNumber('0'), e)}
        onClick={(e) => handlePress(() => onNumber('0'), e)}
        className={numBtn}
      >
        0
      </button>
      <button
        type="button"
        onPointerDown={(e) => handlePress(() => onNumber('00'), e)}
        onClick={(e) => handlePress(() => onNumber('00'), e)}
        className={`${numBtn} text-base sm:text-lg`}
      >
        00
      </button>
      <button
        type="button"
        onPointerDown={(e) => handlePress(onSubmit, e)}
        onClick={(e) => handlePress(onSubmit, e)}
        className={submitBtn}
      >
        <div className="flex items-center justify-center gap-1 pointer-events-none">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{submitLabel}</span>
        </div>
      </button>
    </div>
  )
}

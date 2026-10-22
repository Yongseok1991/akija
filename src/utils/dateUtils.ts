/**
 * 한국 표준시 (KST / Asia/Seoul, UTC+9) 기준 날짜 및 시간 유틸리티
 */

export function getTodayString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00'
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`
}

export function getCurrentYearMonth(date: Date = new Date()): string {
  return getTodayString(date).slice(0, 7)
}

/**
 * 표준 ISO-8601 UTC 타임스탬프 반환
 * PostgreSQL timestamptz 및 프론트엔드 Date 일관성을 완벽 보장합니다.
 */
export function getKoreanNowString(date: Date = new Date()): string {
  return date.toISOString()
}

/**
 * 한국 시간 기준 현재 HH:mm 문자열 반환 (input[type="time"] value용)
 */
export function getKstCurrentTime(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const h = parts.find((p) => p.type === 'hour')?.value || '12'
  const m = parts.find((p) => p.type === 'minute')?.value || '00'
  return `${h}:${m}`
}

/**
 * ISO 또는 날짜 문자열에서 한국시간 기준 HH:mm 추출
 */
export function getKstTimeFromIso(isoString?: string): string {
  if (!isoString) return getKstCurrentTime()
  try {
    const normalized = isoString.includes('T') ? isoString : isoString.replace(' ', 'T')
    const d = new Date(normalized)
    if (isNaN(d.getTime())) return getKstCurrentTime()
    return getKstCurrentTime(d)
  } catch {
    return getKstCurrentTime()
  }
}

/**
 * KST 기준 날짜(YYYY-MM-DD)와 시간(HH:mm)을 결합하여 ISO-8601 UTC 문자열로 변환
 */
export function combineKstDateTimeToIso(dateStr: string, timeStr?: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    let hours = 12
    let minutes = 0
    if (timeStr && timeStr.includes(':')) {
      const [h, min] = timeStr.split(':').map(Number)
      if (!isNaN(h)) hours = h
      if (!isNaN(min)) minutes = min
    } else {
      const now = new Date()
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Seoul',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(now)
      hours = parseInt(parts.find((p) => p.type === 'hour')?.value || '12', 10)
      minutes = parseInt(parts.find((p) => p.type === 'minute')?.value || '00', 10)
    }

    const pad = (n: number) => String(n).padStart(2, '0')
    const kstIsoString = `${y}-${pad(m)}-${pad(d)}T${pad(hours)}:${pad(minutes)}:00.000+09:00`
    return new Date(kstIsoString).toISOString()
  } catch {
    return new Date().toISOString()
  }
}

/**
 * HH:mm 문자열을 "오전 08:30" 형식으로 변환
 */
export function formatTimeLabel(hhmm: string): string {
  try {
    const [hStr, mStr] = hhmm.split(':')
    const h = parseInt(hStr, 10)
    const m = parseInt(mStr, 10)
    const ampm = h < 12 ? '오전' : '오후'
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${ampm} ${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  } catch {
    return hhmm
  }
}

/**
 * 거래 생성 시각(created_at)을 한국시간 기준 오전/오후 HH:mm으로 표시
 */
export function formatKoreanTime(created_at?: string): string {
  if (!created_at) return ''
  try {
    const normalized = created_at.includes('T') ? created_at : created_at.replace(' ', 'T')
    const d = new Date(normalized)
    if (isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d)
  } catch {
    return ''
  }
}

export function formatKoreanDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const dayName = dayNames[date.getDay()]
    return `${m}월 ${d}일 (${dayName})`
  } catch {
    return dateStr
  }
}

export function formatGroupDate(dateStr: string): string {
  try {
    const todayStr = getTodayString()
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const dayName = dayNames[date.getDay()]

    if (dateStr === todayStr) {
      return `${d}일 오늘`
    }

    const nowKst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const yest = new Date(nowKst)
    yest.setDate(yest.getDate() - 1)
    const yestStr = getTodayString(yest)
    if (dateStr === yestStr) {
      return `${d}일 어제`
    }

    return `${d}일 ${dayName}요일`
  } catch {
    return dateStr
  }
}

export function formatMonthHeader(yearMonth: string): string {
  try {
    const [y, m] = yearMonth.split('-').map(Number)
    return `${y}년 ${m}월`
  } catch {
    return yearMonth
  }
}

export function getAdjacentYearMonth(yearMonth: string, offset: number): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const date = new Date(y, m - 1 + offset, 1)
  const newY = date.getFullYear()
  const newM = String(date.getMonth() + 1).padStart(2, '0')
  return `${newY}-${newM}`
}

export interface CalendarDay {
  dateStr: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
}

export function generateCalendarMatrix(yearMonth: string): CalendarDay[] {
  const [year, month] = yearMonth.split('-').map(Number)
  const firstDayOfMonth = new Date(year, month - 1, 1)
  const lastDayOfMonth = new Date(year, month, 0)

  const firstDayWeekday = firstDayOfMonth.getDay() // 0 = Sunday
  const daysInMonth = lastDayOfMonth.getDate()

  const todayStr = getTodayString()
  const result: CalendarDay[] = []

  // 이전 달 날짜 채우기
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i
    const prevDate = new Date(year, month - 2, d)
    const yStr = prevDate.getFullYear()
    const mStr = String(prevDate.getMonth() + 1).padStart(2, '0')
    const dStr = String(d).padStart(2, '0')
    const dateStr = `${yStr}-${mStr}-${dStr}`

    result.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    })
  }

  // 이번 달 날짜 채우기
  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = String(month).padStart(2, '0')
    const dStr = String(d).padStart(2, '0')
    const dateStr = `${year}-${mStr}-${dStr}`

    result.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    })
  }

  // 다음 달 날짜 채우기 (42칸 그리드 완료)
  const remaining = 42 - result.length
  for (let d = 1; d <= remaining; d++) {
    const nextDate = new Date(year, month, d)
    const yStr = nextDate.getFullYear()
    const mStr = String(nextDate.getMonth() + 1).padStart(2, '0')
    const dStr = String(d).padStart(2, '0')
    const dateStr = `${yStr}-${mStr}-${dStr}`

    result.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    })
  }

  return result
}

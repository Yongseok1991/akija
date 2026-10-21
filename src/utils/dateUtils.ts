export function getTodayString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getCurrentYearMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
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

    const yest = new Date()
    yest.setDate(yest.getDate() - 1)
    const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`
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

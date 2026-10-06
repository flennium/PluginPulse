const numberFormatter = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const dateFormatter = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' })
const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`
  const units = ['KB', 'MB', 'GB']
  let size = value / 1024
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }
  return `${size >= 10 ? size.toFixed(0) : size.toFixed(1)} ${units[unit]}`
}

export function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : 'Not published'
}

export function relativeDate(value: string): string {
  const days = Math.round((new Date(value).getTime() - Date.now()) / 86_400_000)
  if (Math.abs(days) < 30) return relativeFormatter.format(days, 'day')
  const months = Math.round(days / 30)
  if (Math.abs(months) < 12) return relativeFormatter.format(months, 'month')
  return relativeFormatter.format(Math.round(days / 365), 'year')
}

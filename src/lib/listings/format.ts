const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export function formatPrice(value: number): string {
  return currencyFormatter.format(value)
}

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS
const MONTH_MS = 30 * DAY_MS
const YEAR_MS = 365 * DAY_MS

/**
 * Human-friendly relative time, e.g. "just now", "1 hour ago", "in 2 days".
 * `now` is injectable so the output is deterministic in tests.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""

  const diff = now - then
  const abs = Math.abs(diff)
  const direction = diff >= 0 ? -1 : 1
  const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" })

  if (abs < MINUTE_MS) return "just now"
  if (abs < HOUR_MS) {
    return formatter.format(direction * Math.round(abs / MINUTE_MS), "minute")
  }
  if (abs < DAY_MS) {
    return formatter.format(direction * Math.round(abs / HOUR_MS), "hour")
  }
  if (abs < WEEK_MS) {
    return formatter.format(direction * Math.round(abs / DAY_MS), "day")
  }
  if (abs < MONTH_MS) {
    return formatter.format(direction * Math.round(abs / WEEK_MS), "week")
  }
  if (abs < YEAR_MS) {
    return formatter.format(direction * Math.round(abs / MONTH_MS), "month")
  }
  return formatter.format(direction * Math.round(abs / YEAR_MS), "year")
}

/** "Listed 1 hour ago in Palo Alto, CA" */
export function formatListedAgo(iso: string, location: string, now?: number): string {
  const relative = formatRelativeTime(iso, now)
  return relative ? `Listed ${relative} in ${location}` : `Listed in ${location}`
}

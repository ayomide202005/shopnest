const formatter = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' })

export function formatDateTime(value) {
  return formatter.format(new Date(value))
}
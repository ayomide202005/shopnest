// Money is stored as whole kobo (N15,000 = 1500000), so there are no rounding errors.
const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
})

export function formatNaira(kobo) {
  return nairaFormatter.format(kobo / 100)
}

// "15,000.50" -> 1500050. Returns null if the text is not a valid amount.
export function nairaToKobo(text) {
  const clean = String(text).replace(/,/g, '').trim()
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null
  const [naira, kobo = ''] = clean.split('.')
  return Number(naira) * 100 + Number(kobo.padEnd(2, '0'))
}

// 1500050 -> "15000.50" (for filling the price field when editing)
export function koboToNairaText(kobo) {
  return (kobo / 100).toFixed(2)
}

// Asks Cloudinary for a small, cropped, optimised version of an image.
export function thumbUrl(url, size = 96) {
  return url.replace('/upload/', `/upload/w_${size},h_${size},c_fill,q_auto,f_auto/`)
}
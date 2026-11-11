// "Café Au Lait!" -> "cafe-au-lait"
export const slugify = (value) =>
  String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')

// Returns a slug not used by another document of the same model: "shoes", "shoes-2", "shoes-3"...
export async function generateUniqueSlug(model, base, excludeId) {
  const root = slugify(base) || 'item'
  let candidate = root
  let counter = 1

  while (await model.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    counter += 1
    candidate = `${root}-${counter}`
  }

  return candidate
}
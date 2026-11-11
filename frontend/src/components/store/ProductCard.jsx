import { Link } from 'react-router-dom'
import { formatNaira, thumbUrl } from '../../utils/format.js'

export default function ProductCard({ product }) {
  const image = product.images[0]

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square bg-stone-100">
        {image ? (
          <img
            src={thumbUrl(image.url, 500)}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-stone-400">No image</div>
        )}
        {!product.inStock && (
          <span className="absolute left-2 top-2 rounded-full bg-stone-900/80 px-2.5 py-0.5 text-xs font-medium text-white">
            Out of stock
          </span>
        )}
      </div>
      <div className="p-3">
        {product.category && <p className="text-xs text-stone-500">{product.category.name}</p>}
        <h3 className="mt-0.5 line-clamp-2 text-sm font-medium text-stone-900">{product.name}</h3>
        <p className="mt-1 text-sm font-semibold text-brand-700">{formatNaira(product.price)}</p>
      </div>
    </Link>
  )
}
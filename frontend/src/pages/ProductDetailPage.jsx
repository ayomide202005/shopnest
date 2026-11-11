import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useParams } from 'react-router-dom'
import AddToCart from '../components/store/AddToCart.jsx'
import Alert from '../components/ui/Alert.jsx'
import PageLoader from '../components/PageLoader.jsx'
import { fetchProduct } from '../services/storeService.js'
import { getErrorMessage } from '../services/apiError.js'
import { formatNaira, thumbUrl } from '../utils/format.js'

const LOW_STOCK = 5

function Gallery({ images, name }) {
  const [selected, setSelected] = useState(0)

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-stone-100 text-sm text-stone-400">
        No image
      </div>
    )
  }

  return (
    <div>
      <img
        src={thumbUrl(images[selected].url, 900)}
        alt={name}
        className="aspect-square w-full rounded-xl border border-stone-200 bg-stone-100 object-cover"
      />
      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-6 gap-2">
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Show image ${index + 1}`}
                aria-current={index === selected}
                className={`block w-full overflow-hidden rounded-lg border-2 ${
                  index === selected ? 'border-brand-600' : 'border-transparent hover:border-stone-300'
                }`}
              >
                <img src={thumbUrl(image.url, 150)} alt="" className="aspect-square w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ProductDetailPage() {
  const { slug } = useParams()
  // "slug" records which product these results belong to, so a stale result is never shown.
  const [result, setResult] = useState({ slug: null, product: null, notFound: false, error: '' })

  useEffect(() => {
    const controller = new AbortController()

    fetchProduct(slug, { signal: controller.signal })
      .then((product) => setResult({ slug, product, notFound: false, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return
        const notFound = error.response?.status === 404
        setResult({ slug, product: null, notFound, error: notFound ? '' : getErrorMessage(error) })
      })

    return () => controller.abort()
  }, [slug])

  if (result.slug !== slug) return <PageLoader />

  const { product, notFound, error } = result

  if (notFound || error) {
    return (
      <div className="mx-auto max-w-md py-8 text-center">
        {notFound ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Product not found</h1>
            <p className="mt-2 text-sm text-stone-600">It may have been removed or is no longer available.</p>
          </>
        ) : (
          <Alert tone="error">{error}</Alert>
        )}
        <Link to="/products" className="mt-6 inline-block text-sm font-medium text-brand-700 underline">
          Back to all products
        </Link>
      </div>
    )
  }

  const outOfStock = !product.inStock

  return (
    <div>
      <nav className="text-sm text-stone-500" aria-label="Breadcrumb">
        <Link to="/products" className="hover:text-stone-800">
          Products
        </Link>
        {product.category && (
          <>
            {' / '}
            <Link to={`/products?category=${product.category.slug}`} className="hover:text-stone-800">
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <Gallery key={product.id} images={product.images} name={product.name} />

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-3 text-2xl font-semibold text-brand-700">{formatNaira(product.price)}</p>

          <p className="mt-3 text-sm">
            {outOfStock ? (
              <span className="font-medium text-red-600">Out of stock</span>
            ) : product.stock <= LOW_STOCK ? (
              <span className="font-medium text-amber-700">Only {product.stock} left</span>
            ) : (
              <span className="font-medium text-green-700">In stock</span>
            )}
          </p>

          <AddToCart product={product} />

          {product.description && (
            <div className="mt-8 border-t border-stone-200 pt-6">
              <h2 className="text-sm font-medium text-stone-800">Description</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-600">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
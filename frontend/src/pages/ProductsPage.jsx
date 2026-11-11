import { useEffect, useState } from 'react'
import axios from 'axios'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../components/store/ProductCard.jsx'
import Alert from '../components/ui/Alert.jsx'
import Button from '../components/ui/Button.jsx'
import SelectField from '../components/ui/SelectField.jsx'
import TextField from '../components/ui/TextField.jsx'
import PageLoader from '../components/PageLoader.jsx'
import { fetchCategories, fetchProducts } from '../services/storeService.js'
import { getErrorMessage } from '../services/apiError.js'
import { nairaToKobo } from '../utils/format.js'

const PAGE_SIZE = 12
const ALLOWED_PARAMS = ['page', 'search', 'category', 'minPrice', 'maxPrice', 'sort', 'inStock']

const koboToNairaField = (value) => (value && /^\d+$/.test(value) ? String(Number(value) / 100) : '')

// Remounted (via key) whenever the address changes, so the fields always match it,
// including after the browser's Back button.
function Filters({ params, categories, onApply }) {
  const [search, setSearch] = useState(params.get('search') ?? '')
  const [minPrice, setMinPrice] = useState(koboToNairaField(params.get('minPrice')))
  const [maxPrice, setMaxPrice] = useState(koboToNairaField(params.get('maxPrice')))
  const [inStock, setInStock] = useState(params.get('inStock') === 'true')
  const [errors, setErrors] = useState({})

  const activeCategory = params.get('category') ?? ''

  const handleSubmit = (event) => {
    event.preventDefault()
    const found = {}

    let min = ''
    let max = ''
    if (minPrice.trim()) {
      min = nairaToKobo(minPrice)
      if (min === null) found.minPrice = 'Enter a valid amount'
    }
    if (maxPrice.trim()) {
      max = nairaToKobo(maxPrice)
      if (max === null) found.maxPrice = 'Enter a valid amount'
    }
    if (!found.minPrice && !found.maxPrice && min !== '' && max !== '' && min > max) {
      found.minPrice = 'Minimum cannot be above maximum'
    }

    setErrors(found)
    if (Object.keys(found).length > 0) return

    onApply({
      search: search.trim(),
      minPrice: min,
      maxPrice: max,
      inStock: inStock ? 'true' : '',
    })
  }

  return (
    <aside className="space-y-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-xl border border-stone-200 bg-white p-4">
        <div>
          <label htmlFor="store-search" className="block text-sm font-medium text-stone-800">
            Search
          </label>
          <input
            id="store-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="e.g. sneakers"
            className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Min price (₦)"
            name="minPrice"
            inputMode="decimal"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            error={errors.minPrice}
          />
          <TextField
            label="Max price (₦)"
            name="maxPrice"
            inputMode="decimal"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            error={errors.maxPrice}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(event) => setInStock(event.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-600"
          />
          In stock only
        </label>

        <Button type="submit" className="w-full">
          Apply filters
        </Button>
      </form>

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-medium text-stone-800">Categories</h2>
        <ul className="mt-3 space-y-1 text-sm">
          <li>
            <button
              type="button"
              onClick={() => onApply({ category: '' })}
              className={`w-full rounded-md px-2 py-1.5 text-left ${
                activeCategory === '' ? 'bg-brand-50 font-medium text-brand-700' : 'text-stone-700 hover:bg-stone-50'
              }`}
            >
              All products
            </button>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => onApply({ category: category.slug })}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left ${
                  activeCategory === category.slug
                    ? 'bg-brand-50 font-medium text-brand-700'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span>{category.name}</span>
                <span className="text-xs text-stone-400">{category.productCount}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paramString = searchParams.toString()

  const [categories, setCategories] = useState([])
  const [attempt, setAttempt] = useState(0)
  // "key" records which address these results belong to, so we know when they are out of date.
  const [result, setResult] = useState({ key: null, products: [], pagination: null, error: '' })

  useEffect(() => {
    const controller = new AbortController()
    fetchCategories({ signal: controller.signal })
      .then(setCategories)
      .catch(() => {}) // the category list just stays empty
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const params = {}
    for (const [name, value] of new URLSearchParams(paramString)) {
      if (ALLOWED_PARAMS.includes(name)) params[name] = value
    }

    fetchProducts({ ...params, limit: PAGE_SIZE }, { signal: controller.signal })
      .then(({ products, pagination }) => setResult({ key: paramString, products, pagination, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return
        setResult({ key: paramString, products: [], pagination: null, error: getErrorMessage(error) })
      })

    return () => controller.abort()
  }, [paramString, attempt])

  const update = (changes) => {
    const next = new URLSearchParams(searchParams)
    for (const [name, value] of Object.entries(changes)) {
      if (value === '' || value === undefined || value === null) next.delete(name)
      else next.set(name, String(value))
    }
    if (!('page' in changes)) next.delete('page') // any filter change starts again at page 1
    setSearchParams(next)
  }

  const goToPage = (page) => {
    update({ page })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const retry = () => {
    setResult((current) => ({ ...current, key: null }))
    setAttempt((count) => count + 1)
  }

  const loading = result.key !== paramString
  const { products, pagination, error } = result
  const activeCategory = categories.find((category) => category.slug === searchParams.get('category'))
  const filtering = ['search', 'category', 'minPrice', 'maxPrice', 'inStock'].some((name) => searchParams.has(name))

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{activeCategory ? activeCategory.name : 'All products'}</h1>
      {activeCategory?.description && <p className="mt-1 text-sm text-stone-600">{activeCategory.description}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <Filters key={paramString} params={searchParams} categories={categories} onApply={update} />

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-600">
              {!loading && pagination ? `${pagination.total} product${pagination.total === 1 ? '' : 's'}` : ' '}
            </p>
            <SelectField
              aria-label="Sort products"
              value={searchParams.get('sort') ?? 'newest'}
              onChange={(event) => update({ sort: event.target.value })}
              className="w-52"
            >
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="name_asc">Name A to Z</option>
            </SelectField>
          </div>

          {loading && <PageLoader />}

          {!loading && error && (
            <div className="max-w-md">
              <Alert tone="error">{error}</Alert>
              <Button variant="secondary" className="mt-4" onClick={retry}>
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
              <p className="text-sm text-stone-600">
                {filtering ? 'No products match your filters.' : 'There are no products yet. Please check back soon.'}
              </p>
              {filtering && (
                <Button variant="secondary" className="mt-4" onClick={() => setSearchParams({})}>
                  Clear all filters
                </Button>
              )}
            </div>
          )}

          {!loading && !error && products.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-4 text-sm text-stone-600">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!pagination.hasPrev}
                    onClick={() => goToPage(pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!pagination.hasNext}
                    onClick={() => goToPage(pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
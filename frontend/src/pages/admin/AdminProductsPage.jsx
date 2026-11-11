import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useLocation } from 'react-router-dom'
import ConfirmDeleteModal from '../../components/admin/ConfirmDeleteModal.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import SelectField from '../../components/ui/SelectField.jsx'
import PageLoader from '../../components/PageLoader.jsx'
import { deleteProduct, fetchAdminCategories, fetchAdminProducts } from '../../services/adminService.js'
import { getErrorMessage } from '../../services/apiError.js'
import { formatNaira, thumbUrl } from '../../utils/format.js'

const PAGE_SIZE = 10
const LOW_STOCK = 5

const STATUS_STYLES = {
  published: 'bg-green-100 text-green-800',
  draft: 'bg-stone-200 text-stone-700',
  archived: 'bg-amber-100 text-amber-800',
}

const DEFAULT_QUERY = { page: 1, search: '', status: '', category: '', sort: 'newest' }

export default function AdminProductsPage() {
  const location = useLocation()
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [searchText, setSearchText] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', products: [], pagination: null, error: '' })
  const [categories, setCategories] = useState([])
  const [deleting, setDeleting] = useState(null)
  const [notice, setNotice] = useState(location.state?.notice ?? '')

  // Categories, for the filter drop-down.
  useEffect(() => {
    const controller = new AbortController()
    fetchAdminCategories({ signal: controller.signal })
      .then(({ categories: list }) => setCategories(list))
      .catch(() => {}) // the filter simply stays empty
    return () => controller.abort()
  }, [])

  // Products, whenever the filters, page or reload counter change.
  useEffect(() => {
    const controller = new AbortController()

    fetchAdminProducts({ ...query, limit: PAGE_SIZE }, { signal: controller.signal })
      .then(({ products, pagination }) => setState({ status: 'ready', products, pagination, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return
        setState({ status: 'error', products: [], pagination: null, error: getErrorMessage(error) })
      })

    return () => controller.abort()
  }, [query, attempt])

  const changeQuery = (changes) => {
    setState((current) => ({ ...current, status: 'loading' }))
    setQuery((current) => ({ ...current, page: 1, ...changes }))
  }

  const goToPage = (page) => {
    setState((current) => ({ ...current, status: 'loading' }))
    setQuery((current) => ({ ...current, page }))
  }

  const reload = () => {
    setState((current) => ({ ...current, status: 'loading' }))
    setAttempt((count) => count + 1)
  }

  const handleSearch = (event) => {
    event.preventDefault()
    changeQuery({ search: searchText.trim() })
  }

  const clearFilters = () => {
    setSearchText('')
    changeQuery({ search: '', status: '', category: '', sort: 'newest' })
  }

  const handleDelete = async () => {
    await deleteProduct(deleting.id)
    setNotice(`"${deleting.name}" was deleted.`)
    setDeleting(null)
    // If that was the last item on the page, go back one page.
    if (state.products.length === 1 && query.page > 1) goToPage(query.page - 1)
    else reload()
  }

  const { status, products, pagination, error } = state
  const filtering = Boolean(query.search || query.status || query.category)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-stone-600">Add, edit and publish what you sell.</p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Add product
        </Link>
      </div>

      {notice && (
        <Alert tone="success" className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice('')} className="text-xs font-medium underline">
              Dismiss
            </button>
          </div>
        </Alert>
      )}

      {/* Filters */}
      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by name"
            aria-label="Search products by name"
            className="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <SelectField
          aria-label="Filter by status"
          value={query.status}
          onChange={(event) => changeQuery({ status: event.target.value })}
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </SelectField>

        <SelectField
          aria-label="Filter by category"
          value={query.category}
          onChange={(event) => changeQuery({ category: event.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          aria-label="Sort products"
          value={query.sort}
          onChange={(event) => changeQuery({ sort: event.target.value })}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name_asc">Name A to Z</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="stock_asc">Lowest stock first</option>
        </SelectField>
      </div>

      <div className="mt-6">
        {status === 'loading' && <PageLoader />}

        {status === 'error' && (
          <div className="max-w-md">
            <Alert tone="error">{error}</Alert>
            <Button variant="secondary" className="mt-4" onClick={reload}>
              Try again
            </Button>
          </div>
        )}

        {status === 'ready' && products.length === 0 && (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
            {filtering ? (
              <>
                <p className="text-sm text-stone-600">No products match your filters.</p>
                <Button variant="secondary" className="mt-4" onClick={clearFilters}>
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-stone-600">You have not added any products yet.</p>
                <Link
                  to="/admin/products/new"
                  className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Add your first product
                </Link>
              </>
            )}
          </div>
        )}

        {status === 'ready' && products.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-stone-200 text-sm">
                <thead className="bg-stone-50 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">Product</th>
                    <th scope="col" className="hidden px-4 py-3 md:table-cell">Category</th>
                    <th scope="col" className="px-4 py-3">Price</th>
                    <th scope="col" className="px-4 py-3">Stock</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.images[0] ? (
                            <img
                              src={thumbUrl(product.images[0].url)}
                              alt=""
                              className="h-12 w-12 flex-none rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-stone-100 text-[10px] text-stone-400">
                              No image
                            </div>
                          )}
                          <span className="font-medium text-stone-900">{product.name}</span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-stone-600 md:table-cell">{product.category?.name ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-stone-900">{formatNaira(product.price)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {product.stock === 0 ? (
                          <span className="font-medium text-red-600">Out of stock</span>
                        ) : product.stock <= LOW_STOCK ? (
                          <span className="font-medium text-amber-700">{product.stock} (low)</span>
                        ) : (
                          <span className="text-stone-600">{product.stock}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[product.status]}`}
                        >
                          {product.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            className="inline-flex items-center rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
                          >
                            Edit
                          </Link>
                          <Button variant="secondary" size="sm" onClick={() => setDeleting(product)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-stone-600">
              <p>
                {pagination.total} product{pagination.total === 1 ? '' : 's'} · page {pagination.page} of{' '}
                {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.hasPrev}
                  onClick={() => goToPage(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.hasNext}
                  onClick={() => goToPage(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {deleting && (
        <ConfirmDeleteModal
          title="Delete product"
          message={`Delete "${deleting.name}"? Its images will be removed too. This cannot be undone. To hide it from customers without deleting it, set its status to Archived instead.`}
          confirmLabel="Delete product"
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
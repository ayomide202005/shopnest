import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ImageUploader from '../../components/admin/ImageUploader.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import SelectField from '../../components/ui/SelectField.jsx'
import TextAreaField from '../../components/ui/TextAreaField.jsx'
import TextField from '../../components/ui/TextField.jsx'
import PageLoader from '../../components/PageLoader.jsx'
import {
  createProduct,
  fetchAdminCategories,
  fetchAdminProduct,
  updateProduct,
} from '../../services/adminService.js'
import { getErrorMessage, getFieldErrors } from '../../services/apiError.js'
import { koboToNairaText, nairaToKobo } from '../../utils/format.js'

const EMPTY_FORM = { name: '', description: '', price: '', stock: '0', category: '', status: 'draft' }

export default function AdminProductFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [load, setLoad] = useState({ status: 'loading', error: '' })
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [images, setImages] = useState([])
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    Promise.all([fetchAdminCategories({ signal }), isEdit ? fetchAdminProduct(id, { signal }) : null])
      .then(([{ categories: list }, product]) => {
        setCategories(list)
        if (product) {
          setForm({
            name: product.name,
            description: product.description ?? '',
            price: koboToNairaText(product.price),
            stock: String(product.stock),
            category: product.category?.id ?? '',
            status: product.status,
          })
          setImages(product.images)
        }
        setLoad({ status: 'ready', error: '' })
      })
      .catch((error) => {
        if (axios.isCancel(error)) return
        setLoad({ status: 'error', error: getErrorMessage(error) })
      })

    return () => controller.abort()
  }, [id, isEdit])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleImagesChange = (next) => {
    setImages(next)
    setErrors((current) => ({ ...current, images: undefined }))
  }

  const validate = () => {
    const found = {}
    const name = form.name.trim()
    if (name.length < 3) found.name = 'Product name must be at least 3 characters'
    else if (name.length > 120) found.name = 'Product name must be at most 120 characters'

    const kobo = nairaToKobo(form.price)
    if (kobo === null) found.price = 'Enter a valid amount, for example 15000 or 15000.50'
    else if (kobo < 1) found.price = 'Price must be greater than zero'

    if (!/^\d+$/.test(form.stock.trim())) found.stock = 'Stock must be a whole number (0 or more)'

    if (!form.category) found.category = 'Choose a category'
    if (form.description.trim().length > 5000) found.description = 'Description must be at most 5000 characters'
    if (form.status === 'published' && images.length === 0) found.images = 'Add at least one image before publishing.'

    return { found, kobo }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    const { found, kobo } = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: kobo,
      stock: Number(form.stock),
      category: form.category,
      status: form.status,
      images,
    }

    setSubmitting(true)
    try {
      const saved = isEdit ? await updateProduct(id, payload) : await createProduct(payload)
      navigate('/admin/products', {
        state: { notice: `"${saved.name}" was ${isEdit ? 'updated' : 'added'}.` },
      })
    } catch (error) {
      setErrors(getFieldErrors(error))
      setFormError(getErrorMessage(error))
      setSubmitting(false)
    }
  }

  if (load.status === 'loading') return <PageLoader />

  if (load.status === 'error') {
    return (
      <div className="max-w-md">
        <Alert tone="error">{load.error}</Alert>
        <Link to="/admin/products" className="mt-4 inline-block text-sm font-medium text-brand-700 underline">
          Back to products
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <Link to="/admin/products" className="text-sm text-stone-600 hover:text-stone-900">
        ← Back to products
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{isEdit ? 'Edit product' : 'Add product'}</h1>

      {categories.length === 0 && (
        <Alert tone="error" className="mt-6">
          You need a category first.{' '}
          <Link to="/admin/categories" className="font-medium underline">
            Add a category
          </Link>
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        {formError && <Alert tone="error">{formError}</Alert>}

        <TextField label="Name" name="name" value={form.name} onChange={handleChange} error={errors.name} />

        <TextAreaField
          label="Description (optional)"
          name="description"
          rows={5}
          value={form.description}
          onChange={handleChange}
          error={errors.description}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Price (₦)"
            name="price"
            inputMode="decimal"
            placeholder="15000"
            value={form.price}
            onChange={handleChange}
            error={errors.price}
          />
          <TextField
            label="Stock"
            name="stock"
            inputMode="numeric"
            value={form.stock}
            onChange={handleChange}
            error={errors.stock}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField label="Category" name="category" value={form.category} onChange={handleChange} error={errors.category}>
            <option value="">Choose a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>

          <SelectField label="Status" name="status" value={form.status} onChange={handleChange} error={errors.status}>
            <option value="draft">Draft (hidden from customers)</option>
            <option value="published">Published (visible to customers)</option>
            <option value="archived">Archived (hidden from customers)</option>
          </SelectField>
        </div>

        <ImageUploader images={images} onChange={handleImagesChange} error={errors.images} />

        <div className="flex justify-end gap-3 border-t border-stone-200 pt-5">
          <Link
            to="/admin/products"
            className="inline-flex items-center rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            Cancel
          </Link>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save changes' : 'Add product'}
          </Button>
        </div>
      </form>
    </div>
  )
}
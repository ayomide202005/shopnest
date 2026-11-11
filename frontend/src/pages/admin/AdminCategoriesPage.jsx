import { useEffect, useState } from 'react'
import axios from 'axios'
import CategoryFormModal from '../../components/admin/CategoryFormModal.jsx'
import ConfirmDeleteModal from '../../components/admin/ConfirmDeleteModal.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import PageLoader from '../../components/PageLoader.jsx'
import { deleteCategory, fetchAdminCategories } from '../../services/adminService.js'
import { getErrorMessage } from '../../services/apiError.js'

export default function AdminCategoriesPage() {
  const [state, setState] = useState({ status: 'loading', categories: [], error: '' })
  const [attempt, setAttempt] = useState(0)
  const [editing, setEditing] = useState(null) // null | 'new' | a category
  const [deleting, setDeleting] = useState(null) // null | a category
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    fetchAdminCategories({ signal: controller.signal })
      .then(({ categories }) => setState({ status: 'ready', categories, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return
        setState({ status: 'error', categories: [], error: getErrorMessage(error) })
      })

    return () => controller.abort()
  }, [attempt])

  const reload = () => setAttempt((count) => count + 1)

  const handleSaved = (category, wasEdit) => {
    setEditing(null)
    setNotice(wasEdit ? `"${category.name}" was updated.` : `"${category.name}" was added.`)
    reload()
  }

  const handleDelete = async () => {
    await deleteCategory(deleting.id)
    setNotice(`"${deleting.name}" was deleted.`)
    setDeleting(null)
    reload()
  }

  const { status, categories, error } = state

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="mt-1 text-sm text-stone-600">Group your products so customers can find them.</p>
        </div>
        <Button onClick={() => setEditing('new')}>Add category</Button>
      </div>

      {notice && (
        <Alert tone="success" className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice('')}
              className="text-xs font-medium underline"
              aria-label="Dismiss message"
            >
              Dismiss
            </button>
          </div>
        </Alert>
      )}

      <div className="mt-6">
        {status === 'loading' && <PageLoader />}

        {status === 'error' && (
          <div className="max-w-md">
            <Alert tone="error">{error}</Alert>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => {
                setState({ status: 'loading', categories: [], error: '' })
                reload()
              }}
            >
              Try again
            </Button>
          </div>
        )}

        {status === 'ready' && categories.length === 0 && (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
            <p className="text-sm text-stone-600">You have not added any categories yet.</p>
            <Button className="mt-4" onClick={() => setEditing('new')}>
              Add your first category
            </Button>
          </div>
        )}

        {status === 'ready' && categories.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="bg-stone-50 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Name</th>
                  <th scope="col" className="hidden px-4 py-3 md:table-cell">Description</th>
                  <th scope="col" className="px-4 py-3">Products</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{category.name}</p>
                      <p className="text-xs text-stone-500">/{category.slug}</p>
                    </td>
                    <td className="hidden max-w-xs truncate px-4 py-3 text-stone-600 md:table-cell">
                      {category.description || <span className="text-stone-400">No description</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                      {category.publishedCount} of {category.productCount} published
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setEditing(category)}>
                          Edit
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setDeleting(category)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <CategoryFormModal
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          title="Delete category"
          message={`Delete "${deleting.name}"? This cannot be undone. A category that still has products cannot be deleted.`}
          confirmLabel="Delete category"
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
import { useState } from 'react'
import Alert from '../ui/Alert.jsx'
import Button from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'
import TextAreaField from '../ui/TextAreaField.jsx'
import TextField from '../ui/TextField.jsx'
import { createCategory, updateCategory } from '../../services/adminService.js'
import { getErrorMessage, getFieldErrors } from '../../services/apiError.js'

// category = null creates a new category, otherwise the given one is edited.
export default function CategoryFormModal({ category, onClose, onSaved }) {
  const isEdit = Boolean(category)
  const [form, setForm] = useState({
    name: category?.name ?? '',
    description: category?.description ?? '',
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    const clientErrors = {}
    const name = form.name.trim()
    if (name.length < 2) clientErrors.name = 'Category name must be at least 2 characters'
    else if (name.length > 50) clientErrors.name = 'Category name must be at most 50 characters'
    if (form.description.trim().length > 300) clientErrors.description = 'Description must be at most 300 characters'
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    setSubmitting(true)
    try {
      const payload = { name, description: form.description.trim() }
      const saved = isEdit ? await updateCategory(category.id, payload) : await createCategory(payload)
      onSaved(saved, isEdit)
    } catch (error) {
      setErrors(getFieldErrors(error))
      setFormError(getErrorMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit category' : 'Add category'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}

        <TextField
          label="Name"
          name="name"
          autoFocus
          value={form.name}
          onChange={handleChange}
          error={errors.name}
        />
        <TextAreaField
          label="Description (optional)"
          name="description"
          value={form.description}
          onChange={handleChange}
          error={errors.description}
          hint="Up to 300 characters."
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save changes' : 'Add category'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
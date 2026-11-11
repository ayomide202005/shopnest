import { useState } from 'react'
import Alert from '../ui/Alert.jsx'
import Button from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'
import { getErrorMessage } from '../../services/apiError.js'

// onConfirm must be an async function that throws if the deletion fails.
// The parent closes the dialog after a successful deletion.
export default function ConfirmDeleteModal({ title, message, confirmLabel = 'Delete', onConfirm, onClose }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    setSubmitting(true)
    setError('')
    try {
      await onConfirm()
    } catch (err) {
      setError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-stone-600">{message}</p>
      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} loading={submitting}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
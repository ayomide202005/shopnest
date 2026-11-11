import { useRef, useState } from 'react'
import Alert from '../ui/Alert.jsx'
import Button from '../ui/Button.jsx'
import { uploadProductImages } from '../../services/adminService.js'
import { getErrorMessage } from '../../services/apiError.js'
import { thumbUrl } from '../../utils/format.js'

const MAX_IMAGES = 6
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// images = [{ url, publicId }]; the first one is the main image.
export default function ImageUploader({ images, onChange, error }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const remaining = MAX_IMAGES - images.length

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = '' // lets the same file be chosen again later
    if (files.length === 0) return

    setUploadError('')

    if (files.length > remaining) {
      setUploadError(`You can add ${remaining} more image${remaining === 1 ? '' : 's'} (maximum ${MAX_IMAGES}).`)
      return
    }
    const wrongType = files.find((file) => !ALLOWED_TYPES.includes(file.type))
    if (wrongType) {
      setUploadError(`"${wrongType.name}" is not a JPG, PNG or WebP image.`)
      return
    }
    const tooBig = files.find((file) => file.size > MAX_BYTES)
    if (tooBig) {
      setUploadError(`"${tooBig.name}" is larger than 5 MB.`)
      return
    }

    setUploading(true)
    try {
      const uploaded = await uploadProductImages(files)
      onChange([...images, ...uploaded])
    } catch (err) {
      setUploadError(getErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (publicId) => onChange(images.filter((image) => image.publicId !== publicId))

  const makeMain = (publicId) => {
    const chosen = images.find((image) => image.publicId === publicId)
    onChange([chosen, ...images.filter((image) => image.publicId !== publicId)])
  }

  return (
    <div>
      <p className="block text-sm font-medium text-stone-800">Images</p>
      <p className="mt-1 text-xs text-stone-500">
        Up to {MAX_IMAGES} images (JPG, PNG or WebP, 5 MB each). The first image is the main one.
      </p>

      {images.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <li key={image.publicId} className="overflow-hidden rounded-lg border border-stone-200 bg-white">
              <img src={thumbUrl(image.url, 300)} alt="" className="aspect-square w-full object-cover" />
              <div className="flex items-center justify-between gap-2 p-2">
                {index === 0 ? (
                  <span className="text-xs font-medium text-brand-700">Main image</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => makeMain(image.publicId)}
                    className="text-xs font-medium text-stone-600 underline"
                  >
                    Make main
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(image.publicId)}
                  className="text-xs font-medium text-red-600 underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <Button
        variant="secondary"
        size="sm"
        className="mt-3"
        loading={uploading}
        disabled={remaining <= 0}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Uploading…' : images.length === 0 ? 'Add images' : 'Add more images'}
      </Button>

      {uploadError && (
        <Alert tone="error" className="mt-3">
          {uploadError}
        </Alert>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
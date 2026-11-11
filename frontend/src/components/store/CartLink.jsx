import { Link } from 'react-router-dom'
import useCart from '../../hooks/useCart.js'

export default function CartLink() {
  const { itemCount } = useCart()

  return (
    <Link
      to="/cart"
      className="relative inline-flex items-center gap-1.5 font-medium text-stone-700 hover:text-brand-700"
      aria-label={`Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`}
    >
      Cart
      {itemCount > 0 && (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-semibold leading-5 text-white">
          {itemCount}
        </span>
      )}
    </Link>
  )
}
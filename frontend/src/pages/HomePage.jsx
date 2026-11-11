import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/store/ProductCard.jsx'
import { fetchCategories, fetchProducts } from '../services/storeService.js'
import { formatNaira, thumbUrl } from '../utils/format.js'

// Edit this wording to match what you really offer. Only promise what you can deliver.
const TRUST_ITEMS = [
  { title: 'Quality you can trust', text: 'Products we are proud to sell' },
  { title: 'Fair prices', text: 'Clear prices in naira' },
  { title: 'Secure shopping', text: 'Protected account and sign-in' },
  { title: 'Here to help', text: 'Friendly customer support' },
]

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function Arrow({ direction }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={direction === 'left' ? 'M15.75 19.5 8.25 12l7.5-7.5' : 'm8.25 4.5 7.5 7.5-7.5 7.5'}
      />
    </svg>
  )
}

function HeroCarousel({ products }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const slides = [
    { key: 'welcome', type: 'welcome' },
    ...products
      .filter((product) => product.images[0])
      .slice(0, 3)
      .map((product) => ({ key: product.id, type: 'product', product })),
  ]
  const count = slides.length
  const current = index % count

  useEffect(() => {
    if (paused || count < 2) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = setInterval(() => setIndex((value) => (value + 1) % count), 5000)
    return () => clearInterval(timer)
  }, [paused, count])

  const go = (next) => setIndex((next + count) % count)

  return (
    <div
      className="relative h-72 overflow-hidden rounded-xl bg-gradient-to-br from-brand-700 to-brand-600 text-white shadow-sm sm:h-80 lg:h-96"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured"
    >
      {slides.map((slide, position) => (
        <div
          key={slide.key}
          inert={position !== current}
          aria-hidden={position !== current}
          className={`absolute inset-0 flex items-center justify-between gap-4 px-6 transition-opacity duration-500 sm:px-12 ${
            position === current ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {slide.type === 'welcome' ? (
            <div className="max-w-md">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Welcome to ShopNest</p>
              <h2 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Shop the things you love, at prices you like
              </h2>
              <p className="mt-3 text-sm text-white/85 sm:text-base">New products added all the time.</p>
              <Link
                to="/products"
                className="mt-6 inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                Start shopping
              </Link>
            </div>
          ) : (
            <>
              <div className="min-w-0 max-w-md">
                <span className="inline-block rounded-full bg-amber-400 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-stone-900">
                  New arrival
                </span>
                <h2 className="mt-3 line-clamp-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                  {slide.product.name}
                </h2>
                <p className="mt-2 text-xl font-semibold sm:text-2xl">{formatNaira(slide.product.price)}</p>
                <Link
                  to={`/products/${slide.product.slug}`}
                  className="mt-5 inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                >
                  Shop now
                </Link>
              </div>
              <img
                src={thumbUrl(slide.product.images[0].url, 600)}
                alt=""
                className="h-32 w-32 flex-none rounded-2xl object-cover shadow-xl ring-4 ring-white/30 sm:h-60 sm:w-60"
              />
            </>
          )}
        </div>
      ))}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(current - 1)}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/20 p-1.5 hover:bg-white/35 sm:block"
          >
            <Arrow direction="left" />
          </button>
          <button
            type="button"
            onClick={() => go(current + 1)}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/20 p-1.5 hover:bg-white/35 sm:block"
          >
            <Arrow direction="right" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            {slides.map((slide, position) => (
              <button
                key={slide.key}
                type="button"
                onClick={() => go(position)}
                aria-label={`Show slide ${position + 1}`}
                aria-current={position === current}
                className={`h-2 rounded-full transition-all ${position === current ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SectionHeader({ title, to, linkLabel = 'See all' }) {
  return (
    <div className="flex items-center justify-between rounded-t-xl bg-brand-600 px-4 py-3 text-white">
      <h2 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
      <Link to={to} className="text-sm font-medium hover:underline">
        {linkLabel} →
      </Link>
    </div>
  )
}

function ProductSkeletons({ count }) {
  return Array.from({ length: count }, (_, position) => (
    <div key={position} className="animate-pulse overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="aspect-square bg-stone-200" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-1/3 rounded bg-stone-200" />
        <div className="h-4 w-4/5 rounded bg-stone-200" />
        <div className="h-4 w-1/2 rounded bg-stone-200" />
      </div>
    </div>
  ))
}

function ProductSection({ title, to, products, loading }) {
  if (!loading && products.length === 0) return null
  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200">
      <SectionHeader title={title} to={to} />
      <div className="grid grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-4">
        {loading ? <ProductSkeletons count={4} /> : products.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  )
}

export default function HomePage() {
  const [data, setData] = useState({ loading: true, latest: [], cheapest: [], categories: [] })

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    Promise.allSettled([
      fetchProducts({ limit: 24, sort: 'newest' }, { signal }),
      fetchProducts({ limit: 4, sort: 'price_asc', inStock: 'true' }, { signal }),
      fetchCategories({ signal }),
    ]).then(([latest, cheapest, categories]) => {
      if (signal.aborted) return
      setData({
        loading: false,
        latest: latest.status === 'fulfilled' ? latest.value.products : [],
        cheapest: cheapest.status === 'fulfilled' ? cheapest.value.products : [],
        categories: categories.status === 'fulfilled' ? categories.value : [],
      })
    })

    return () => controller.abort()
  }, [])

  const { loading, latest, cheapest, categories } = data
  const shownCategories = categories.filter((category) => category.productCount > 0)

  // A photo for each category tile, taken from one of its products.
  const categoryImage = new Map()
  for (const product of latest) {
    if (product.category && product.images[0] && !categoryImage.has(product.category.id)) {
      categoryImage.set(product.category.id, product.images[0].url)
    }
  }

  return (
    <div className="space-y-8">
      {/* Top: categories | banner | promos */}
      <div className="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)_13rem]">
        <aside className="hidden rounded-xl bg-white p-2 shadow-sm ring-1 ring-stone-200 lg:block">
          <h2 className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Categories</h2>
          <ul>
            {shownCategories.slice(0, 10).map((category) => (
              <li key={category.id}>
                <Link
                  to={`/products?category=${category.slug}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-brand-50 hover:text-brand-700"
                >
                  <span className="truncate">{category.name}</span>
                  <span className="text-stone-300">›</span>
                </Link>
              </li>
            ))}
            <li>
              <Link to="/products" className="block rounded-lg px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50">
                All products →
              </Link>
            </li>
          </ul>
        </aside>

        <HeroCarousel products={latest} />

        <div className="hidden grid-rows-2 gap-4 lg:grid">
          <Link
            to="/products?sort=newest"
            className="flex flex-col justify-end rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 p-4 text-stone-900 shadow-sm hover:brightness-105"
          >
            <span className="text-xs font-semibold uppercase tracking-wide">Just in</span>
            <span className="mt-1 text-lg font-bold leading-tight">New arrivals</span>
            <span className="mt-1 text-sm font-medium">Shop now →</span>
          </Link>
          <Link
            to="/products?sort=price_asc"
            className="flex flex-col justify-end rounded-xl bg-gradient-to-br from-stone-800 to-stone-900 p-4 text-white shadow-sm hover:brightness-110"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">Save more</span>
            <span className="mt-1 text-lg font-bold leading-tight">Best prices</span>
            <span className="mt-1 text-sm font-medium">Shop now →</span>
          </Link>
        </div>
      </div>

      {/* Phone: swipeable category chips */}
      {shownCategories.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
          {shownCategories.map((category) => (
            <Link
              key={category.id}
              to={`/products?category=${category.slug}`}
              className="flex-none rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm text-stone-700"
            >
              {category.name}
            </Link>
          ))}
        </div>
      )}

      {/* Trust strip */}
      <ul className="grid grid-cols-2 gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200 lg:grid-cols-4">
        {TRUST_ITEMS.map((item) => (
          <li key={item.title} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <CheckIcon />
            </span>
            <span>
              <span className="block text-sm font-semibold text-stone-900">{item.title}</span>
              <span className="block text-xs text-stone-500">{item.text}</span>
            </span>
          </li>
        ))}
      </ul>

      <ProductSection title="New arrivals" to="/products?sort=newest" products={latest} loading={loading} />

      {/* Category tiles */}
      {shownCategories.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold tracking-tight">Shop by category</h2>
          <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {shownCategories.slice(0, 12).map((category) => {
              const image = categoryImage.get(category.id)
              return (
                <Link key={category.id} to={`/products?category=${category.slug}`} className="group text-center">
                  <div className="mx-auto aspect-square w-full max-w-28 overflow-hidden rounded-full bg-brand-50 ring-2 ring-white shadow-sm transition-shadow group-hover:shadow-md">
                    {image ? (
                      <img src={thumbUrl(image, 240)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl font-bold text-brand-700">
                        {category.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-stone-800 group-hover:text-brand-700">
                    {category.name}
                  </p>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <ProductSection title="Best prices" to="/products?sort=price_asc" products={cheapest} loading={loading} />

      {/* Closing banner */}
      <section className="rounded-xl bg-stone-900 px-6 py-8 text-center text-white sm:py-10">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Can't find what you're looking for?</h2>
        <p className="mt-2 text-sm text-stone-300">Search our full range and filter by category and price.</p>
        <Link
          to="/products"
          className="mt-5 inline-flex rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-stone-900 hover:bg-amber-300"
        >
          Browse all products
        </Link>
      </section>
    </div>
  )
}
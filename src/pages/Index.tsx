import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '@/components/ProductCard';
import { useProductStore } from '@/stores/useProductStore';

/* ─────────────────────────────────────────────────────────────
   OWARIN New Arrivals Carousel
   CSS transform-based — zero scrollbar, nostos DNA
───────────────────────────────────────────────────────────────*/
type CarouselProduct = ReturnType<typeof useProductStore.getState>['products'][number];

const NewArrivalsCarousel = ({ products }: { products: CarouselProduct[] }) => {
  const [idx, setIdx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const total = products.length;

  const clamp = (n: number) => Math.max(0, Math.min(total - 1, n));
  const go = useCallback((n: number) => setIdx(clamp(n)), [total]);

  /* ── Keyboard navigation ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ✅ ไม่ดักคีย์บอร์ดเมื่อ focus อยู่ที่ input/select/button อื่น
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(tag)) return;
      if (e.key === 'ArrowLeft') go(idx - 1);
      if (e.key === 'ArrowRight') go(idx + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [idx, go]);

  /* ── Touch / mouse swipe ── */
  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setDragStart(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    const delta = dragStart - e.clientX;
    if (Math.abs(delta) > 40) go(idx + (delta > 0 ? 1 : -1));
  };

  if (total === 0) return null;

  return (
    <div className="select-none">
      {/* ── Viewport — clips overflow, no scrollbar at all ── */}
      <div className="relative overflow-hidden">

        {/* ── Track — slides via CSS transform ── */}
        <div
          ref={trackRef}
          className="flex"
          style={{
            transform: `translateX(calc(-${idx} * (var(--card-w) + var(--card-gap))))`,
            transition: dragging ? 'none' : 'transform 0.38s cubic-bezier(0.4,0,0.2,1)',
            /* CSS custom props for card sizing */
            ['--card-w' as string]: 'min(75vw, 280px)',
            ['--card-gap' as string]: '16px',
            gap: 'var(--card-gap)',
            touchAction: 'pan-y',   // ✅ ให้ browser scroll แนวตั้งได้ แต่ horizontal pointer event ไม่ถูก intercept
          }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setDragging(false)}
        >
          {products.map((product, i) => (
            <div
              key={product.id}
              style={{ width: 'var(--card-w)', minWidth: 'var(--card-w)' }}
              className="sm:w-[42vw] sm:min-w-[unset] md:w-[28vw] lg:w-[21vw] xl:w-[17vw]"
            >
              {/* Only render visible ±1 cards for perf */}
              {Math.abs(i - idx) <= 2 ? (
                <ProductCard product={product} priority={i === 0} />
              ) : (
                <div style={{ aspectRatio: '1', background: '#111114' }} />
              )}
            </div>
          ))}
        </div>

        {/* ── Overlay arrows — OWARIN sharp style ── */}
        <button
          onClick={() => go(idx - 1)}
          disabled={idx === 0}
          aria-label="Previous"
          className="hidden sm:flex absolute left-2 top-[38%] -translate-y-1/2 z-10
                     w-8 h-8 items-center justify-center
                     border border-white/12 bg-[#0c0c0e]/75 backdrop-blur-[2px]
                     text-white/40 hover:text-[#C4A35B] hover:border-[#C4A35B]/45
                     transition-all duration-200
                     disabled:opacity-0 disabled:pointer-events-none
                     font-mono text-lg leading-none"
        >
          ‹
        </button>
        <button
          onClick={() => go(idx + 1)}
          disabled={idx === total - 1}
          aria-label="Next"
          className="hidden sm:flex absolute right-2 top-[38%] -translate-y-1/2 z-10
                     w-8 h-8 items-center justify-center
                     border border-white/12 bg-[#0c0c0e]/75 backdrop-blur-[2px]
                     text-white/40 hover:text-[#C4A35B] hover:border-[#C4A35B]/45
                     transition-all duration-200
                     disabled:opacity-0 disabled:pointer-events-none
                     font-mono text-lg leading-none"
        >
          ›
        </button>

        {/* ── Peek gradient — right edge ── */}
        <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none
                        bg-gradient-to-l from-background/60 to-transparent sm:hidden" />
      </div>

      {/* ── Dot indicators — centered, nostos DNA ── */}
      <div className="flex items-center justify-center gap-[7px] mt-4">
        {products.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Slide ${i + 1}`}
            className="transition-all duration-300 focus:outline-none"
            style={{
              width: i === idx ? 16 : 5,
              height: 5,
              background: i === idx ? '#C4A35B' : 'rgba(255,255,255,0.18)',
            }}
          />
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   SECTION HEADER — reusable, nostos DNA
───────────────────────────────────────────────────────────────*/
const SectionHeader = ({
  label,
  right,
}: {
  label: string;
  right?: React.ReactNode;
}) => (
  <div className="flex items-center gap-3 mb-5">
    <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#C4A35B]">
      {label}
    </span>
    <div className="flex-1 h-px bg-white/5" />
    {right}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   INDEX PAGE
───────────────────────────────────────────────────────────────*/
const Index = () => {
  const [sort, setSort] = useState<'none' | 'priceAsc' | 'priceDesc' | 'yearAsc' | 'yearDesc'>('none');
  const products = useProductStore((s) => s.products);

  /* Last 10 non-hidden, most recent first (products already ordered by created_at DESC from store) */
  const newArrivals = useMemo(
    () => products.filter((p) => !p.hidden).slice(0, 10),
    [products]
  );

  /* All items sorted */
  const allSorted = useMemo(() => {
    const visible = products.filter((p) => !p.hidden);
    if (sort === 'none') return visible;
    return [...visible].sort((a, b) => {
      if (sort === 'priceAsc') return a.price - b.price;
      if (sort === 'priceDesc') return b.price - a.price;
      const ya = a.releaseDate ? new Date(a.releaseDate).getFullYear() : 0;
      const yb = b.releaseDate ? new Date(b.releaseDate).getFullYear() : 0;
      if (sort === 'yearAsc') return ya - yb;
      if (sort === 'yearDesc') return yb - ya;
      return 0;
    });
  }, [products, sort]);

  return (
    <div className="min-h-screen bg-background pb-16">

      {/* ── New Arrivals ── */}
      {newArrivals.length > 0 && (
        <section className="pt-6 mb-12 px-4">
          <SectionHeader
            label="New Arrival"
            right={
              <Link
                to="/all-products"
                className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/28 hover:text-white/55 transition-colors"
              >
                View All →
              </Link>
            }
          />
          <NewArrivalsCarousel products={newArrivals} />
        </section>
      )}

      {/* ── All Items ── */}
      <div className="px-4">
        <SectionHeader
          label="All Items"
          right={
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="bg-transparent border border-white/8 px-2.5 py-1 font-mono text-[10px] tracking-[0.15em] uppercase text-white/35 focus:outline-none focus:border-[#C4A35B]/50 focus:text-[#C4A35B] transition-colors appearance-none cursor-pointer"
            >
              <option value="none">Featured</option>
              <option value="priceAsc">Price ↑</option>
              <option value="priceDesc">Price ↓</option>
              <option value="yearDesc">Year · New</option>
              <option value="yearAsc">Year · Old</option>
            </select>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {allSorted.map((product, i) => (
            <ProductCard key={product.id} product={product} priority={i < 6} />
          ))}
        </div>

        {allSorted.length === 0 && (
          <p className="text-center font-mono text-[10px] tracking-[0.25em] uppercase text-white/20 mt-16">
            No items found
          </p>
        )}
      </div>
    </div>
  );
};

export default Index;

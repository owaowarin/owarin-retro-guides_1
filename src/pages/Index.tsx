import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '@/components/ProductCard';
import { useProductStore } from '@/stores/useProductStore';

/* ── Nostos-style carousel with dot indicator ── */
const NewArrivalsCarousel = ({ products }: { products: ReturnType<typeof useProductStore.getState>['products'] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  /* Sync dot with scroll position */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const cardWidth = el.firstElementChild?.clientWidth ?? 160;
      const gap = 12;
      const idx = Math.round(el.scrollLeft / (cardWidth + gap));
      setActiveIdx(Math.min(idx, products.length - 1));
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [products.length]);

  const scrollTo = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.clientWidth ?? 160;
    const gap = 12;
    el.scrollTo({ left: idx * (cardWidth + gap), behavior: 'smooth' });
    setActiveIdx(idx);
  };

  const prev = () => scrollTo(Math.max(0, activeIdx - 1));
  const next = () => scrollTo(Math.min(products.length - 1, activeIdx + 1));

  return (
    <div>
      {/* Cards */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide"
      >
        {products.map((product) => (
          <div key={product.id}
            className="w-[44vw] max-w-[165px] sm:max-w-[190px] flex-shrink-0 snap-start">
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* Controls: arrows + dots */}
      <div className="flex items-center justify-between mt-4 px-0.5">
        {/* Prev/Next arrows */}
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            disabled={activeIdx === 0}
            className="w-6 h-6 flex items-center justify-center border border-white/10 text-white/30 hover:border-[#C4A35B]/50 hover:text-[#C4A35B] transition-colors disabled:opacity-20 font-mono text-[11px]"
          >
            ‹
          </button>
          <button
            onClick={next}
            disabled={activeIdx === products.length - 1}
            className="w-6 h-6 flex items-center justify-center border border-white/10 text-white/30 hover:border-[#C4A35B]/50 hover:text-[#C4A35B] transition-colors disabled:opacity-20 font-mono text-[11px]"
          >
            ›
          </button>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {products.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`transition-all duration-200 ${
                i === activeIdx
                  ? 'w-3.5 h-1.5 bg-[#C4A35B]'
                  : 'w-1.5 h-1.5 bg-white/18 hover:bg-white/35'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Main Index page ── */
const Index = () => {
  const [sort, setSort] = useState<'none' | 'priceAsc' | 'priceDesc' | 'yearAsc' | 'yearDesc'>('none');
  const products = useProductStore((s) => s.products);

  const newArrivals = useMemo(
    () => products.filter((p) => !p.hidden).slice(-10).reverse(),
    [products]
  );

  const allSorted = useMemo(() => {
    const visible = products.filter((p) => !p.hidden);
    const sorted = [...visible];
    sorted.sort((a, b) => {
      if (sort === 'priceAsc') return a.price - b.price;
      if (sort === 'priceDesc') return b.price - a.price;
      const yearA = a.releaseDate ? new Date(a.releaseDate).getFullYear() : 0;
      const yearB = b.releaseDate ? new Date(b.releaseDate).getFullYear() : 0;
      if (sort === 'yearAsc') return yearA - yearB;
      if (sort === 'yearDesc') return yearB - yearA;
      return 0;
    });
    return sorted;
  }, [products, sort]);

  return (
    <div className="min-h-screen bg-background pb-16">

      {/* ── New Arrivals ── */}
      {newArrivals.length > 0 && (
        <section className="pt-6 mb-12 px-4">
          <div className="flex items-center gap-3 mb-5">
            <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#C4A35B]">
              New Arrival
            </span>
            <div className="flex-1 h-px bg-white/5" />
            <Link
              to="/all-products"
              className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/28 hover:text-white/55 transition-colors"
            >
              View All →
            </Link>
          </div>
          <NewArrivalsCarousel products={newArrivals} />
        </section>
      )}

      {/* ── All Items ── */}
      <div className="px-4">
        <div className="flex items-center gap-3 mb-5">
          <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#C4A35B]">
            All Items
          </span>
          <div className="flex-1 h-px bg-white/5" />
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
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {allSorted.map((product) => (
            <ProductCard key={product.id} product={product} />
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

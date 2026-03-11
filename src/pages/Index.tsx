import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductCard from '@/components/ProductCard';
import { useProductStore } from '@/stores/useProductStore';
import { useAppStore } from '@/stores/useAppStore';
import { GlobalSearch, GlobalSearchSuggestion } from '@/components/GlobalSearch';

const Index = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'none' | 'priceAsc' | 'priceDesc' | 'yearAsc' | 'yearDesc'>('none');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const products = useProductStore((s) => s.products);
  const { heroName, storeTagline, storeSubtext, logoUrl, logoSize, heroFontSize, taglineFontSize, subtextFontSize } = useAppStore();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const f = products.filter((p) => {
      if (p.hidden) return false;
      const releaseYear = p.releaseDate ? new Date(p.releaseDate).getFullYear().toString() : '';
      return !query || p.title.toLowerCase().includes(query) || p.publisher.toLowerCase().includes(query) || releaseYear === query;
    });
    const sorted = [...f];
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
  }, [products, search, sort]);

  const newArrivals = useMemo(() => products.filter((p) => !p.hidden).slice(-10).reverse(), [products]);

  const suggestions: GlobalSearchSuggestion[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.title.toLowerCase().includes(q) || p.publisher.toLowerCase().includes(q))
      .slice(0, 8)
      .map((p) => ({ id: p.id, label: p.title, subtitle: `${p.platform} · ${p.publisher}` }));
  }, [products, search]);

  return (
    <div className="min-h-screen bg-background">

      {/* ── Search bar ── */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b border-white/5 px-4 py-2">
        <GlobalSearch
          value={search}
          onChange={setSearch}
          suggestions={suggestions}
          onSelectSuggestion={(s) => setSearch(s.label)}
          onSearch={(q) => setSearch(q)}
          placeholder="Search by title, publisher, or year..."
        />
      </div>

      <main className="pt-[6rem] pb-16">

        {/* ── Hero ── */}
        <section className="flex flex-col items-center justify-center border-b border-white/5 mb-8 py-8 md:py-12 px-4">
          {logoUrl && (
            <div style={{ marginBottom: heroName ? Math.round((heroFontSize ?? 36) * 0.4) : Math.round((taglineFontSize ?? 12) * 1.2) }}>
              <img
                src={logoUrl}
                alt="logo"
                style={{
                  width: `clamp(48px, ${Math.round(logoSize * 0.55)}px, ${logoSize}px)`,
                  height: `clamp(48px, ${Math.round(logoSize * 0.55)}px, ${logoSize}px)`,
                }}
                className="object-contain"
              />
            </div>
          )}
          {heroName && (
            <h1
              className="font-display tracking-[0.2em] text-primary text-center leading-tight"
              style={{
                fontSize: `clamp(${Math.round((heroFontSize ?? 36) * 0.45)}px, ${((heroFontSize ?? 36) / 700 * 100).toFixed(1)}vw, ${heroFontSize ?? 36}px)`,
                marginBottom: Math.round((heroFontSize ?? 36) * 0.3),
              }}
            >{heroName}</h1>
          )}
          {storeTagline && (
            <p
              className="text-white/30 tracking-[0.22em] uppercase font-mono"
              style={{
                fontSize: `clamp(${Math.round((taglineFontSize ?? 12) * 0.75)}px, ${((taglineFontSize ?? 12) / 360 * 100).toFixed(1)}vw, ${taglineFontSize ?? 12}px)`,
                marginBottom: storeSubtext ? Math.round((taglineFontSize ?? 12) * 1.5) : 0,
              }}
            >{storeTagline}</p>
          )}
          {storeSubtext && !isMobile && (
            <p className="text-white/20 max-w-sm text-center font-light" style={{ fontSize: subtextFontSize ?? 11 }}>
              {storeSubtext}
            </p>
          )}
        </section>

        {/* ── New Arrivals ── */}
        {newArrivals.length > 0 && (
          <section className="mb-10 px-4">
            <div className="flex items-center gap-3 mb-5">
              <span className="font-mono text-[9px] tracking-[0.28em] uppercase text-[#C4A35B]">New Arrival</span>
              <div className="flex-1 h-px bg-white/5" />
              <Link
                to="/all-products"
                className="font-mono text-[8px] tracking-[0.2em] uppercase text-white/25 hover:text-white/55 transition-colors"
              >
                View All →
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x scrollbar-hide">
              {newArrivals.map((product) => (
                <div key={product.id} className="w-[42vw] max-w-[155px] flex-shrink-0 snap-start">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── All Items ── */}
        <div className="px-4">
          <div className="flex items-center gap-3 mb-5">
            <span className="font-mono text-[9px] tracking-[0.28em] uppercase text-[#C4A35B]">All Items</span>
            <div className="flex-1 h-px bg-white/5" />
            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="bg-transparent border border-white/8 px-2.5 py-1 font-mono text-[9px] tracking-[0.15em] uppercase text-white/35 focus:outline-none focus:border-[#C4A35B]/50 focus:text-[#C4A35B] transition-colors appearance-none cursor-pointer"
            >
              <option value="none">Featured</option>
              <option value="priceAsc">Price ↑</option>
              <option value="priceDesc">Price ↓</option>
              <option value="yearDesc">Year · New</option>
              <option value="yearAsc">Year · Old</option>
            </select>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-center font-mono text-[9px] tracking-[0.25em] uppercase text-white/20 mt-16">
              No items found
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;

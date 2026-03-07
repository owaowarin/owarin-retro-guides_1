import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductCard from '@/components/ProductCard';
import { useProductStore } from '@/stores/useProductStore';
import { useAppStore } from '@/stores/useAppStore';
import { GlobalSearch, GlobalSearchSuggestion } from '@/components/GlobalSearch';

const Index = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'none' | 'priceAsc' | 'priceDesc' | 'yearAsc' | 'yearDesc'>('none');
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
      <div className="fixed top-14 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2">
        <GlobalSearch
          value={search}
          onChange={setSearch}
          suggestions={suggestions}
          onSelectSuggestion={(s) => navigate(`/all-products?search=${encodeURIComponent(s.label)}`)}
          onSearch={(q) => navigate(`/all-products?search=${encodeURIComponent(q)}`)}
          placeholder="Search by title, publisher, or year..."
        />
      </div>

      <main className="pt-[6rem] px-4 pb-12">
        {/* Hero */}
        <section className="flex flex-col items-center justify-center border-b border-border mb-5 py-6 md:py-8">
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
          {heroName ? (
            <h1
              className="font-display tracking-[0.2em] text-primary text-center leading-tight"
              style={{
                fontSize: `clamp(${Math.round((heroFontSize ?? 36) * 0.5)}px, ${((heroFontSize ?? 36) / 360 * 100).toFixed(1)}vw, ${heroFontSize ?? 36}px)`,
                marginBottom: Math.round((heroFontSize ?? 36) * 0.3),
              }}
            >{heroName}</h1>
          ) : null}
          {storeTagline ? (
            <p
              className="text-muted-foreground tracking-[0.15em] uppercase"
              style={{
                fontSize: `clamp(${Math.round((taglineFontSize ?? 12) * 0.75)}px, ${((taglineFontSize ?? 12) / 360 * 100).toFixed(1)}vw, ${taglineFontSize ?? 12}px)`,
                marginBottom: storeSubtext ? Math.round((taglineFontSize ?? 12) * 1.5) : 0,
              }}
            >{storeTagline}</p>
          ) : null}
          {storeSubtext ? (
            <p
              className="hidden md:block text-muted-foreground max-w-sm text-center"
              style={{ fontSize: subtextFontSize ?? 11 }}
            >{storeSubtext}</p>
          ) : null}
        </section>

        {/* New Arrivals */}
        {newArrivals.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase mb-4">NEW ARRIVAL</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x scrollbar-hide">
              {newArrivals.map((product) => (
                <div key={product.id} className="w-[44vw] max-w-[160px] flex-shrink-0 snap-start">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sort & All Items */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">ALL ITEMS</h2>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="bg-secondary border border-border rounded px-3 py-1.5 text-xs text-muted-foreground focus:outline-none focus:border-primary"
          >
            <option value="none">Sort: Featured</option>
            <option value="priceAsc">Price · Low to High</option>
            <option value="priceDesc">Price · High to Low</option>
            <option value="yearDesc">Release Year · Newest</option>
            <option value="yearAsc">Release Year · Oldest</option>
          </select>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground mt-12 text-sm">No items found.</p>
        )}
      </main>
    </div>
  );
};

export default Index;

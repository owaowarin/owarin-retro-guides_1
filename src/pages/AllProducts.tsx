import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { useProductStore } from '@/stores/useProductStore';
import { GlobalSearch, GlobalSearchSuggestion } from '@/components/GlobalSearch';
const ITEMS_PER_PAGE = 50;

type SortOption = 'newArrivals' | 'priceAsc' | 'priceDesc';
type AvailFilter = '' | 'available' | 'soldout';



const AllProducts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [sort, setSort] = useState<SortOption>('newArrivals');
  const [avail, setAvail] = useState<AvailFilter>('');
  const [scrolled, setScrolled] = useState(false);

  // Sync search when URL param changes (e.g. navigating from Index)
  useEffect(() => {
    const q = searchParams.get('search') ?? '';
    setSearch(q);
  }, [searchParams.get('search')]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sort: true, platform: false, publisher: false, genre: false,
  });
  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const products = useProductStore((s) => s.products);

  const selectedPlatform = searchParams.get('platform') || '';
  const selectedGenre = searchParams.get('genre') || '';
  const selectedPublisher = searchParams.get('publisher') || '';

  /* ── Live inventory: only platforms/publishers with stock > 0 ── */
  const livePlatforms = useMemo(() => {
    const set = new Set(
      products
        .filter((p) => p.statusTag !== 'soldOut' && !p.hidden)
        .flatMap((p) => p.platform.split(/[,/]\s*/).map((s) => s.trim()))
    );
    return Array.from(set).filter(Boolean).sort();
  }, [products]);

  const livePublishers = useMemo(() => {
    const set = new Set(
      products
        .filter((p) => p.statusTag !== 'soldOut' && !p.hidden)
        .flatMap((p) => p.publisher.split(/[,/]\s*/).map((s) => s.trim()))
    );
    return Array.from(set).filter(Boolean).sort();
  }, [products]);

  const liveGenres = useMemo(() => {
    const set = new Set(
      products
        .filter((p) => p.statusTag !== 'soldOut' && !p.hidden)
        .flatMap((p) => p.genre.split(/[,/]\s*/).map((s) => s.trim()))
    );
    return Array.from(set).filter(Boolean).sort();
  }, [products]);

  /* ── Filtered & sorted products ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let f = products.filter((p) => {
      if (p.hidden) return false;
      if (q) {
        const year = p.releaseDate ? new Date(p.releaseDate).getFullYear().toString() : '';
        if (
          !p.title.toLowerCase().includes(q) &&
          !p.publisher.toLowerCase().includes(q) &&
          !p.platform.toLowerCase().includes(q) &&
          !p.genre.toLowerCase().includes(q) &&
          year !== q
        ) return false;
      }
      if (selectedPlatform && !p.platform.split(/[,/]\s*/).map((s) => s.trim()).includes(selectedPlatform)) return false;
      if (selectedGenre && !p.genre.split(/[,/]\s*/).map((s) => s.trim()).includes(selectedGenre)) return false;
      if (selectedPublisher && !p.publisher.split(/[,/]\s*/).map((s) => s.trim()).includes(selectedPublisher)) return false;
      if (avail === 'available' && (p.statusTag === 'soldOut')) return false;
      if (avail === 'soldout' && p.statusTag !== 'soldOut' && p.statusTag !== 'soldOut') return false;
      return true;
    });

    const sorted = [...f];
    if (sort === 'priceAsc') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'priceDesc') sorted.sort((a, b) => b.price - a.price);
    else sorted.reverse(); // newArrivals = last added first
    return sorted;
  }, [products, search, selectedPlatform, selectedGenre, selectedPublisher, avail, sort]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  /* ── Reset page on filter change ── */
  useEffect(() => { setPage(1); }, [search, selectedPlatform, selectedGenre, selectedPublisher, avail, sort]);

  /* ── Close drawer on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false);
      }
    };
    if (drawerOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [drawerOpen]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const clearAll = () => {
    setSearchParams({});
    setSort('newArrivals');
    setAvail('');
    setSearch('');
  };

  const hasFilters = selectedPlatform || selectedGenre || selectedPublisher || avail || search;

  const suggestions: GlobalSearchSuggestion[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.title.toLowerCase().includes(q) || p.publisher.toLowerCase().includes(q))
      .slice(0, 8)
      .map((p) => ({ id: p.id, label: p.title, subtitle: `${p.platform} · ${p.genre}` }));
  }, [products, search]);

  /* ── Pagination page numbers ── */
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const nums: (number | '...')[] = [1];
    if (page > 3) nums.push('...');
    for (let n = Math.max(2, page - 1); n <= Math.min(totalPages - 1, page + 1); n++) nums.push(n);
    if (page < totalPages - 2) nums.push('...');
    nums.push(totalPages);
    return nums;
  }, [page, totalPages]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Search Bar ── */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2">
        <GlobalSearch
          value={search}
          onChange={setSearch}
          suggestions={suggestions}
          onSelectSuggestion={(s) => setSearch(s.label)}
          onSearch={(q) => setSearch(q)}
          placeholder="Search by title, platform, genre, publisher..."
        />
      </div>

      {/* ── Sticky Control Bar — 100% transparent container, bg on children only ── */}
      <div className="fixed top-[6.5rem] left-0 right-0 z-30 px-4 py-2 pointer-events-none" style={{ background: 'transparent', boxShadow: 'none', border: 'none' }}>
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-2">

          {/* "6 RESULTS" — own frosted pill */}
          <p className={`pointer-events-auto font-mono text-[9px] tracking-[0.2em] uppercase px-3 py-1.5 transition-all duration-300 ${
            scrolled
              ? 'bg-background/55 backdrop-blur-md text-muted-foreground/70'
              : 'bg-background/80 backdrop-blur-sm text-muted-foreground'
          }`}>
            {filtered.length} <span className="uppercase">results</span>
          </p>

          {/* Right cluster */}
          <div className="flex items-center gap-2 pointer-events-auto">

            {/* IN STOCK / SOLD OUT — own frosted pill */}
            <div className={`inline-flex border border-white/8 text-[11px] transition-all duration-300 ${
              scrolled ? 'bg-background/55 backdrop-blur-md' : 'bg-background/80 backdrop-blur-sm'
            }`}>
              <button
                onClick={() => setAvail(avail === 'available' ? '' : 'available')}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 font-mono text-[9px] tracking-[0.18em] transition-colors ${
                  avail === 'available' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                IN STOCK
              </button>
              <button
                onClick={() => setAvail(avail === 'soldout' ? '' : 'soldout')}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 font-mono text-[9px] tracking-[0.18em] transition-colors ${
                  avail === 'soldout' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                SOLD OUT
              </button>
            </div>

            {/* FILTER — own frosted pill */}
            <button
              onClick={() => setDrawerOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 border font-mono text-[9px] tracking-[0.18em] transition-all duration-300 ${
                selectedPlatform || selectedPublisher ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-primary hover:border-primary'
              } ${scrolled ? 'bg-background/55 backdrop-blur-md' : 'bg-background/80 backdrop-blur-sm'}`}
            >
              <SlidersHorizontal size={12} />
              <span className="hidden sm:inline">FILTER</span>
              {(selectedPlatform || selectedPublisher) && (
                <span className="w-4 h-4 bg-[#C4A35B] text-[#0c0c0e] text-[9px] flex items-center justify-center font-mono font-bold">
                  {[selectedPlatform, selectedPublisher].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
      <main className="pt-[10.5rem] px-4 pb-20 max-w-screen-2xl mx-auto">

        {/* ── Active filter tags ── */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {selectedPlatform && (
              <span className="font-mono inline-flex items-center gap-1.5 border border-[#C4A35B]/40 text-[#C4A35B] text-[9px] tracking-[0.12em] uppercase px-2.5 py-1">
                {selectedPlatform}
                <button onClick={() => setFilter('platform', '')}><X size={10} /></button>
              </span>
            )}
            {selectedGenre && (
              <span className="font-mono inline-flex items-center gap-1.5 border border-[#C4A35B]/40 text-[#C4A35B] text-[9px] tracking-[0.12em] uppercase px-2.5 py-1">
                {selectedGenre}
                <button onClick={() => setFilter('genre', '')}><X size={10} /></button>
              </span>
            )}
            {selectedPublisher && (
              <span className="font-mono inline-flex items-center gap-1.5 border border-[#C4A35B]/40 text-[#C4A35B] text-[9px] tracking-[0.12em] uppercase px-2.5 py-1">
                {selectedPublisher}
                <button onClick={() => setFilter('publisher', '')}><X size={10} /></button>
              </span>
            )}
            <button onClick={clearAll} className="text-[11px] text-muted-foreground underline hover:text-primary transition-colors ml-1">
              Clear all
            </button>
          </div>
        )}

        {/* ── Product Grid ── */}
        {paginated.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {paginated.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center mt-24">
            <p className="text-muted-foreground text-sm tracking-wider">NO RESULTS FOUND</p>
            {hasFilters && (
              <button onClick={clearAll} className="mt-3 text-xs text-primary underline">
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* ── Premium Japanese Pagination ── */}
        {totalPages > 1 && (
          <nav className="mt-16 flex items-center justify-center gap-0">
            {/* FIRST */}
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-4 py-2 text-[10px] tracking-[0.25em] font-light text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"
            >
              FIRST
            </button>

            {/* ‹ prev */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"
            >
              ‹
            </button>

            {/* Page numbers */}
            {pageNumbers.map((n, i) =>
              n === '...' ? (
                <span key={`e-${i}`} className="px-3 py-2 text-xs text-muted-foreground/40 tracking-widest">
                  ···
                </span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n as number)}
                  className={`relative px-3.5 py-2 text-xs tracking-[0.15em] font-light transition-colors ${
                    page === n
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {n}
                  {/* Active indicator: thin underline dot */}
                  {page === n && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary" />
                  )}
                </button>
              )
            )}

            {/* › next */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"
            >
              ›
            </button>

            {/* LAST */}
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-4 py-2 text-[10px] tracking-[0.25em] font-light text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"
            >
              LAST
            </button>
          </nav>
        )}

        {/* Item count summary */}
        {filtered.length > 0 && (
          <p className="text-center text-[10px] tracking-[0.15em] text-muted-foreground/50 mt-3">
            {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} OF {filtered.length}
          </p>
        )}
      </main>

      {/* ── Filter Drawer (Side Panel) ── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50" onClick={() => setDrawerOpen(false)} />
          <div
            ref={drawerRef}
            className="fixed right-0 top-0 bottom-0 w-72 bg-card border-l border-border z-50 overflow-y-auto flex flex-col"
            style={{ animation: 'slideInRight 0.2s ease' }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="text-[11px] tracking-[0.25em] text-muted-foreground uppercase">Filters</span>
              <button onClick={() => setDrawerOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">

              {/* SORT — collapsible */}
              <div className="border-b border-border">
                <button
                  onClick={() => toggleSection('sort')}
                  className="w-full flex items-center justify-between px-5 py-4 text-[10px] tracking-[0.25em] text-[#D4AF37] uppercase hover:text-primary transition-colors"
                >
                  SORT
                  <ChevronDown size={14} className={`transition-transform duration-200 ${expandedSections.sort ? 'rotate-180' : ''}`} />
                </button>
                {expandedSections.sort && (
                  <div className="px-5 pb-4 space-y-0.5">
                    {([
                      ['newArrivals', 'NEW ARRIVAL'],
                      ['priceAsc', 'PRICE: LOW TO HIGH'],
                      ['priceDesc', 'PRICE: HIGH TO LOW'],
                    ] as [SortOption, string][]).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setSort(val)}
                        className={`w-full text-left px-2 py-2 text-[11px] tracking-[0.15em] transition-colors ${
                          sort === val ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {sort === val && <span className="mr-2 text-primary">·</span>}
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* PLATFORM — collapsible */}
              {livePlatforms.length > 0 && (
                <div className="border-b border-border">
                  <button
                    onClick={() => toggleSection('platform')}
                    className="w-full flex items-center justify-between px-5 py-4 text-[10px] tracking-[0.25em] text-[#D4AF37] uppercase hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      PLATFORM
                      {selectedPlatform && <span className="w-1.5 h-1.5 bg-[#C4A35B] inline-block" />}
                    </span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${expandedSections.platform ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedSections.platform && (
                    <div className="px-5 pb-4 space-y-0.5">
                      {livePlatforms.map((p) => (
                        <button
                          key={p}
                          onClick={() => setFilter('platform', selectedPlatform === p ? '' : p)}
                          className={`w-full text-left px-2 py-2 text-[11px] tracking-[0.15em] transition-colors ${
                            selectedPlatform === p ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {selectedPlatform === p && <span className="mr-2 text-primary">·</span>}
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PUBLISHER — collapsible */}
              {livePublishers.length > 0 && (
                <div className="border-b border-border">
                  <button
                    onClick={() => toggleSection('publisher')}
                    className="w-full flex items-center justify-between px-5 py-4 text-[10px] tracking-[0.25em] text-[#D4AF37] uppercase hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      PUBLISHER
                      {selectedPublisher && <span className="w-1.5 h-1.5 bg-[#C4A35B] inline-block" />}
                    </span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${expandedSections.publisher ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedSections.publisher && (
                    <div className="px-5 pb-4 space-y-0.5">
                      {livePublishers.map((pub) => (
                        <button
                          key={pub}
                          onClick={() => setFilter('publisher', selectedPublisher === pub ? '' : pub)}
                          className={`w-full text-left px-2 py-2 text-[11px] tracking-[0.15em] transition-colors ${
                            selectedPublisher === pub ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {selectedPublisher === pub && <span className="mr-2 text-primary">·</span>}
                          {pub}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* GENRE — collapsible */}
              {liveGenres.length > 0 && (
                <div className="border-b border-border">
                  <button
                    onClick={() => toggleSection('genre')}
                    className="w-full flex items-center justify-between px-5 py-4 text-[10px] tracking-[0.25em] text-[#D4AF37] uppercase hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      GENRE
                      {selectedGenre && <span className="w-1.5 h-1.5 bg-[#C4A35B] inline-block" />}
                    </span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${expandedSections.genre ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedSections.genre && (
                    <div className="px-5 pb-4 space-y-0.5">
                      {liveGenres.map((g) => (
                        <button
                          key={g}
                          onClick={() => setFilter('genre', selectedGenre === g ? '' : g)}
                          className={`w-full text-left px-2 py-2 text-[11px] tracking-[0.15em] transition-colors ${
                            selectedGenre === g ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {selectedGenre === g && <span className="mr-2 text-primary">·</span>}
                          {g}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Clear all */}
            <div className="px-5 py-4 border-t border-border">
              <button
                onClick={() => { clearAll(); setDrawerOpen(false); }}
                className="w-full text-[11px] tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors text-center uppercase"
              >
                Clear all
              </button>
            </div>
          </div>
        </>
      )}

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default AllProducts;

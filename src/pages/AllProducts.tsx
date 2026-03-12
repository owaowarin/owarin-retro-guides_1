import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { useProductStore } from '@/stores/useProductStore';
import { GlobalSearch, GlobalSearchSuggestion } from '@/components/GlobalSearch';
import { scoreMatch, sortByRelevance } from '@/lib/searchUtils';

const ITEMS_PER_PAGE = 50;
type SortOption = 'newArrivals' | 'priceAsc' | 'priceDesc';

const AllProducts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [sort, setSort] = useState<SortOption>('newArrivals');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sort: true, publisher: false, genre: false,
  });
  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    const q = searchParams.get('search') ?? '';
    setSearch(q);
  }, [searchParams]);

  const products = useProductStore((s) => s.products);

  const selectedPlatform = searchParams.get('platform') || '';
  const selectedGenre = searchParams.get('genre') || '';
  const selectedPublisher = searchParams.get('publisher') || '';

  const livePublishers = useMemo(() => {
    const set = new Set(
      products
        .filter((p) => !p.hidden)
        .flatMap((p) => p.publisher.split(/[,/]\s*/).map((s) => s.trim()))
    );
    return Array.from(set).filter(Boolean).sort();
  }, [products]);

  const liveGenres = useMemo(() => {
    const set = new Set(
      products
        .filter((p) => !p.hidden)
        .flatMap((p) => p.genre.split(/[,/]\s*/).map((s) => s.trim()))
    );
    return Array.from(set).filter(Boolean).sort();
  }, [products]);

  /* ── Step 1: Filter by platform/genre/publisher (memo separately for perf) ── */
  const baseFiltered = useMemo(() => {
    return products.filter((p) => {
      if (p.hidden) return false;
      if (selectedPlatform && !p.platform.split(/[,/]\s*/).map((s) => s.trim()).includes(selectedPlatform)) return false;
      if (selectedGenre && !p.genre.split(/[,/]\s*/).map((s) => s.trim()).includes(selectedGenre)) return false;
      if (selectedPublisher && !p.publisher.split(/[,/]\s*/).map((s) => s.trim()).includes(selectedPublisher)) return false;
      return true;
    });
  }, [products, selectedPlatform, selectedGenre, selectedPublisher]);

  /* ── Step 2: Apply search + sort ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    // Apply search filter
    const searched = q
      ? baseFiltered.filter((p) => {
          const year = p.releaseDate ? new Date(p.releaseDate).getFullYear().toString() : '';
          return (
            p.title.toLowerCase().includes(q) ||
            p.publisher.toLowerCase().includes(q) ||
            p.platform.toLowerCase().includes(q) ||
            p.genre.toLowerCase().includes(q) ||
            year === q
          );
        })
      : baseFiltered;

    // When query exists → sort by relevance (title match quality)
    if (q) {
      return [...searched].sort((a, b) => {
        const sa = scoreMatch(a.title, q);
        const sb = scoreMatch(b.title, q);
        if (sb !== sa) return sb - sa;          // higher score first
        return a.title.localeCompare(b.title);   // A→Z within same score
      });
    }

    // No query → sort by user-selected option
    const sorted = [...searched];
    if (sort === 'priceAsc') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'priceDesc') sorted.sort((a, b) => b.price - a.price);
    else sorted.reverse(); // newArrivals
    return sorted;
  }, [baseFiltered, search, sort]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, selectedPlatform, selectedGenre, selectedPublisher, sort]);

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
    setSearch('');
  };

  const hasFilters = selectedPlatform || selectedGenre || selectedPublisher || search;

  const suggestions: GlobalSearchSuggestion[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const scored = products
      .filter((p) => !p.hidden)
      .map((p) => ({
        id: p.id,
        label: p.title,
        subtitle: `${p.platform} · ${p.genre}`,
        score: scoreMatch(p.title, q),
      }))
      .filter((p) => p.score > 0);
    return sortByRelevance(scored).slice(0, 8);
  }, [products, search]);

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

      {/* Search Bar — fixed top-[84px] (below 2-row header) */}
      <div className="fixed top-[84px] left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2">
        <GlobalSearch
          value={search}
          onChange={setSearch}
          suggestions={suggestions}
          onSelectSuggestion={(s) => setSearch(s.label)}
          onSearch={(q) => setSearch(q)}
          placeholder="Search by title, platform, genre, publisher..."
        />
      </div>

      {/* Control Bar — fixed top-[124px] */}
      <div className="fixed top-[124px] left-0 right-0 z-30 px-4 py-2.5 pointer-events-none"
        style={{ background: 'transparent', boxShadow: 'none', border: 'none' }}>
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-2">

          <p className="pointer-events-auto font-mono text-[10px] tracking-[0.22em] uppercase text-white/38">
            {filtered.length} <span>results</span>
          </p>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setDrawerOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border font-mono text-[10px] tracking-[0.2em] uppercase transition-colors ${
                selectedGenre || selectedPublisher
                  ? 'border-[#C4A35B]/60 text-[#C4A35B]'
                  : 'border-white/10 text-white/38 hover:text-white/65 hover:border-white/22'
              }`}
            >
              <SlidersHorizontal size={11} />
              <span>FILTER</span>
              {(selectedGenre || selectedPublisher) && (
                <span className="w-3.5 h-3.5 bg-[#C4A35B] text-[#0c0c0e] text-[8px] flex items-center justify-center font-bold">
                  {[selectedGenre, selectedPublisher].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main — pt-[88px] = search bar (40px) + control bar (44px) + 4px buffer, on top of App's pt-[84px] */}
      <main className="pt-[88px] px-4 pb-20 max-w-screen-2xl mx-auto">

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {selectedPlatform && (
              <span className="font-mono inline-flex items-center gap-1.5 border border-[#C4A35B]/40 text-[#C4A35B] text-[10px] tracking-[0.12em] uppercase px-2.5 py-1">
                {selectedPlatform}
                <button onClick={() => setFilter('platform', '')}><X size={10} /></button>
              </span>
            )}
            {selectedGenre && (
              <span className="font-mono inline-flex items-center gap-1.5 border border-[#C4A35B]/40 text-[#C4A35B] text-[10px] tracking-[0.12em] uppercase px-2.5 py-1">
                {selectedGenre}
                <button onClick={() => setFilter('genre', '')}><X size={10} /></button>
              </span>
            )}
            {selectedPublisher && (
              <span className="font-mono inline-flex items-center gap-1.5 border border-[#C4A35B]/40 text-[#C4A35B] text-[10px] tracking-[0.12em] uppercase px-2.5 py-1">
                {selectedPublisher}
                <button onClick={() => setFilter('publisher', '')}><X size={10} /></button>
              </span>
            )}
            <button onClick={clearAll}
              className="font-mono text-[10px] tracking-[0.12em] uppercase text-white/28 hover:text-[#C4A35B] transition-colors ml-1">
              Clear all
            </button>
          </div>
        )}

        {/* Product Grid */}
        {paginated.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {paginated.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < 6} />
            ))}
          </div>
        ) : (
          <div className="text-center mt-24">
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/20">
              No results found
            </p>
            {hasFilters && (
              <button onClick={clearAll}
                className="mt-3 font-mono text-[10px] tracking-[0.15em] uppercase text-[#C4A35B]/60 hover:text-[#C4A35B] transition-colors">
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="mt-16 flex items-center justify-center gap-0">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-4 py-2 font-mono text-[10px] tracking-[0.25em] text-white/30 hover:text-primary disabled:opacity-20 transition-colors">
              FIRST
            </button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-2 text-sm text-white/30 hover:text-primary disabled:opacity-20 transition-colors">
              ‹
            </button>
            {pageNumbers.map((n, i) =>
              n === '...' ? (
                <span key={`e-${i}`} className="px-3 py-2 text-xs text-white/20 tracking-widest">···</span>
              ) : (
                <button key={n} onClick={() => setPage(n as number)}
                  className={`relative px-3.5 py-2 font-mono text-[11px] tracking-[0.15em] transition-colors ${
                    page === n ? 'text-primary' : 'text-white/30 hover:text-white/70'
                  }`}>
                  {n}
                  {page === n && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary" />
                  )}
                </button>
              )
            )}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-2 text-sm text-white/30 hover:text-primary disabled:opacity-20 transition-colors">
              ›
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-4 py-2 font-mono text-[10px] tracking-[0.25em] text-white/30 hover:text-primary disabled:opacity-20 transition-colors">
              LAST
            </button>
          </nav>
        )}

        {filtered.length > 0 && (
          <p className="text-center font-mono text-[10px] tracking-[0.15em] text-white/25 mt-3">
            {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} OF {filtered.length}
          </p>
        )}
      </main>

      {/* Filter Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50" onClick={() => setDrawerOpen(false)} />
          <div ref={drawerRef}
            className="fixed right-0 top-0 bottom-0 w-72 bg-card border-l border-border z-50 overflow-y-auto flex flex-col"
            style={{ animation: 'slideInRight 0.2s ease' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="font-mono text-[10px] tracking-[0.28em] text-white/40 uppercase">Filters</span>
              <button onClick={() => setDrawerOpen(false)} className="text-white/35 hover:text-white/70 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">

              {/* SORT */}
              <div className="border-b border-border">
                <button onClick={() => toggleSection('sort')}
                  className="w-full flex items-center justify-between px-5 py-4 font-mono text-[10px] tracking-[0.28em] text-[#D4AF37] uppercase hover:text-primary transition-colors">
                  SORT
                  <ChevronDown size={14} className={`transition-transform duration-200 ${expandedSections.sort ? 'rotate-180' : ''}`} />
                </button>
                {expandedSections.sort && (
                  <div className="px-5 pb-4 space-y-0.5">
                    {([
                      ['newArrivals', 'NEW ARRIVAL'],
                      ['priceAsc', 'PRICE: LOW → HIGH'],
                      ['priceDesc', 'PRICE: HIGH → LOW'],
                    ] as [SortOption, string][]).map(([val, label]) => (
                      <button key={val} onClick={() => setSort(val)}
                        className={`w-full text-left px-2 py-2 font-mono text-[10px] tracking-[0.15em] transition-colors ${
                          sort === val ? 'text-primary' : 'text-white/35 hover:text-white/70'
                        }`}>
                        {sort === val && <span className="mr-2 text-primary">·</span>}
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* GENRE */}
              {liveGenres.length > 0 && (
                <div className="border-b border-border">
                  <button onClick={() => toggleSection('genre')}
                    className="w-full flex items-center justify-between px-5 py-4 font-mono text-[10px] tracking-[0.28em] text-[#D4AF37] uppercase hover:text-primary transition-colors">
                    <span className="flex items-center gap-2">
                      GENRE
                      {selectedGenre && <span className="w-1.5 h-1.5 bg-[#C4A35B] inline-block" />}
                    </span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${expandedSections.genre ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedSections.genre && (
                    <div className="px-5 pb-4 space-y-0.5">
                      {liveGenres.map((g) => (
                        <button key={g}
                          onClick={() => setFilter('genre', selectedGenre === g ? '' : g)}
                          className={`w-full text-left px-2 py-2 font-mono text-[10px] tracking-[0.15em] transition-colors ${
                            selectedGenre === g ? 'text-primary' : 'text-white/35 hover:text-white/70'
                          }`}>
                          {selectedGenre === g && <span className="mr-2 text-primary">·</span>}
                          {g}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PUBLISHER */}
              {livePublishers.length > 0 && (
                <div className="border-b border-border">
                  <button onClick={() => toggleSection('publisher')}
                    className="w-full flex items-center justify-between px-5 py-4 font-mono text-[10px] tracking-[0.28em] text-[#D4AF37] uppercase hover:text-primary transition-colors">
                    <span className="flex items-center gap-2">
                      PUBLISHER
                      {selectedPublisher && <span className="w-1.5 h-1.5 bg-[#C4A35B] inline-block" />}
                    </span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${expandedSections.publisher ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedSections.publisher && (
                    <div className="px-5 pb-4 space-y-0.5">
                      {livePublishers.map((pub) => (
                        <button key={pub}
                          onClick={() => setFilter('publisher', selectedPublisher === pub ? '' : pub)}
                          className={`w-full text-left px-2 py-2 font-mono text-[10px] tracking-[0.15em] transition-colors ${
                            selectedPublisher === pub ? 'text-primary' : 'text-white/35 hover:text-white/70'
                          }`}>
                          {selectedPublisher === pub && <span className="mr-2 text-primary">·</span>}
                          {pub}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border">
              <button
                onClick={() => { clearAll(); setDrawerOpen(false); }}
                className="w-full font-mono text-[10px] tracking-[0.22em] text-white/28 hover:text-[#C4A35B] transition-colors text-center uppercase">
                Clear all
              </button>
            </div>
          </div>
        </>
      )}

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

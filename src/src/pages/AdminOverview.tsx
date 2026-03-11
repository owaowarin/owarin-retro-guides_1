import { useMemo, useState, useEffect } from 'react';
import { useProductStore, Product } from '@/stores/useProductStore';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/lib/supabase';
import { TrendingUp, Package, ChevronRight, X, Calendar } from 'lucide-react';

// ─── Section Label — gold + divider (nostos DNA) ───────────────────────────
const SectionLabel = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3">
    <span className="font-mono text-[9px] tracking-[0.28em] uppercase text-[#C4A35B]">{label}</span>
    <div className="flex-1 h-px bg-white/5" />
  </div>
);

// ─── Stat Card — label above / value below (d-department DNA) ─────────────
const StatCard = ({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
}) => (
  <div className="bg-card border border-border p-4 flex items-start gap-3">
    <div className="w-7 h-7 border border-primary/20 flex items-center justify-center flex-shrink-0">
      <Icon size={13} className="text-primary" />
    </div>
    <div className="min-w-0">
      <p className="font-mono text-[9px] tracking-[0.25em] text-white/30 uppercase mb-1">{label}</p>
      <p className="font-mono text-[18px] text-foreground leading-none">{value}</p>
      {sub && <p className="font-mono text-[9px] text-white/25 truncate mt-1">{sub}</p>}
    </div>
  </div>
);

const MiniMap = () => (
  <div className="relative w-full h-48 bg-secondary/40 border border-border overflow-hidden flex items-center justify-center">
    <svg viewBox="0 0 800 400" className="w-full h-full opacity-20 absolute inset-0">
      <rect width="800" height="400" fill="transparent" />
      <path d="M50,80 Q120,60 180,90 L200,150 Q160,180 100,160 Z" fill="#C6A355" />
      <path d="M220,70 Q320,50 420,80 L440,200 Q380,230 280,210 Q200,190 210,130 Z" fill="#C6A355" />
      <path d="M460,60 Q560,40 640,80 L660,180 Q600,210 520,190 Q460,170 450,120 Z" fill="#C6A355" />
      <path d="M240,220 Q300,210 340,240 L350,310 Q310,330 270,310 Z" fill="#C6A355" />
      <path d="M560,200 Q620,190 660,220 L670,280 Q630,300 590,280 Z" fill="#C6A355" />
    </svg>
    {[
      { x: '62%', y: '30%', label: 'Tokyo' },
      { x: '60%', y: '35%', label: 'Osaka' },
      { x: '58%', y: '60%', label: 'Bangkok' },
      { x: '47%', y: '45%', label: 'Seoul' },
    ].map(({ x, y, label }) => (
      <div key={label} className="absolute flex flex-col items-center" style={{ left: x, top: y }}>
        <div className="w-2 h-2 bg-primary shadow-[0_0_8px_#C6A355] animate-pulse" />
        <span className="font-mono text-[8px] text-primary/80 mt-0.5 whitespace-nowrap">{label}</span>
      </div>
    ))}
    <p className="font-mono text-[9px] text-white/20 tracking-[0.3em] z-10">VISITOR MAP</p>
  </div>
);

// ─── Main ──────────────────────────────────────────────────────────────────
interface AdminOverviewProps {
  onNavigateToOrders?: (orderId?: string) => void;
}

const AdminOverview = ({ onNavigateToOrders }: AdminOverviewProps) => {
  const products = useProductStore((s) => s.products);
  const orders = useAppStore((s) => s.orders);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [salesView, setSalesView] = useState<'daily' | 'monthly'>('daily');
  const [salesOffset, setSalesOffset] = useState(0);
  const [filterDate, setFilterDate] = useState<string>('');
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [searchQueries, setSearchQueries] = useState<{ query: string; searched_at: string }[]>([]);

  useEffect(() => {
    supabase.from('product_views').select('product_id').then(({ data }) => {
      if (!data) return;
      const counts: Record<string, number> = {};
      data.forEach(({ product_id }) => { counts[product_id] = (counts[product_id] ?? 0) + 1; });
      setViewCounts(counts);
    });
    supabase.from('search_queries').select('query, searched_at')
      .order('searched_at', { ascending: false }).limit(100)
      .then(({ data }) => { if (data) setSearchQueries(data); });
  }, []);

  const filteredOrders = useMemo(() => {
    if (!filterDate) return [];
    return orders.filter((o) => {
      const od = new Date(o.createdAt);
      const target = new Date(filterDate);
      return od.getFullYear() === target.getFullYear() &&
             od.getMonth() === target.getMonth() &&
             od.getDate() === target.getDate();
    });
  }, [orders, filterDate]);

  const enriched = useMemo(() =>
    products.map((p) => ({ ...p, views: viewCounts[p.id] ?? 0 })).sort((a, b) => b.views - a.views),
    [products, viewCounts]
  );
  const totalViews = useMemo(() => enriched.reduce((s, p) => s + p.views, 0), [enriched]);

  const topSearches = useMemo(() => {
    const map: Record<string, number> = {};
    searchQueries.forEach(({ query }) => {
      const q = query.toLowerCase().trim();
      map[q] = (map[q] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [searchQueries]);

  const salesData = useMemo(() => {
    const now = new Date();
    if (salesView === 'daily') {
      return Array.from({ length: 7 }, (_, i) => {
        const target = new Date(now);
        target.setDate(now.getDate() - (6 - i) - salesOffset);
        const label = target.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        const dayOrders = orders.filter((o) => {
          const od = new Date(o.createdAt);
          return od.getFullYear() === target.getFullYear() &&
                 od.getMonth() === target.getMonth() &&
                 od.getDate() === target.getDate();
        });
        return { label, revenue: dayOrders.reduce((s, o) => s + o.total, 0), count: dayOrders.length };
      });
    } else {
      return Array.from({ length: 6 }, (_, i) => {
        const target = new Date(now.getFullYear(), now.getMonth() - (5 - i) - salesOffset, 1);
        const label = target.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        const mOrders = orders.filter((o) => {
          const od = new Date(o.createdAt);
          return od.getFullYear() === target.getFullYear() && od.getMonth() === target.getMonth();
        });
        return { label, revenue: mOrders.reduce((s, o) => s + o.total, 0), count: mOrders.length };
      });
    }
  }, [orders, salesView, salesOffset]);

  const salesTotal = salesData.reduce((s, d) => s + d.revenue, 0);
  const salesCount = salesData.reduce((s, d) => s + d.count, 0);
  const maxRevenue = Math.max(...salesData.map((d) => d.revenue), 1);

  const exportCSV = () => {
    const blob = new Blob(
      ['Period,Orders,Revenue\n' + salesData.map((d) => `${d.label},${d.count},${d.revenue}`).join('\n')],
      { type: 'text/csv' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `owarin-sales-${salesView}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={Package} label="Total Products" value={products.length.toLocaleString()} />
        <StatCard icon={TrendingUp} label="Total Orders" value={orders.length.toLocaleString()} sub="All time" />
        <StatCard icon={TrendingUp} label="Total Searches" value={searchQueries.length}
          sub={topSearches[0] ? `Top: "${topSearches[0][0]}"` : 'No searches yet'} />
      </div>

      {/* ── Sales Report ── */}
      <div className="bg-card border border-border overflow-hidden">

        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <SectionLabel label="Sales Report" />
          <div className="flex items-center gap-2">
            <div className="inline-flex border border-border text-[10px]">
              <button onClick={() => { setSalesView('daily'); setSalesOffset(0); }}
                className={`px-3 py-1 font-mono tracking-[0.18em] transition-colors ${salesView === 'daily' ? 'bg-primary text-primary-foreground' : 'text-white/30 hover:text-white/60'}`}>
                DAILY
              </button>
              <button onClick={() => { setSalesView('monthly'); setSalesOffset(0); }}
                className={`px-3 py-1 font-mono tracking-[0.18em] border-l border-border transition-colors ${salesView === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-white/30 hover:text-white/60'}`}>
                MONTHLY
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setSalesOffset((p) => p + 1)}
                className="w-6 h-6 flex items-center justify-center border border-border font-mono text-xs text-white/30 hover:text-primary hover:border-primary transition-colors">‹</button>
              <button onClick={() => setSalesOffset((p) => Math.max(0, p - 1))} disabled={salesOffset === 0}
                className="w-6 h-6 flex items-center justify-center border border-border font-mono text-xs text-white/30 hover:text-primary hover:border-primary transition-colors disabled:opacity-30">›</button>
            </div>
            <button onClick={exportCSV}
              className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/30 hover:text-[#C4A35B] border border-border hover:border-[#C4A35B]/40 px-2.5 py-1 transition-colors flex items-center gap-1">
              <ChevronRight size={10} className="rotate-90" /> Export CSV
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="flex gap-6 mb-4">
            <div>
              <p className="font-mono text-[9px] tracking-[0.25em] text-white/30 uppercase mb-1">Total Revenue</p>
              <p className="font-mono text-[20px] text-[#C4A35B] leading-none">
                {salesTotal.toLocaleString()} <span className="text-[10px] text-white/20">THB</span>
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] tracking-[0.25em] text-white/30 uppercase mb-1">Orders</p>
              <p className="font-mono text-[20px] text-foreground leading-none">{salesCount}</p>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-24">
            {salesData.map((d) => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="w-full transition-all duration-300 bg-primary/20 group-hover:bg-primary/50 relative"
                  style={{ height: `${(d.revenue / maxRevenue) * 80}px`, minHeight: d.revenue > 0 ? '4px' : '0' }}>
                  {d.revenue > 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-card border border-border px-1.5 py-0.5 font-mono text-[9px] text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {d.revenue.toLocaleString()} THB
                    </div>
                  )}
                </div>
                <p className="font-mono text-[8px] text-white/25 whitespace-nowrap">{d.label}</p>
                {d.count > 0 && <p className="font-mono text-[8px] text-primary">{d.count}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-3 flex-wrap bg-secondary/20">
          <SectionLabel label="Daily Order Lookup" />
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-primary flex-shrink-0" />
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
              className="font-mono text-[11px] bg-secondary border border-border px-2 py-1 text-foreground focus:outline-none focus:border-primary transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          {[
            { label: 'Orders', value: String(filteredOrders.length), gold: false },
            { label: 'Revenue', value: `${filteredOrders.reduce((s, o) => s + o.total, 0).toLocaleString()} THB`, gold: true },
            { label: 'Items Sold', value: String(filteredOrders.reduce((s, o) => s + o.items.length, 0)), gold: false },
          ].map(({ label, value, gold }) => (
            <div key={label} className="px-4 py-3">
              <p className="font-mono text-[9px] tracking-[0.25em] text-white/30 uppercase mb-1">{label}</p>
              <p className={`font-mono text-[18px] leading-none ${gold ? 'text-[#C4A35B]' : 'text-foreground'}`}>{value}</p>
            </div>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-white/20">
              {filterDate ? `No orders · ${filterDate}` : 'Select a date'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-secondary/40 border-b border-border">
                <tr>
                  {[
                    ['Order ID', 'text-left'], ['Customer', 'text-left'], ['Items', 'text-left'],
                    ['Total', 'text-right'], ['Status', 'text-center'], ['Time', 'text-right'],
                  ].map(([h, align]) => (
                    <th key={h} className={`px-4 py-2 font-mono text-[9px] tracking-[0.25em] uppercase text-white/30 ${align}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-t border-border hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => onNavigateToOrders?.(order.id)}
                        className="font-mono text-[10px] text-primary border border-primary/20 px-1.5 py-0.5 hover:bg-primary/10 hover:border-primary/40 transition-colors cursor-pointer">
                        {order.id}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-light text-foreground">{order.customer.name}</p>
                      <p className="font-mono text-[9px] text-white/30 mt-0.5">{order.customer.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 max-w-[200px]">
                        {order.items.map((item, i) => (
                          <p key={i} className="text-[11px] font-light text-foreground truncate">
                            <span className="text-white/25 mr-1">·</span>{item.title}
                            <span className="text-white/25 ml-1">({item.platform})</span>
                          </p>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[#C4A35B]">
                      {order.total.toLocaleString()} <span className="text-[9px] text-white/20">THB</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-mono text-[9px] tracking-[0.15em] px-2 py-0.5 border ${
                        order.status === 'Shipped' ? 'text-green-400 border-green-500/30' :
                        order.status === 'Paid' ? 'text-[#C6A355] border-[#C6A355]/30' :
                        'text-white/30 border-white/10'
                      }`}>{order.status.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[9px] text-white/30 tabular-nums">
                      {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Performance + Searches ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <SectionLabel label="Product Performance" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-secondary/40 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2 font-mono text-[9px] tracking-[0.25em] uppercase text-white/30">Item</th>
                  <th className="text-right px-4 py-2 font-mono text-[9px] tracking-[0.25em] uppercase text-white/30">Views</th>
                  <th className="text-right px-4 py-2 font-mono text-[9px] tracking-[0.25em] uppercase text-white/30">Share</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {enriched.map((p) => (
                  <tr key={p.id} onClick={() => setSelectedProduct(p)}
                    className="border-t border-border hover:bg-secondary/30 cursor-pointer transition-colors">
                    <td className="px-4 py-2.5 flex items-center gap-2.5">
                      <img src={p.frontImage} alt={p.title}
                        className="w-8 h-11 object-cover border border-border flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[12px] font-light text-foreground truncate max-w-[180px]">
                          {p.title.replace(/^「|」$/g, '')}
                        </p>
                        <p className="font-mono text-[9px] text-white/30">{p.platform}</p>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-foreground tabular-nums">
                      {p.views > 0 ? p.views.toLocaleString() : <span className="text-white/25">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-white/30 tabular-nums">
                      {totalViews > 0 ? `${((p.views / totalViews) * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-2 py-2.5 text-white/25"><ChevronRight size={12} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card border border-border overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <SectionLabel label="Top Searches" />
          </div>
          {topSearches.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-white/20">No searches yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {topSearches.map(([query, count], i) => (
                <div key={query} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[9px] text-white/25 w-4 text-right flex-shrink-0">{i + 1}</span>
                    <span className="text-[12px] font-light text-foreground truncate">{query}</span>
                  </div>
                  <span className="font-mono text-[10px] text-primary tabular-nums flex-shrink-0 ml-3">{count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Product Detail Modal ── */}
      {selectedProduct && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setSelectedProduct(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <img src={selectedProduct.frontImage} alt={selectedProduct.title}
                  className="w-10 h-14 object-cover border border-border flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-light text-foreground truncate">
                    {selectedProduct.title.replace(/^「|」$/g, '')}
                  </p>
                  <p className="font-mono text-[9px] text-white/30 mt-0.5">
                    {selectedProduct.platform} · {(viewCounts[selectedProduct.id] ?? 0).toLocaleString()} views
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-white/30 hover:text-foreground flex-shrink-0 ml-2">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-white/30">View Statistics</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <span className="font-mono text-[10px] tracking-[0.15em] text-white/40 uppercase">Total Views</span>
                  <span className="font-mono text-[20px] text-[#C4A35B] leading-none">
                    {(viewCounts[selectedProduct.id] ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] tracking-[0.15em] text-white/40 uppercase">Share of All</span>
                  <span className="font-mono text-[16px] text-foreground leading-none">
                    {totalViews > 0
                      ? `${(((viewCounts[selectedProduct.id] ?? 0) / totalViews) * 100).toFixed(1)}%`
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminOverview;

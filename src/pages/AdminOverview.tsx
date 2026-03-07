import { useMemo, useState } from 'react';
import { useProductStore, Product } from '@/stores/useProductStore';
import { useAppStore } from '@/stores/useAppStore';
import { TrendingUp, MapPin, Package, ChevronRight, X, Calendar } from 'lucide-react';

// ─── Mock analytics data (replace with real tracking backend later) ────────
// Structure: productId → { views, dailyChange, locations: [{city, country, count}] }
const MOCK_ANALYTICS: Record<string, {
  views: number;
  dailyChange: number;
  locations: { city: string; country: string; count: number }[];
}> = {
  'OWA-001': { views: 342, dailyChange: 12.4, locations: [{ city: 'Bangkok', country: 'TH', count: 120 }, { city: 'Tokyo', country: 'JP', count: 89 }, { city: 'Osaka', country: 'JP', count: 44 }, { city: 'Samut Prakan', country: 'TH', count: 30 }] },
  'OWA-002': { views: 218, dailyChange: -3.1, locations: [{ city: 'Tokyo', country: 'JP', count: 98 }, { city: 'Bangkok', country: 'TH', count: 67 }, { city: 'Chiang Mai', country: 'TH', count: 22 }] },
  'OWA-003': { views: 189, dailyChange: 8.7,  locations: [{ city: 'Osaka', country: 'JP', count: 75 }, { city: 'Bangkok', country: 'TH', count: 60 }, { city: 'Seoul', country: 'KR', count: 34 }] },
  'OWA-004': { views: 154, dailyChange: 2.2,  locations: [{ city: 'Bangkok', country: 'TH', count: 88 }, { city: 'Tokyo', country: 'JP', count: 40 }] },
  'OWA-005': { views: 97,  dailyChange: -8.5, locations: [{ city: 'Tokyo', country: 'JP', count: 50 }, { city: 'Osaka', country: 'JP', count: 30 }] },
};

function getAnalytics(id: string) {
  return MOCK_ANALYTICS[id] ?? { views: Math.floor(Math.random() * 80 + 10), dailyChange: 0, locations: [] };
}

// ─── Sub-components ────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) => (
  <div className="bg-card border border-border rounded p-4 flex items-start gap-3">
    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
      <Icon size={16} className="text-primary" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase mb-0.5">{label}</p>
      <p className="text-xl font-display text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
    </div>
  </div>
);

const MiniMap = () => (
  <div className="relative w-full h-48 bg-secondary/40 border border-border rounded overflow-hidden flex items-center justify-center">
    {/* World map SVG placeholder with dot markers */}
    <svg viewBox="0 0 800 400" className="w-full h-full opacity-20 absolute inset-0">
      <rect width="800" height="400" fill="transparent" />
      {/* Simplified continent outlines */}
      <path d="M50,80 Q120,60 180,90 L200,150 Q160,180 100,160 Z" fill="#C6A355" />
      <path d="M220,70 Q320,50 420,80 L440,200 Q380,230 280,210 Q200,190 210,130 Z" fill="#C6A355" />
      <path d="M460,60 Q560,40 640,80 L660,180 Q600,210 520,190 Q460,170 450,120 Z" fill="#C6A355" />
      <path d="M240,220 Q300,210 340,240 L350,310 Q310,330 270,310 Z" fill="#C6A355" />
      <path d="M560,200 Q620,190 660,220 L670,280 Q630,300 590,280 Z" fill="#C6A355" />
    </svg>
    {/* Visitor dot markers */}
    {[
      { x: '62%', y: '30%', label: 'Tokyo' },
      { x: '60%', y: '35%', label: 'Osaka' },
      { x: '58%', y: '60%', label: 'Bangkok' },
      { x: '47%', y: '45%', label: 'Seoul' },
    ].map(({ x, y, label }) => (
      <div key={label} className="absolute flex flex-col items-center" style={{ left: x, top: y }}>
        <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_#C6A355] animate-pulse" />
        <span className="text-[9px] text-primary/80 mt-0.5 whitespace-nowrap">{label}</span>
      </div>
    ))}
    <p className="text-[10px] text-muted-foreground tracking-widest z-10">VISITOR MAP</p>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────

interface AdminOverviewProps {
  onNavigateToOrders?: (orderId?: string) => void;
}

const AdminOverview = ({ onNavigateToOrders }: AdminOverviewProps) => {
  const products = useProductStore((s) => s.products);
  const orders = useAppStore((s) => s.orders);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [salesView, setSalesView] = useState<'daily' | 'monthly'>('daily');
  const [salesOffset, setSalesOffset] = useState(0); // days or months back
  const [filterDate, setFilterDate] = useState<string>('');

  // Filter orders by selected date for Daily Order Lookup
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

  // Enrich products with analytics
  const enriched = useMemo(() =>
    products.map((p) => ({ ...p, analytics: getAnalytics(p.id) }))
      .sort((a, b) => b.analytics.views - a.analytics.views),
    [products]
  );

  const totalViews = useMemo(() => enriched.reduce((s, p) => s + p.analytics.views, 0), [enriched]);
  const topProduct = enriched[0];

  // Aggregate all locations across all products
  const regionMap = useMemo(() => {
    const map: Record<string, { city: string; country: string; count: number }> = {};
    enriched.forEach(({ analytics }) => {
      analytics.locations.forEach(({ city, country, count }) => {
        const key = `${city}-${country}`;
        if (!map[key]) map[key] = { city, country, count: 0 };
        map[key].count += count;
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [enriched]);

  const activeRegions = regionMap.length;
  const selectedAnalytics = selectedProduct ? getAnalytics(selectedProduct.id) : null;

  // ── Sales data derived from real orders ─────────────────────────────────
  const salesData = useMemo(() => {
    const now = new Date();
    if (salesView === 'daily') {
      // Show 7 days ending at (today - offset)
      const days: { label: string; revenue: number; count: number }[] = [];
      for (let d = 6; d >= 0; d--) {
        const target = new Date(now);
        target.setDate(now.getDate() - d - salesOffset);
        const label = target.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        const dayOrders = orders.filter((o) => {
          const od = new Date(o.createdAt);
          return od.getFullYear() === target.getFullYear() &&
                 od.getMonth() === target.getMonth() &&
                 od.getDate() === target.getDate();
        });
        days.push({ label, revenue: dayOrders.reduce((s, o) => s + o.total, 0), count: dayOrders.length });
      }
      return days;
    } else {
      // Show 6 months ending at (this month - offset)
      const months: { label: string; revenue: number; count: number }[] = [];
      for (let m = 5; m >= 0; m--) {
        const target = new Date(now.getFullYear(), now.getMonth() - m - salesOffset, 1);
        const label = target.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        const mOrders = orders.filter((o) => {
          const od = new Date(o.createdAt);
          return od.getFullYear() === target.getFullYear() && od.getMonth() === target.getMonth();
        });
        months.push({ label, revenue: mOrders.reduce((s, o) => s + o.total, 0), count: mOrders.length });
      }
      return months;
    }
  }, [orders, salesView, salesOffset]);

  const salesTotal = salesData.reduce((s, d) => s + d.revenue, 0);
  const salesCount = salesData.reduce((s, d) => s + d.count, 0);
  const maxRevenue = Math.max(...salesData.map((d) => d.revenue), 1);

  const exportCSV = () => {
    const header = 'Period,Orders,Revenue\n';
    const rows = salesData.map((d) => `${d.label},${d.count},${d.revenue}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `owarin-sales-${salesView}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={Package} label="Total Products" value={products.length.toLocaleString()} />
        <StatCard icon={TrendingUp} label="Total Orders" value={orders.length.toLocaleString()} sub="All time" />
        <StatCard icon={MapPin} label="Active Regions" value="—" sub="Analytics coming soon" />
      </div>

      {/* ── Sales Report + Daily Order Lookup (combined card) ──────── */}
      <div className="bg-card border border-border rounded overflow-hidden">
        {/* Header row */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">Sales Report</h3>
          <div className="flex items-center gap-2">
            {/* Daily / Monthly toggle */}
            <div className="inline-flex rounded-full border border-border bg-secondary/60 text-[10px]">
              <button onClick={() => { setSalesView('daily'); setSalesOffset(0); }} className={`px-3 py-1 rounded-full tracking-wider transition-colors ${salesView === 'daily' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>DAILY</button>
              <button onClick={() => { setSalesView('monthly'); setSalesOffset(0); }} className={`px-3 py-1 rounded-full tracking-wider transition-colors ${salesView === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>MONTHLY</button>
            </div>
            {/* Back / Forward */}
            <div className="flex items-center gap-1">
              <button onClick={() => setSalesOffset((p) => p + 1)} className="w-6 h-6 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors text-xs">‹</button>
              <button onClick={() => setSalesOffset((p) => Math.max(0, p - 1))} disabled={salesOffset === 0} className="w-6 h-6 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors text-xs disabled:opacity-30">›</button>
            </div>
            {/* Export */}
            <button onClick={exportCSV} className="text-[10px] tracking-wider text-muted-foreground hover:text-primary border border-border rounded px-2.5 py-1 transition-colors flex items-center gap-1">
              <ChevronRight size={10} className="rotate-90" /> EXPORT CSV
            </button>
          </div>
        </div>

        {/* Bar chart */}
        <div className="p-4">
          <div className="flex gap-6 mb-4">
            <div>
              <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Total Revenue</p>
              <p className="text-lg font-display text-primary">{salesTotal.toLocaleString()} THB</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Orders</p>
              <p className="text-lg font-display text-foreground">{salesCount}</p>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-24">
            {salesData.map((d) => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="w-full rounded-t transition-all duration-300 bg-primary/20 group-hover:bg-primary/40 relative" style={{ height: `${(d.revenue / maxRevenue) * 80}px`, minHeight: d.revenue > 0 ? '4px' : '0' }}>
                  {d.revenue > 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-card border border-border rounded px-1.5 py-0.5 text-[9px] text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {d.revenue.toLocaleString()} THB
                    </div>
                  )}
                </div>
                <p className="text-[8px] text-muted-foreground whitespace-nowrap">{d.label}</p>
                {d.count > 0 && <p className="text-[8px] text-primary">{d.count}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Divider with date picker label */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-3 flex-wrap bg-secondary/20">
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">Daily Order Lookup</p>
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-primary flex-shrink-0" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-[11px] bg-secondary border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          <div className="px-4 py-3">
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase mb-1">Orders</p>
            <p className="text-xl font-display text-foreground">{filteredOrders.length}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase mb-1">Revenue</p>
            <p className="text-xl font-display text-primary">
              {filteredOrders.reduce((s, o) => s + o.total, 0).toLocaleString()} THB
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase mb-1">Items Sold</p>
            <p className="text-xl font-display text-foreground">
              {filteredOrders.reduce((s, o) => s + o.items.length, 0)}
            </p>
          </div>
        </div>

        {/* Order table */}
        {filteredOrders.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">No orders found for {filterDate}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium tracking-wider">Order ID</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium tracking-wider">Customer</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium tracking-wider">Items</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium tracking-wider">Total</th>
                  <th className="text-center px-4 py-2 text-muted-foreground font-medium tracking-wider">Status</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-t border-border hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onNavigateToOrders?.(order.id)}
                        className="font-mono text-primary text-[10px] bg-primary/5 border border-primary/20 rounded px-1.5 py-0.5 hover:bg-primary/15 hover:border-primary/40 transition-colors cursor-pointer"
                      >
                        {order.id}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground font-medium">{order.customer.name}</p>
                      <p className="text-muted-foreground">{order.customer.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 max-w-[200px]">
                        {order.items.map((item, i) => (
                          <p key={i} className="text-foreground truncate">
                            <span className="text-muted-foreground mr-1">·</span>
                            {item.title}
                            <span className="text-muted-foreground ml-1">({item.platform})</span>
                          </p>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground font-medium">
                      {order.total.toLocaleString()} THB
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border tracking-wider ${
                        order.status === 'Shipped'
                          ? 'text-green-400 border-green-500/30 bg-green-500/10'
                          : order.status === 'Paid'
                          ? 'text-[#C6A355] border-[#C6A355]/30 bg-[#C6A355]/10'
                          : 'text-muted-foreground border-border bg-secondary/50'
                      }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                      {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Product Performance */}
        <div className="lg:col-span-2 bg-card border border-border rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">Product Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium tracking-wider">Item</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium tracking-wider">Views</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium tracking-wider">Daily %</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {enriched.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className="border-t border-border hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 flex items-center gap-2.5">
                      <img
                        src={p.frontImage}
                        alt={p.title}
                        className="w-8 h-11 object-cover rounded border border-border flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-foreground truncate max-w-[180px]">
                          {p.title.startsWith('「') ? p.title : `「${p.title}」`}
                        </p>
                        <p className="text-muted-foreground">{p.platform}</p>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums text-[11px]">
                      — coming soon
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums text-[11px]">
                      —
                    </td>
                    <td className="px-2 py-2.5 text-muted-foreground">
                      <ChevronRight size={12} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Geography — Coming Soon */}
        <div className="bg-card border border-border rounded overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">Visitor Geography</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2">
            <MapPin size={28} className="text-muted-foreground/30" />
            <p className="text-[11px] text-muted-foreground tracking-[0.15em] uppercase">Coming Soon</p>
            <p className="text-[10px] text-muted-foreground/50">Visitor analytics will appear here</p>
          </div>
        </div>
      </div>

      {/* ── 4. Granular Insight Modal ─────────────────────────────────── */}
      {selectedProduct && selectedAnalytics && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setSelectedProduct(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-lg shadow-2xl animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={selectedProduct.frontImage}
                  alt={selectedProduct.title}
                  className="w-10 h-14 object-cover rounded border border-border flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">
                    {selectedProduct.title.startsWith('「') ? selectedProduct.title : `「${selectedProduct.title}」`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{selectedProduct.platform} · {selectedAnalytics.views.toLocaleString()} views</p>
                </div>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0 ml-2">
                <X size={16} />
              </button>
            </div>

            {/* Location list */}
            <div className="px-5 py-4">
              <p className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase mb-3">Visitor Locations</p>
              {selectedAnalytics.locations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No location data available.</p>
              ) : (
                <div className="space-y-2">
                  {selectedAnalytics.locations.map(({ city, country, count }, i) => {
                    const pct = selectedAnalytics.views > 0
                      ? ((count / selectedAnalytics.views) * 100).toFixed(1)
                      : '0';
                    return (
                      <div key={`${city}-${i}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[11px]">
                          <MapPin size={11} className="text-primary flex-shrink-0" />
                          <span className="text-foreground">Visitor {i + 1}:</span>
                          <span className="text-muted-foreground">{city}, {country}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-primary tabular-nums w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary footer */}
            <div className="px-5 py-3 border-t border-border bg-secondary/20 rounded-b-lg">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Daily change</span>
                <span className={selectedAnalytics.dailyChange >= 0 ? 'text-green-500' : 'text-destructive'}>
                  {selectedAnalytics.dailyChange >= 0 ? '+' : ''}{selectedAnalytics.dailyChange.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminOverview;
